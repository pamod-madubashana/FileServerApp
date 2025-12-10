// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

use tauri::Emitter;
use tokio::io::AsyncWriteExt;
use futures::StreamExt;
use dirs;
use std::path::Path;
use tauri_plugin_opener::OpenerExt;

// Logging commands that can be called from the frontend
#[tauri::command]
fn log_debug(message: &str) {
    log::debug!("{}", message);
}

#[tauri::command]
fn log_info(message: &str) {
    log::info!("{}", message);
}

#[tauri::command]
fn log_warn(message: &str) {
    log::warn!("{}", message);
}

#[tauri::command]
fn log_error(message: &str) {
    log::error!("{}", message);
}

// Command to open a file's folder in the system file explorer
#[tauri::command]
fn open_file_in_folder(path: String, app: tauri::AppHandle) -> Result<(), String> {
    // Use reveal_item_in_dir to open the folder containing the file
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// We'll need to add a way to cancel downloads in the Rust code
// For now, let's modify the download function to be more responsive to cancellation
// by checking for cancellation more frequently

async fn download_file(url: &str, save_path: &str, auth_token: Option<String>, app_handle: tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting download from {} to {}", url, save_path);
    
    // Parse URL to check if we need to add auth token
    let parsed_url = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    let final_url = url.to_string();
    let mut headers = reqwest::header::HeaderMap::new();
    
    // Add auth token to headers if provided, regardless of hostname
    if let Some(token) = auth_token {
        log::info!("Adding auth token from parameters");
        headers.insert("X-Auth-Token", token.parse().map_err(|_| "Invalid auth token")?);
    }
    // Fallback to query parameter if no auth_token parameter provided
    else if let Some(auth_token) = parsed_url.query_pairs().find(|(key, _)| key == "auth_token").map(|(_, value)| value.to_string()) {
        log::info!("Adding auth token from URL query parameter");
        headers.insert("X-Auth-Token", auth_token.parse().map_err(|_| "Invalid auth token")?);
    }
    
    // Create HTTP client with headers
    let client = reqwest::Client::builder()
        .default_headers(headers.clone())
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Send HEAD request to get file size first
    let head_response = client.head(&final_url).headers(headers.clone()).send().await
        .map_err(|e| format!("Failed to send HEAD request: {}", e))?;
    
    // Check if HEAD request was successful
    if !head_response.status().is_success() {
        log::warn!("HEAD request failed with status: {}, proceeding with GET request", head_response.status());
    }
    
    // Get total size if available from HEAD request
    let mut total_size = head_response.content_length().unwrap_or(0);
    log::info!("File size from HEAD request: {} bytes", total_size);
    
    // If we didn't get size from HEAD, send GET request to get it
    let (response, needs_get_request) = if total_size == 0 {
        log::info!("No content length from HEAD, sending GET request to determine size");
        let get_response = client.get(&final_url).headers(headers.clone()).send().await
            .map_err(|e| format!("Failed to send GET request: {}", e))?;
            
        if !get_response.status().is_success() {
            return Err(format!("HTTP request failed with status: {}", get_response.status()));
        }
        
        total_size = get_response.content_length().unwrap_or(0);
        log::info!("File size from GET request: {} bytes", total_size);
        (get_response, false) // We already have the response
    } else {
        // Send GET request for actual download
        let get_response = client.get(&final_url).headers(headers.clone()).send().await
            .map_err(|e| format!("Failed to send GET request: {}", e))?;
            
        if !get_response.status().is_success() {
            return Err(format!("HTTP request failed with status: {}", get_response.status()));
        }
        (get_response, true) // We need to use this response
    };
    
    // If we didn't already get the response from the GET request above, send another GET request
    let response = if needs_get_request {
        response
    } else {
        // Send GET request for actual download
        client.get(&final_url).headers(headers.clone()).send().await
            .map_err(|e| format!("Failed to send GET request: {}", e))?
    };
    
    // Get total size if available (in case it changed)
    total_size = response.content_length().unwrap_or(total_size);
    log::info!("Final file size: {} bytes", total_size);
    
    // Handle relative paths by resolving them against the user's download directory
    let resolved_path = if Path::new(&save_path).is_absolute() {
        save_path.to_string()
    } else {
        // For relative paths, resolve against the user's download directory
        let download_dir = dirs::download_dir().ok_or("Could not determine download directory")?;
        let full_path = download_dir.join(save_path);
        // Create parent directories if they don't exist
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| format!("Failed to create directories: {}", e))?;
        }
        full_path.to_string_lossy().to_string()
    };
    
    log::info!("Resolved download path: {}", resolved_path);
    
    // Create file to save to
    let mut file = tokio::fs::File::create(&resolved_path).await.map_err(|e| format!("Failed to create file: {}", e))?;
    
    // Stream the response and write to file
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_progress: u64 = 0;
    
    // Track timing for speed calculation
    let start_time = std::time::Instant::now();
    let mut last_update_time = start_time;
    let mut last_downloaded = 0u64;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk).await.map_err(|e| format!("Failed to write to file: {}", e))?;
        downloaded += chunk.len() as u64;
        
        // Calculate speed and ETA periodically (every 500ms)
        let now = std::time::Instant::now();
        if now.duration_since(last_update_time).as_millis() >= 500 {
            let time_elapsed = now.duration_since(last_update_time).as_secs_f64();
            let bytes_since_last = downloaded - last_downloaded;
            
            if time_elapsed > 0.0 {
                let speed_bps = (bytes_since_last as f64 / time_elapsed) as u64; // bytes per second
                
                // Calculate ETA if we know total size
                let eta_seconds = if total_size > 0 && speed_bps > 0 {
                    let remaining = total_size - downloaded;
                    Some(remaining / speed_bps)
                } else {
                    None
                };
                
                // Emit detailed progress event with speed and ETA
                let progress_data = serde_json::json!({
                    "percentage": if total_size > 0 { (downloaded as f64 / total_size as f64 * 100.0) as u64 } else { 0 },
                    "downloaded": downloaded,
                    "total": total_size,
                    "speed": speed_bps,
                    "eta": eta_seconds
                });
                
                app_handle.emit("download_progress_detailed", progress_data)
                    .map_err(|e| format!("Failed to emit detailed progress: {}", e))?;
            }
            
            last_update_time = now;
            last_downloaded = downloaded;
        }
        
        // Emit regular progress event more frequently for better UX
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u64;
            
            // Only emit progress updates at 1% intervals to reduce event overhead
            if progress >= last_progress + 1 || progress == 100 {
                app_handle.emit("download_progress", progress).map_err(|e| format!("Failed to emit progress: {}", e))?;
                last_progress = progress;
            }
        }
    }
    
    log::info!("Download completed successfully");
    Ok(())
}

fn main() {
  // Set default log level if not already set
  if std::env::var("RUST_LOG").is_err() {
    std::env::set_var("RUST_LOG", "debug");
  }
  
  env_logger::init();
  
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      log_debug,
      log_info,
      log_warn,
      log_error,
      download_file,
      open_file_in_folder
    ])
    .setup(|_app| {
      // Log startup messages after logger is initialized
      log::info!("Starting Telegram File Server application");
      log::info!("Current working directory: {:?}", std::env::current_dir());
      
      // Log environment variables that might be relevant
      if let Ok(rust_log) = std::env::var("RUST_LOG") {
        log::info!("RUST_LOG environment variable: {}", rust_log);
      }
      
      // Create default download directory if it doesn't exist
      if let Some(home_dir) = dirs::home_dir() {
        let default_download_dir = home_dir.join("Downloads").join("fileServer");
        if !default_download_dir.exists() {
          match std::fs::create_dir_all(&default_download_dir) {
            Ok(_) => log::info!("Created default download directory: {:?}", default_download_dir),
            Err(e) => log::error!("Failed to create default download directory: {}", e)
          }
        } else {
          log::info!("Default download directory already exists: {:?}", default_download_dir);
        }
      }
      
      log::info!("Application setup completed successfully");
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
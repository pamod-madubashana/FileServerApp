// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

use tauri::Emitter;
use tokio::io::AsyncWriteExt;
use futures::StreamExt;
use dirs;

// Remove the unused imports
// use tauri::Manager;
// use std::path::Path;

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

// Download command that downloads a file from a URL and saves it to a specified path
#[tauri::command]
async fn download_file(url: &str, save_path: &str, app_handle: tauri::AppHandle) -> Result<(), String> {
    log::info!("Starting download from {} to {}", url, save_path);
    
    // Create HTTP client
    let client = reqwest::Client::new();
    
    // Send GET request
    let response = client.get(url).send().await.map_err(|e| format!("Failed to send request: {}", e))?;
    
    // Check if request was successful
    if !response.status().is_success() {
        return Err(format!("HTTP request failed with status: {}", response.status()));
    }
    
    // Get total size if available
    let total_size = response.content_length().unwrap_or(0);
    log::info!("Total file size: {} bytes", total_size);
    
    // Handle relative paths by resolving them against the user's download directory
    let resolved_path = if std::path::Path::new(&save_path).is_absolute() {
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
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk).await.map_err(|e| format!("Failed to write to file: {}", e))?;
        downloaded += chunk.len() as u64;
        
        // Emit progress event more frequently for better UX
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
    .invoke_handler(tauri::generate_handler![
      log_debug,
      log_info,
      log_warn,
      log_error,
      download_file
    ])
    .setup(|_app| {
      // Log startup messages after logger is initialized
      log::info!("Starting Telegram File Server application");
      log::info!("Current working directory: {:?}", std::env::current_dir());
      
      // Log environment variables that might be relevant
      if let Ok(rust_log) = std::env::var("RUST_LOG") {
        log::info!("RUST_LOG environment variable: {}", rust_log);
      }
      
      log::info!("Application setup completed successfully");
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
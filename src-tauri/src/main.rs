// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

use tauri::Emitter;
use tokio::io::AsyncWriteExt;
use futures::StreamExt;

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
    
    // Create file to save to
    let mut file = tokio::fs::File::create(&save_path).await.map_err(|e| format!("Failed to create file: {}", e))?;
    
    // Stream the response and write to file
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk).await.map_err(|e| format!("Failed to write to file: {}", e))?;
        downloaded += chunk.len() as u64;
        
        // Emit progress event
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u64;
            app_handle.emit("download_progress", progress).map_err(|e| format!("Failed to emit progress: {}", e))?;
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
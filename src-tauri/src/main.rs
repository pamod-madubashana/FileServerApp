// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

use tauri_plugin_log::{Target, TargetKind};

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

// Function to test logging
#[tauri::command]
fn test_logging() {
    log::debug!("Test debug message from Tauri command");
    log::info!("Test info message from Tauri command");
    log::warn!("Test warning message from Tauri command");
    log::error!("Test error message from Tauri command");
}

fn main() {
  // Set default log level if not already set
  if std::env::var("RUST_LOG").is_err() {
    std::env::set_var("RUST_LOG", "debug");
  }
  
  // Initialize logging through Tauri log plugin 
  
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    // Initialize Tauri log plugin with console output
    .plugin(
      tauri_plugin_log::Builder::new()
        .targets([
          Target::new(TargetKind::Stdout),
          Target::new(TargetKind::Webview),
        ])
        .build()
    )
    .invoke_handler(tauri::generate_handler![
      log_debug,
      log_info,
      log_warn,
      log_error,
      test_logging
    ])
    .setup(|_app| {
      // Log startup messages after logger is initialized
      log::info!("Starting Telegram File Server application");
      log::info!("Current working directory: {:?}", std::env::current_dir());
      
      // Log environment variables that might be relevant
      if let Ok(rust_log) = std::env::var("RUST_LOG") {
        log::info!("RUST_LOG environment variable: {}", rust_log);
      }
      
      // Test logging at different levels
      log::debug!("This is a debug message from Rust");
      log::info!("This is an info message from Rust");
      log::warn!("This is a warning message from Rust");
      log::error!("This is an error message from Rust");
      
      log::info!("Application setup completed successfully");
      
      // Use the correct method for getting webview window in Tauri v2
      #[cfg(debug_assertions)]
      if let Some(window) = _app.get_webview_window("main") {
        window.open_devtools();
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
#![windows_subsystem = "console"]
use tauri_plugin_http::{HttpBuilder, Permission};



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

fn main() {
  if std::env::var("RUST_LOG").is_err() {
    std::env::set_var("RUST_LOG", "debug");
  }
  
  // Initialize logging through env_logger for simplicity
  env_logger::init();
  
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    // .plugin(tauri_plugin_http::init())
    .plugin(
          HttpBuilder::new()
              .permissions(vec![
                  Permission::new("http:default")
                      .allow(vec!["*"]) // allow all URLs, or use specific pattern
                      .deny(vec![]),
              ])
              .build()
      )
    .invoke_handler(tauri::generate_handler![
      log_debug,
      log_info,
      log_warn,
      log_error
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
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
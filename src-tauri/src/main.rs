// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

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
    // Disable file drop handler to prevent interference with web-based drag and drop
    .on_window_event(|_window, event| {
      match event {
        tauri::WindowEvent::FileDrop(_) => {
          // Do nothing - this prevents the default file drop behavior
          // which was interfering with the web-based drag and drop
        }
        _ => {}
      }
    })
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
      
      log::info!("Application setup completed successfully");
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
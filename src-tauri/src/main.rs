// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

fn main() {
  // Initialize logging through Tauri log plugin instead of manually with env_logger
  // to avoid conflicts
  
  println!("Starting Telegram File Server application");
  println!("Current working directory: {:?}", std::env::current_dir());
  
  // Print environment variables that might be relevant
  if let Ok(rust_log) = std::env::var("RUST_LOG") {
    println!("RUST_LOG environment variable: {}", rust_log);
  }
  
  // Generate context and print information about it
  println!("Generating Tauri context...");
  let context = tauri::generate_context!();
  println!("Context generated successfully");
  println!("Package name: {}", context.package_info().name);
  println!("Package version: {}", context.package_info().version);
  
  let result = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    // Initialize Tauri log plugin with default configuration
    .plugin(tauri_plugin_log::Builder::new().build())
    .invoke_handler(tauri::generate_handler![])
    .setup(|_app| {
      // Use the correct method for getting webview window in Tauri v2
      #[cfg(debug_assertions)]
      if let Some(window) = _app.get_webview_window("main") {
        window.open_devtools();
      }
      log::info!("Application setup completed successfully");
      Ok(())
    })
    .run(context);
    
  match result {
    Ok(_) => {
      log::info!("Application exited successfully");
    },
    Err(e) => {
      log::error!("Application exited with error: {}", e);
      log::error!("Error details: {:?}", e);
      std::process::exit(1);
    }
  }
}
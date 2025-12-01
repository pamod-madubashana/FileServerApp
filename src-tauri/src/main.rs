// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

fn main() {
  // Initialize logging through Tauri log plugin 
  // This needs to be done before any logging calls
  
  let result = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    // Initialize Tauri log plugin with default configuration
    // .plugin(tauri_plugin_log::Builder::new().build())
    .plugin(
      tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout), // Optional: also log to stdout
                    Target::new(TargetKind::Webview), // Essential for console.log redirection
                ])
                .build(),
    )
    .invoke_handler(tauri::generate_handler![])
    .setup(|_app| {
      // Log startup messages after logger is initialized
      log::info!("Starting Telegram File Server application");
      log::info!("Current working directory: {:?}", std::env::current_dir());
      
      // Log environment variables that might be relevant
      if let Ok(rust_log) = std::env::var("RUST_LOG") {
        log::info!("RUST_LOG environment variable: {}", rust_log);
      }
      
      // Log context information
      log::info!("Generating Tauri context...");
      let context = tauri::generate_context!();
      log::info!("Context generated successfully");
      log::info!("Package name: {}", context.package_info().name);
      log::info!("Package version: {}", context.package_info().version);
      
      // Use the correct method for getting webview window in Tauri v2
      #[cfg(debug_assertions)]
      if let Some(window) = _app.get_webview_window("main") {
        window.open_devtools();
      }
      log::info!("Application setup completed successfully");
      Ok(())
    })
    .run(tauri::generate_context!());
    
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
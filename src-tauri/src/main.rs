// Always show console window for debugging - removed conditional compilation
#![windows_subsystem = "console"]

fn main() {
  // Generate context and log information about it
  let context = tauri::generate_context!();
  
  let result = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_log::Builder::new().build())
    .invoke_handler(tauri::generate_handler![])
    .setup(|_app| {
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
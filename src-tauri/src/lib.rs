mod google_oauth;
mod system_info;
mod local_sync;

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Opens the window at 70% of the screen's width and 80% of its height — of the work area
/// (i.e. excluding the taskbar), not the raw monitor resolution — centered within that area.
/// Recomputed from the actual monitor on every launch, so it scales correctly across any
/// screen size rather than assuming a fixed reference resolution.
fn size_window_to_screen(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else { return };
    let work_area = monitor.work_area();
    let available = work_area.size;

    let new_width = (available.width as f64 * 0.7) as u32;
    let new_height = (available.height as f64 * 0.8) as u32;
    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(new_width, new_height)));

    let new_x = work_area.position.x + (available.width as i32 - new_width as i32) / 2;
    let new_y = work_area.position.y + (available.height as i32 - new_height as i32) / 2;
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(new_x, new_y)));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(google_oauth::GoogleAuthState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            google_oauth::google_oauth_login,
            google_oauth::google_drive_list_files,
            google_oauth::google_oauth_logout,
            google_oauth::google_app_signin,
            system_info::list_local_drives,
            local_sync::open_and_sync_asset,
            local_sync::verify_mount_root,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Window starts hidden (tauri.conf.json) so the resize/reposition happens before
                // the first paint, instead of flashing the config default then snapping to size.
                size_window_to_screen(&window);
                let _ = window.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

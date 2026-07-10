mod google_oauth;
mod system_info;
mod local_sync;

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// The window opens at a fixed 2511x1500 default (tauri.conf.json), the app's reference design
/// canvas. Tauri doesn't clamp that to the display on its own, so on a smaller monitor the
/// window would otherwise open oversized/off-screen (extending under the taskbar, etc).
/// Clamp it to the monitor's work area — i.e. excluding the taskbar — on each axis
/// independently, and position it within that area, so window chrome and the full window
/// always stay on-screen. (Not a proportional/aspect-locked shrink: the dashboard layout
/// already reflows to whatever height it's given, so there's no aspect ratio to preserve.)
fn fit_window_to_monitor(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else { return };
    let Ok(outer_size) = window.outer_size() else { return };

    let work_area = monitor.work_area();
    let available = work_area.size;

    let new_width = outer_size.width.min(available.width);
    let new_height = outer_size.height.min(available.height);
    if new_width != outer_size.width || new_height != outer_size.height {
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(new_width, new_height)));
    }

    // Position within the work area (not the full monitor bounds, which include the taskbar)
    // so the title bar and its min/max/close controls always stay on-screen.
    let new_x = work_area.position.x + ((available.width as i32 - new_width as i32) / 2).max(0);
    let new_y = work_area.position.y + ((available.height as i32 - new_height as i32) / 2).max(0);
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
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Window starts hidden (tauri.conf.json) so the fit-to-monitor resize/reposition
                // happens before the first paint, instead of flashing the oversized default then
                // snapping to the correct size.
                fit_window_to_monitor(&window);
                let _ = window.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

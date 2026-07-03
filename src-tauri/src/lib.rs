mod google_oauth;
mod system_info;
mod local_sync;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

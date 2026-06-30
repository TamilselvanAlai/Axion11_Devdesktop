mod google_oauth;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

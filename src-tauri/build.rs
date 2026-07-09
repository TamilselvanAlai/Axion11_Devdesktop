fn main() {
    // Bake the Google OAuth credentials into the binary at compile time, via `env!`/`option_env!`
    // in google_oauth.rs, so packaged builds work without a runtime `.env` file next to the exe
    // (which doesn't exist post-install). Dev mode still lets a real .env override at runtime.
    if let Ok(iter) = dotenvy::from_filename_iter(".env") {
        for item in iter.flatten() {
            let (key, value) = item;
            if key == "GOOGLE_OAUTH_CLIENT_ID" || key == "GOOGLE_OAUTH_CLIENT_SECRET" {
                println!("cargo:rustc-env={key}={value}");
            }
        }
    }
    println!("cargo:rerun-if-changed=.env");

    tauri_build::build()
}

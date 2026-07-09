fn main() {
    // Bake the Google OAuth credentials into the binary at compile time, via `env!`/`option_env!`
    // in google_oauth.rs, so packaged builds work without a runtime `.env` file next to the exe
    // (which doesn't exist post-install). Dev mode still lets a real .env override at runtime.
    //
    // A blank value (e.g. an unset GitHub Actions secret substituting to "") is deliberately
    // NOT baked in — better to fall through to google_oauth.rs's own "not set" error than to
    // silently ship a binary that sends Google an empty client_id and gets a cryptic
    // "Missing required parameter: client_id" page instead.
    if let Ok(iter) = dotenvy::from_filename_iter(".env") {
        for item in iter.flatten() {
            let (key, value) = item;
            let is_target = key == "GOOGLE_OAUTH_CLIENT_ID" || key == "GOOGLE_OAUTH_CLIENT_SECRET";
            if is_target && !value.trim().is_empty() {
                println!("cargo:rustc-env={key}={value}");
            } else if is_target {
                println!("cargo:warning={key} is empty in .env — not baking it into the binary");
            }
        }
    }
    println!("cargo:rerun-if-changed=.env");

    tauri_build::build()
}

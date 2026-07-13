use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Paths currently being watched, so re-opening the same asset doesn't spawn duplicate watchers.
fn watched_paths() -> &'static Mutex<HashSet<PathBuf>> {
    static WATCHED: OnceLock<Mutex<HashSet<PathBuf>>> = OnceLock::new();
    WATCHED.get_or_init(|| Mutex::new(HashSet::new()))
}

#[derive(Serialize, Clone)]
struct SyncCompletePayload {
    #[serde(rename = "assetId")]
    asset_id: String,
    #[serde(rename = "batchId")]
    batch_id: String,
    #[serde(rename = "localPath")]
    local_path: String,
}

#[derive(Serialize, Clone)]
struct SyncErrorPayload {
    #[serde(rename = "assetId")]
    asset_id: String,
    error: String,
}

/// Downloads the asset to a local working directory that mirrors the project/batch names
/// shown in the app, opens it with the OS default application, and starts watching it for
/// changes. Any save triggers an authenticated re-upload of the same filename to the same
/// batch, which the backend automatically links as a new version of this asset.
#[tauri::command]
pub async fn open_and_sync_asset(
    app: AppHandle,
    download_url: String,
    relative_path: String,
    asset_id: String,
    batch_id: String,
    upload_url: String,
    auth_token: String,
    mount_root: Option<String>,
) -> Result<String, String> {
    let local_path = download_asset(&app, &download_url, &relative_path, mount_root.as_deref()).await?;

    tauri_plugin_opener::open_path(local_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed to open file: {e}"))?;

    start_watching(app, local_path.clone(), asset_id, batch_id, upload_url, auth_token);

    Ok(local_path.to_string_lossy().to_string())
}

/// Ensures a drive/folder root is treated as an absolute path, e.g. `"E:"` -> `"E:\\"`.
/// On Windows, `"E:"` without the trailing separator is a *drive-relative* path (relative to
/// whatever the current directory happens to be on that drive), not the drive's root — joining
/// onto a bare drive letter silently landed files in the wrong place (often back on `C:`),
/// which is why picking a non-system drive in Mount Settings looked like it "did nothing".
fn normalize_root(root: &str) -> String {
    let trimmed = root.trim();
    if trimmed.ends_with(['\\', '/']) {
        trimmed.to_string()
    } else {
        format!("{trimmed}\\")
    }
}

/// Confirms a chosen drive/folder is actually writable before Mount Settings persists it —
/// creates `<root>\AxionDam` (if needed) and writes+removes a small marker file. Without this,
/// "Apply" could report success even when the drive was unwritable or the letter didn't exist.
#[tauri::command]
pub fn verify_mount_root(root: String) -> Result<(), String> {
    let base_dir = PathBuf::from(normalize_root(&root)).join("AxionDam");
    std::fs::create_dir_all(&base_dir).map_err(|e| format!("Can't create folder on this drive: {e}"))?;

    let marker = base_dir.join(".axiondam-write-test");
    std::fs::write(&marker, b"ok").map_err(|e| format!("Drive isn't writable: {e}"))?;
    let _ = std::fs::remove_file(&marker);

    Ok(())
}

async fn download_asset(
    _app: &AppHandle,
    url: &str,
    relative_path: &str,
    mount_root: Option<&str>,
) -> Result<PathBuf, String> {
    // Defaults to the system drive (e.g. C:\) when the user hasn't picked one in Mount Settings —
    // always lands under <drive>\AxionDam\..., never the hidden AppData folder.
    let root = match mount_root {
        Some(root) if !root.trim().is_empty() => normalize_root(root),
        _ => {
            let system_drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
            normalize_root(&system_drive)
        }
    };
    let base_dir = PathBuf::from(root).join("AxionDam");

    let local_path = sanitize_join(&base_dir, relative_path);

    if let Some(parent) = local_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create local folder: {e}"))?;
    }

    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Download failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Download failed with status {}", response.status()));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read downloaded file: {e}"))?;

    std::fs::write(&local_path, &bytes).map_err(|e| format!("Failed to save local file: {e}"))?;

    Ok(local_path)
}

/// Joins path segments under base_dir while stripping anything that could escape it
/// (parent-dir segments, absolute-path segments, drive letters).
fn sanitize_join(base_dir: &Path, relative_path: &str) -> PathBuf {
    let mut path = base_dir.to_path_buf();
    for segment in relative_path.split(['/', '\\']) {
        let trimmed = segment.trim();
        if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
            continue;
        }
        path.push(trimmed);
    }
    path
}

fn start_watching(
    app: AppHandle,
    path: PathBuf,
    asset_id: String,
    batch_id: String,
    upload_url: String,
    auth_token: String,
) {
    {
        let mut watched = watched_paths().lock().unwrap();
        if watched.contains(&path) {
            return;
        }
        watched.insert(path.clone());
    }

    std::thread::spawn(move || {
        let watch_path = path.clone();
        let mut last_handled = Instant::now() - Duration::from_secs(60);

        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher: RecommendedWatcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(e) => {
                let _ = app.emit(
                    "asset-sync-error",
                    SyncErrorPayload { asset_id, error: format!("Watcher failed to start: {e}") },
                );
                return;
            }
        };

        if let Some(parent) = watch_path.parent() {
            if watcher.watch(parent, RecursiveMode::NonRecursive).is_err() {
                let _ = app.emit(
                    "asset-sync-error",
                    SyncErrorPayload { asset_id, error: "Failed to watch local folder".into() },
                );
                return;
            }
        }

        for res in rx {
            let Ok(event) = res else { continue };
            let touches_file = event.paths.iter().any(|p| p == &watch_path);
            if !touches_file || !matches!(event.kind, notify::EventKind::Modify(_)) {
                continue;
            }

            // Debounce — editors commonly fire several modify events per save.
            if last_handled.elapsed() < Duration::from_millis(1200) {
                continue;
            }
            last_handled = Instant::now();
            // Give the writing application a moment to finish flushing before we read.
            std::thread::sleep(Duration::from_millis(400));

            let app = app.clone();
            let watch_path = watch_path.clone();
            let asset_id = asset_id.clone();
            let batch_id = batch_id.clone();
            let upload_url = upload_url.clone();
            let auth_token = auth_token.clone();

            std::thread::spawn(move || {
                let result = tauri::async_runtime::block_on(upload_new_version(
                    &watch_path,
                    &batch_id,
                    &upload_url,
                    &auth_token,
                ));
                match result {
                    Ok(()) => {
                        let _ = app.emit(
                            "asset-sync-complete",
                            SyncCompletePayload {
                                asset_id,
                                batch_id,
                                local_path: watch_path.to_string_lossy().to_string(),
                            },
                        );
                    }
                    Err(e) => {
                        let _ = app.emit("asset-sync-error", SyncErrorPayload { asset_id, error: e });
                    }
                }
            });
        }

        watched_paths().lock().unwrap().remove(&watch_path);
    });
}

async fn upload_new_version(path: &Path, batch_id: &str, upload_url: &str, auth_token: &str) -> Result<(), String> {
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string());

    let bytes = std::fs::read(path).map_err(|e| format!("Failed to read local file: {e}"))?;

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(file_name)
        .mime_str("application/octet-stream")
        .map_err(|e| format!("Failed to build upload: {e}"))?;
    let form = reqwest::multipart::Form::new().part("files", part);

    let client = reqwest::Client::new();
    let url = upload_url.replace("{batchId}", batch_id);
    let response = client
        .post(&url)
        .bearer_auth(auth_token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Upload failed with status {}", response.status()));
    }
    Ok(())
}

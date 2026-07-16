use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

/// Paths currently being watched, so re-opening the same asset doesn't spawn duplicate watchers.
fn watched_paths() -> &'static Mutex<HashSet<PathBuf>> {
    static WATCHED: OnceLock<Mutex<HashSet<PathBuf>>> = OnceLock::new();
    WATCHED.get_or_init(|| Mutex::new(HashSet::new()))
}

#[derive(Serialize, Clone)]
pub struct OpenAssetResult {
    #[serde(rename = "localPath")]
    local_path: String,
    /// Epoch-millis timestamp of when this asset was first opened locally — kept stable across
    /// repeat opens so it can be used to compute how long someone has been working on it.
    #[serde(rename = "openedAt")]
    opened_at: i64,
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
) -> Result<OpenAssetResult, String> {
    let local_path = download_asset(&app, &download_url, &relative_path, mount_root.as_deref()).await?;
    let opened_at = get_or_record_opened_at(&local_path)?;

    tauri_plugin_opener::open_path(local_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed to open file: {e}"))?;

    start_watching(app, local_path.clone(), asset_id, batch_id, upload_url, auth_token);

    Ok(OpenAssetResult { local_path: local_path.to_string_lossy().to_string(), opened_at })
}

/// Looks up an already-downloaded asset without downloading or opening it — lets the UI show
/// "time spent" (based on the first-opened marker) even when the panel wasn't the thing that
/// triggered the download. Returns `None` if no local copy exists yet.
#[tauri::command]
pub fn get_local_asset_info(relative_path: String, mount_root: Option<String>) -> Option<OpenAssetResult> {
    let local_path = resolve_local_path(&relative_path, mount_root.as_deref());
    if !local_path.exists() {
        return None;
    }
    let opened_at = get_or_record_opened_at(&local_path).ok()?;
    Some(OpenAssetResult { local_path: local_path.to_string_lossy().to_string(), opened_at })
}

/// Marker file recording when an asset was first opened locally, kept alongside the asset itself.
fn opened_at_marker_path(local_path: &Path) -> PathBuf {
    let mut name = local_path.as_os_str().to_owned();
    name.push(".opened-at");
    PathBuf::from(name)
}

/// Returns the epoch-millis timestamp of when this asset was first opened. Creates the marker
/// with the current time on first call; later calls return the original (older) value unchanged
/// so re-opening an already-downloaded asset doesn't reset the "time spent" clock.
fn get_or_record_opened_at(local_path: &Path) -> Result<i64, String> {
    let marker = opened_at_marker_path(local_path);
    if let Ok(existing) = std::fs::read_to_string(&marker) {
        if let Ok(ms) = existing.trim().parse::<i64>() {
            return Ok(ms);
        }
    }
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Clock error: {e}"))?
        .as_millis() as i64;
    std::fs::write(&marker, now_ms.to_string()).map_err(|e| format!("Failed to record open time: {e}"))?;
    Ok(now_ms)
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

/// Resolves the local path an asset would live at, mirroring the project tree under
/// `<mountRoot or system drive>\AxionDam\...`, without touching the filesystem.
fn resolve_local_path(relative_path: &str, mount_root: Option<&str>) -> PathBuf {
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
    sanitize_join(&base_dir, relative_path)
}

async fn download_asset(
    _app: &AppHandle,
    url: &str,
    relative_path: &str,
    mount_root: Option<&str>,
) -> Result<PathBuf, String> {
    let local_path = resolve_local_path(relative_path, mount_root);

    if let Some(parent) = local_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create local folder: {e}"))?;
    }

    // Already downloaded — open the local copy instead of re-fetching it.
    if local_path.exists() {
        return Ok(local_path);
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
            // Many editors (Photoshop, Office, Illustrator, etc.) don't modify the file in
            // place — they write a temp file, delete the original, then rename/create the
            // replacement at the same path. That sequence fires Remove+Create, never Modify,
            // so a save could be silently missed if we only listened for Modify.
            if !touches_file
                || !matches!(
                    event.kind,
                    notify::EventKind::Modify(_) | notify::EventKind::Create(_)
                )
            {
                continue;
            }
            // A Create means the file was just replaced — give the writer a beat longer to
            // finish before we try to read it, since replace-on-save can still be settling.
            if matches!(event.kind, notify::EventKind::Create(_)) {
                std::thread::sleep(Duration::from_millis(200));
            }
            if !watch_path.exists() {
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

/// The backend stores whatever content-type the upload part declares — guess it from the
/// extension so a re-saved file keeps its real type (JPG/TIFF/PSD/...) instead of falling back
/// to a generic binary type that the UI can't categorize.
fn guess_mime_type(path: &Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "tif" | "tiff" => "image/tiff",
        "psd" => "image/vnd.adobe.photoshop",
        "cr3" => "image/x-canon-cr3",
        "mp4" | "mov" => "video/mp4",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
}

async fn upload_new_version(path: &Path, batch_id: &str, upload_url: &str, auth_token: &str) -> Result<(), String> {
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string());

    let bytes = std::fs::read(path).map_err(|e| format!("Failed to read local file: {e}"))?;

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(file_name)
        .mime_str(guess_mime_type(path))
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

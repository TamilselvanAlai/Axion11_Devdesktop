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
    /// The freshly created version's asset id — the backend links each save as a brand-new row,
    /// so the UI needs this to switch over to it instead of continuing to show the old one.
    #[serde(rename = "newAssetId")]
    new_asset_id: String,
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
    api_base: String,
    auth_token: String,
    mount_root: Option<String>,
) -> Result<OpenAssetResult, String> {
    let local_path = download_asset(&app, &download_url, &relative_path, mount_root.as_deref()).await?;
    let opened_at = get_or_record_opened_at(&local_path)?;

    tauri_plugin_opener::open_path(local_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed to open file: {e}"))?;

    start_watching(app, local_path.clone(), asset_id, batch_id, api_base, auth_token);

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
    api_base: String,
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
        // The originally-opened path — kept immutable so the dedup registration in
        // `watched_paths()` (keyed on this exact value) can always be cleaned up correctly,
        // even if `current_path` below later shifts to a different filename/extension.
        let original_path = path.clone();
        // The file actually being watched right now. Starts as `original_path`, but shifts if
        // the editor saves under a different extension (e.g. Photoshop "Save As" turning a
        // .tif into a .psd in the same folder) — matched by base filename, not full path, so a
        // type change doesn't silently stop being tracked.
        let mut current_path = path.clone();
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

        if let Some(parent) = current_path.parent() {
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
            if !matches!(
                event.kind,
                notify::EventKind::Modify(_) | notify::EventKind::Create(_)
            ) {
                continue;
            }

            // Match by base filename (stem) + a recognized asset extension, not full-path
            // equality — a re-save under a different extension is still the same asset.
            // Case-insensitive: Windows filesystems don't distinguish case, and some editors'
            // Save As dialogs normalize casing, so an exact OsStr comparison could silently
            // miss an otherwise-identical filename.
            let stem = current_path.file_stem().map(|s| s.to_string_lossy().to_lowercase());
            let parent = current_path.parent();
            let matched = event.paths.iter().find(|p| {
                p.parent() == parent
                    && p.file_stem().map(|s| s.to_string_lossy().to_lowercase()) == stem
                    && is_recognized_asset_extension(p)
            });
            let Some(matched) = matched else {
                eprintln!(
                    "[local_sync] watching {:?} (stem {:?}) — ignored unmatched event {:?}: {:?}",
                    current_path, stem, event.kind, event.paths
                );
                continue;
            };

            // A Create means the file was just replaced — give the writer a beat longer to
            // finish before we try to read it, since replace-on-save can still be settling.
            if matches!(event.kind, notify::EventKind::Create(_)) {
                std::thread::sleep(Duration::from_millis(200));
            }
            if !matched.exists() {
                continue;
            }
            current_path = matched.clone();

            // Debounce — editors commonly fire several modify events per save.
            if last_handled.elapsed() < Duration::from_millis(1200) {
                continue;
            }
            last_handled = Instant::now();
            // Give the writing application a moment to finish flushing before we read.
            std::thread::sleep(Duration::from_millis(400));

            let app = app.clone();
            let upload_path = current_path.clone();
            let asset_id = asset_id.clone();
            let batch_id = batch_id.clone();
            let api_base = api_base.clone();
            let auth_token = auth_token.clone();

            std::thread::spawn(move || {
                let result = tauri::async_runtime::block_on(upload_new_version(
                    &upload_path,
                    &asset_id,
                    &api_base,
                    &auth_token,
                ));
                match result {
                    Ok(new_asset_id) => {
                        let _ = app.emit(
                            "asset-sync-complete",
                            SyncCompletePayload {
                                asset_id,
                                batch_id,
                                local_path: upload_path.to_string_lossy().to_string(),
                                new_asset_id,
                            },
                        );
                    }
                    Err(e) => {
                        let _ = app.emit("asset-sync-error", SyncErrorPayload { asset_id, error: e });
                    }
                }
            });
        }

        watched_paths().lock().unwrap().remove(&original_path);
    });
}

/// Whether `path`'s extension is one this app actually treats as an asset — guards the
/// different-extension re-save match (a base-filename match alone would also fire on editor
/// lock/temp files like `.tmp`, `~$file.psd`, or `.DS_Store`-adjacent junk).
fn is_recognized_asset_extension(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    matches!(
        ext.as_str(),
        "jpg" | "jpeg" | "png" | "webp" | "tif" | "tiff" | "psd" | "cr3" | "mp4" | "mov"
    )
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
        "webp" => "image/webp",
        "tif" | "tiff" => "image/tiff",
        "psd" => "image/vnd.adobe.photoshop",
        "cr3" => "image/x-canon-cr3",
        "mp4" | "mov" => "video/mp4",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
}

/// Reads a just-saved file, retrying on a Windows sharing violation (os error 32) — the editor
/// (Photoshop, etc.) can still hold the file open for several seconds after the watcher's fixed
/// flush-wait, especially for large TIFF/PSD saves, so a single immediate read attempt fails
/// intermittently on exactly the files this feature cares about most. Retries for up to ~15s
/// before giving up; any other kind of read error still fails immediately.
fn read_file_with_retry(path: &Path) -> Result<Vec<u8>, String> {
    const MAX_ATTEMPTS: u32 = 30;
    const RETRY_DELAY: Duration = Duration::from_millis(500);

    for attempt in 0..MAX_ATTEMPTS {
        match std::fs::read(path) {
            Ok(bytes) => return Ok(bytes),
            Err(e) => {
                let is_locked = e.raw_os_error() == Some(32);
                if !is_locked || attempt + 1 == MAX_ATTEMPTS {
                    return Err(format!("Failed to read local file: {e}"));
                }
                std::thread::sleep(RETRY_DELAY);
            }
        }
    }
    unreachable!()
}

/// Re-uploads the saved file to replace the currently-open version's content **in place** —
/// same row, same version number. An edit-and-resave isn't a new version by itself: it becomes
/// draft + established (the "VE" badge — the current version an editor is working on), and the
/// version number only actually advances when a QC member approves it, mirroring how
/// AssetService#approveAsset already advances the version in place on approval rather than
/// forking a new row. Returns the (unchanged) asset id on success.
///
/// Goes through GCS's own signed-URL upload rather than posting the file straight to the
/// backend: Cloud Run hard-caps request bodies at ~32MB, which real TIFF/PSD masters routinely
/// exceed, so a direct multipart POST to the backend fails with 413 on anything bigger than
/// that. The signed-URL flow keeps the large bytes off Cloud Run entirely — only small JSON
/// requests go through it.
async fn upload_new_version(path: &Path, asset_id: &str, api_base: &str, auth_token: &str) -> Result<String, String> {
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string());
    let content_type = guess_mime_type(path);
    let file_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let bytes = read_file_with_retry(path)?;

    let client = reqwest::Client::new();

    // 1. Ask the backend for a short-lived signed PUT URL straight to GCS.
    let signed: serde_json::Value = post_json(
        &client,
        &format!("{api_base}/uploads/signed-url"),
        auth_token,
        serde_json::json!({ "fileName": file_name, "contentType": content_type }),
    )
    .await
    .map_err(|e| format!("Failed to request upload URL: {e}"))?;

    let signed_url = signed.get("signedUrl").and_then(|v| v.as_str()).ok_or_else(|| {
        let detail = signed.get("error").and_then(|v| v.as_str()).unwrap_or("no signed URL returned");
        format!("Couldn't get an upload URL from the server: {detail}")
    })?;
    let gcs_file_name = signed
        .get("gcsFileName")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Upload URL response was missing the storage file name".to_string())?;

    // 2. Upload the actual bytes directly to GCS — bypasses the backend/Cloud Run entirely.
    let put_response = client
        .put(signed_url)
        .header("Content-Type", content_type)
        .body(bytes)
        .send()
        .await
        .map_err(|e| format!("Upload to storage failed: {e}"))?;
    if !put_response.status().is_success() {
        let status = put_response.status();
        let body = put_response.text().await.unwrap_or_default();
        return Err(format!("Upload to storage failed with status {status}: {body}"));
    }

    // 3. Point the existing row at the new file — same version number, marked draft + established.
    let updated: serde_json::Value = post_json(
        &client,
        &format!("{api_base}/uploads/{asset_id}/replace-content"),
        auth_token,
        serde_json::json!({
            "gcsFileName": gcs_file_name,
            "contentType": content_type,
            "fileSize": file_size,
        }),
    )
    .await
    .map_err(|e| format!("Failed to save the new version: {e}"))?;

    updated
        .get("id")
        .and_then(|v| v.as_i64())
        .map(|id| id.to_string())
        .ok_or_else(|| "Save response was missing the asset id".to_string())
}

/// POSTs JSON and returns the parsed response body — on a non-2xx status, the error includes
/// the actual status code and response body (not just a generic JSON-parse failure), since a
/// non-JSON error page/body would otherwise surface as a confusing "failed to parse" message
/// that hides the real cause (e.g. a 413 from an intermediate proxy, a 401, a 500 with a stack
/// trace body).
async fn post_json(
    client: &reqwest::Client,
    url: &str,
    auth_token: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let response = client
        .post(url)
        .bearer_auth(auth_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| format!("Failed to read response: {e}"))?;

    if !status.is_success() {
        return Err(format!("Server responded with status {status}: {text}"));
    }

    serde_json::from_str(&text).map_err(|e| format!("Failed to parse response: {e} (body: {text})"))
}

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::State;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT: &str = "https://www.googleapis.com/oauth2/v3/userinfo";
const DRIVE_FILES_ENDPOINT: &str = "https://www.googleapis.com/drive/v3/files";
const SCOPES: &str = "openid email profile https://www.googleapis.com/auth/drive.readonly";

#[derive(Default)]
pub struct GoogleAuthState(pub Mutex<Option<String>>);

#[derive(Serialize)]
pub struct GoogleAccount {
    pub email: String,
    pub name: String,
}

#[derive(Serialize)]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
    #[serde(rename = "sizeMb")]
    pub size_mb: f64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct UserInfoResponse {
    email: String,
    #[serde(default)]
    name: String,
}

#[derive(Deserialize)]
struct DriveFileRaw {
    id: String,
    name: String,
    #[serde(rename = "mimeType")]
    mime_type: String,
    #[serde(default)]
    size: Option<String>,
}

#[derive(Deserialize)]
struct DriveListResponse {
    #[serde(default)]
    files: Vec<DriveFileRaw>,
}

fn oauth_credentials() -> Result<(String, String), String> {
    let _ = dotenvy::dotenv();
    let client_id = std::env::var("GOOGLE_OAUTH_CLIENT_ID")
        .map_err(|_| "GOOGLE_OAUTH_CLIENT_ID is not set. Add it to src-tauri/.env".to_string())?;
    let client_secret = std::env::var("GOOGLE_OAUTH_CLIENT_SECRET")
        .map_err(|_| "GOOGLE_OAUTH_CLIENT_SECRET is not set. Add it to src-tauri/.env".to_string())?;
    Ok((client_id, client_secret))
}

fn random_url_safe_string(byte_len: usize) -> String {
    let bytes: Vec<u8> = (0..byte_len).map(|_| rand::thread_rng().gen()).collect();
    URL_SAFE_NO_PAD.encode(bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

/// Waits for exactly one loopback HTTP redirect from the system browser and
/// extracts the `code`/`state` query params Google appends after consent.
async fn await_redirect(listener: TcpListener) -> Result<(String, String), String> {
    let (mut socket, _) = listener
        .accept()
        .await
        .map_err(|e| format!("Loopback listener failed: {e}"))?;

    let mut buf = vec![0u8; 8192];
    let n = socket
        .read(&mut buf)
        .await
        .map_err(|e| format!("Failed to read redirect: {e}"))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    let response_body = "<html><body style=\"font-family:sans-serif;text-align:center;margin-top:20vh\">\
        <h2>Signed in</h2><p>You can close this tab and return to Axion.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        response_body.len(),
        response_body
    );
    let _ = socket.write_all(response.as_bytes()).await;

    let first_line = request.lines().next().unwrap_or_default();
    let path = first_line.split_whitespace().nth(1).unwrap_or_default();
    let query = path.split_once('?').map(|(_, q)| q).unwrap_or_default();

    let mut code = None;
    let mut state = None;
    for pair in query.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            match key {
                "code" => code = Some(urlencoding::decode(value).unwrap_or_default().into_owned()),
                "state" => state = Some(urlencoding::decode(value).unwrap_or_default().into_owned()),
                _ => {}
            }
        }
    }

    match (code, state) {
        (Some(code), Some(state)) => Ok((code, state)),
        _ => Err("Google did not return an authorization code. Sign-in may have been cancelled.".to_string()),
    }
}

#[tauri::command]
pub async fn google_oauth_login(
    auth_state: State<'_, GoogleAuthState>,
) -> Result<GoogleAccount, String> {
    let (client_id, client_secret) = oauth_credentials()?;

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Could not start local listener: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");

    let verifier = random_url_safe_string(48);
    let challenge = pkce_challenge(&verifier);
    let csrf_state = random_url_safe_string(16);

    let auth_url = format!(
        "{AUTH_ENDPOINT}?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code\
         &scope={scope}&code_challenge={challenge}&code_challenge_method=S256\
         &state={csrf_state}&access_type=online&prompt=select_account+consent",
        client_id = urlencoding::encode(&client_id),
        redirect_uri = urlencoding::encode(&redirect_uri),
        scope = urlencoding::encode(SCOPES),
        challenge = challenge,
        csrf_state = csrf_state,
    );

    tauri_plugin_opener::open_url(auth_url, None::<String>)
        .map_err(|e| format!("Could not open browser: {e}"))?;

    let (code, returned_state) = await_redirect(listener).await?;
    if returned_state != csrf_state {
        return Err("Sign-in state mismatch. Please try again.".to_string());
    }

    let http = reqwest::Client::new();
    let token_res = http
        .post(TOKEN_ENDPOINT)
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {e}"))?;

    if !token_res.status().is_success() {
        let body = token_res.text().await.unwrap_or_default();
        return Err(format!("Google rejected the token exchange: {body}"));
    }
    let tokens: TokenResponse = token_res.json().await.map_err(|e| e.to_string())?;

    let userinfo_res = http
        .get(USERINFO_ENDPOINT)
        .bearer_auth(&tokens.access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch account info: {e}"))?;
    let userinfo: UserInfoResponse = userinfo_res.json().await.map_err(|e| e.to_string())?;

    *auth_state.0.lock().unwrap() = Some(tokens.access_token);

    Ok(GoogleAccount {
        email: userinfo.email,
        name: if userinfo.name.is_empty() { "Google User".to_string() } else { userinfo.name },
    })
}

fn mb_from_byte_string(size: &Option<String>) -> f64 {
    size.as_ref()
        .and_then(|s| s.parse::<u64>().ok())
        .map(|bytes| (bytes as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0)
        .unwrap_or(0.1)
}

#[tauri::command]
pub async fn google_drive_list_files(
    auth_state: State<'_, GoogleAuthState>,
) -> Result<Vec<DriveFile>, String> {
    let access_token = auth_state
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Not connected to Google Drive.".to_string())?;

    let http = reqwest::Client::new();
    let res = http
        .get(DRIVE_FILES_ENDPOINT)
        .bearer_auth(&access_token)
        .query(&[
            ("pageSize", "25"),
            ("orderBy", "modifiedTime desc"),
            ("fields", "files(id,name,mimeType,size)"),
            ("q", "trashed = false"),
        ])
        .send()
        .await
        .map_err(|e| format!("Drive request failed: {e}"))?;

    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Drive API error: {body}"));
    }

    let parsed: DriveListResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(parsed
        .files
        .into_iter()
        .map(|f| DriveFile {
            id: f.id,
            name: f.name,
            mime_type: f.mime_type,
            size_mb: mb_from_byte_string(&f.size),
        })
        .collect())
}

#[tauri::command]
pub fn google_oauth_logout(auth_state: State<'_, GoogleAuthState>) {
    *auth_state.0.lock().unwrap() = None;
}

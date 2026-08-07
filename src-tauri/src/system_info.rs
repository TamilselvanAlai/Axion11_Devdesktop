use serde::Serialize;
use sysinfo::Disks;

/// Seconds since the last physical mouse/keyboard input, system-wide — not scoped to this app's
/// own window. This is the only reliable idle signal for time tracking here: the user's real
/// activity happens inside a third-party editor (Photoshop, etc.), a separate OS process the
/// WebView can't see `mousemove`/`keydown` events from. Polled from the frontend's activity tick
/// (see useWorkSessionTracking) to decide whether the elapsed tick interval counts toward active
/// editing time or gets excluded as idle.
#[cfg(windows)]
#[tauri::command]
pub fn get_system_idle_seconds() -> u64 {
    use windows_sys::Win32::Foundation::FALSE;
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    if unsafe { GetLastInputInfo(&mut info) } == FALSE {
        return 0;
    }
    // Both are millisecond tick counts that wrap around every ~49.7 days; a wrapped comparison
    // would show as a huge unsigned underflow, so treat that case as "not idle" rather than
    // reporting a bogus multi-billion-second idle duration.
    let now = unsafe { GetTickCount() };
    now.checked_sub(info.dwTime).map(|ms| (ms as u64) / 1000).unwrap_or(0)
}

/// Non-Windows builds have no idle source wired up yet — report "never idle" (0) so behavior
/// degrades to the pre-idle-tracking default (every tick counts as active) instead of failing.
#[cfg(not(windows))]
#[tauri::command]
pub fn get_system_idle_seconds() -> u64 {
    0
}

#[derive(Serialize)]
pub struct LocalDrive {
    pub id: String,
    pub name: String,
    #[serde(rename = "mountPoint")]
    pub mount_point: String,
    #[serde(rename = "totalBytes")]
    pub total_bytes: u64,
    #[serde(rename = "availableBytes")]
    pub available_bytes: u64,
    pub removable: bool,
}

/// Lists the machine's physical/mounted drives with real capacity and free space,
/// read straight from the OS — there is no browser API that exposes this.
#[tauri::command]
pub fn list_local_drives() -> Vec<LocalDrive> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|disk| {
            let mount_point = disk.mount_point().to_string_lossy().to_string();
            let raw_name = disk.name().to_string_lossy().to_string();
            let name = if raw_name.trim().is_empty() {
                mount_point.clone()
            } else {
                raw_name
            };
            LocalDrive {
                id: mount_point.clone(),
                name,
                mount_point,
                total_bytes: disk.total_space(),
                available_bytes: disk.available_space(),
                removable: disk.is_removable(),
            }
        })
        .collect()
}

use serde::Serialize;
use sysinfo::Disks;

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

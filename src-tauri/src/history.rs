use serde::{Deserialize, Serialize};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

fn write_secret_file(path: &Path, contents: &[u8]) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())?;
    let mut perms = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
    perms.set_mode(0o600);
    fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub item_type: String,
    pub format: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<u64>,
    pub timestamp: i64,
    pub upload_url: Option<String>,
    pub deletion_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub is_favorite: bool,
}

pub fn get_history_path() -> PathBuf {
    let mut dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("sharel");
    fs::create_dir_all(&dir).ok();
    dir.push("history.json");
    dir
}

pub fn load_history() -> Vec<HistoryItem> {
    let path = get_history_path();
    if let Ok(contents) = fs::read_to_string(&path) {
        if let Ok(items) = serde_json::from_str::<Vec<HistoryItem>>(&contents) {
            return items;
        }
    }
    Vec::new()
}

pub fn save_history(items: &[HistoryItem]) -> Result<(), String> {
    let path = get_history_path();
    let json = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    write_secret_file(&path, json.as_bytes())
}

pub fn add_history_item(item: HistoryItem) -> Result<(), String> {
    let mut items = load_history();
    items.retain(|i| i.id != item.id);
    items.insert(0, item);
    if items.len() > 500 {
        items.truncate(500);
    }
    save_history(&items)
}

pub fn update_history_item(id: &str, upload_url: Option<String>, deletion_url: Option<String>) -> Result<(), String> {
    let mut items = load_history();
    if let Some(item) = items.iter_mut().find(|i| i.id == id) {
        if upload_url.is_some() {
            item.upload_url = upload_url;
        }
        if deletion_url.is_some() {
            item.deletion_url = deletion_url;
        }
    }
    save_history(&items)
}

pub fn toggle_favorite_history_item(id: &str) -> Result<bool, String> {
    let mut items = load_history();
    let mut new_val = false;
    if let Some(item) = items.iter_mut().find(|i| i.id == id) {
        item.is_favorite = !item.is_favorite;
        new_val = item.is_favorite;
    }
    save_history(&items)?;
    Ok(new_val)
}

pub fn delete_history_item(id: &str, delete_file: bool) -> Result<(), String> {
    let mut items = load_history();
    if let Some(item) = items.iter().find(|i| i.id == id) {
        if delete_file {
            let p = std::path::Path::new(&item.file_path);
            if p.exists() {
                fs::remove_file(p).ok();
            }
        }
    }
    items.retain(|i| i.id != id);
    save_history(&items)
}

pub fn clear_history() -> Result<(), String> {
    save_history(&[])
}

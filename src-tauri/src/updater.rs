use crate::config::{load_config, save_config};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::env;
use std::fs;
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use tauri::Emitter;

pub const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const GITHUB_REPO: &str = "44tl/ShareL";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub name: Option<String>,
    pub body: Option<String>,
    pub html_url: String,
    pub published_at: Option<String>,
    pub prerelease: bool,
    pub draft: bool,
    pub assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckUpdateResult {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_name: String,
    pub release_notes: String,
    pub release_url: String,
    pub published_at: String,
    pub is_ignored: bool,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProgress {
    pub status: String,
    pub progress_pct: f64,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackResult {
    pub success: bool,
    pub message: String,
    pub restored_version: Option<String>,
}

fn parse_semver(ver: &str) -> (u64, u64, u64, Option<String>) {
    let clean = ver.trim().trim_start_matches('v').trim_start_matches('V');
    let mut parts = clean.splitn(2, '-');
    let numbers = parts.next().unwrap_or("0");
    let pre = parts.next().map(|s| s.to_string());

    let mut nums = numbers.split('.');
    let major = nums.next().and_then(|n| n.parse::<u64>().ok()).unwrap_or(0);
    let minor = nums.next().and_then(|n| n.parse::<u64>().ok()).unwrap_or(0);
    let patch = nums.next().and_then(|n| n.parse::<u64>().ok()).unwrap_or(0);

    (major, minor, patch, pre)
}

pub fn compare_versions(v1: &str, v2: &str) -> Ordering {
    let (maj1, min1, pat1, pre1) = parse_semver(v1);
    let (maj2, min2, pat2, pre2) = parse_semver(v2);

    match maj1.cmp(&maj2) {
        Ordering::Equal => match min1.cmp(&min2) {
            Ordering::Equal => match pat1.cmp(&pat2) {
                Ordering::Equal => match (&pre1, &pre2) {
                    (None, None) => Ordering::Equal,
                    (Some(_), None) => Ordering::Less,
                    (None, Some(_)) => Ordering::Greater,
                    (Some(p1), Some(p2)) => p1.cmp(p2),
                },
                other => other,
            },
            other => other,
        },
        other => other,
    }
}

pub async fn fetch_github_releases() -> Result<Vec<ReleaseInfo>, String> {
    let url = format!("https://api.github.com/repos/{}/releases", GITHUB_REPO);
    let client = reqwest::Client::builder()
        .user_agent("ShareL-Desktop-App")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to reach GitHub update server: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned status {}", response.status()));
    }

    let releases: Vec<ReleaseInfo> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release payload: {}", e))?;

    Ok(releases)
}

pub async fn check_for_updates() -> Result<CheckUpdateResult, String> {
    let cfg = load_config();
    let releases = fetch_github_releases().await?;

    let current = CURRENT_VERSION;

    let target_release = releases.into_iter().find(|r| {
        if r.draft {
            return false;
        }
        if r.prerelease && cfg.update_channel != "beta" {
            return false;
        }
        true
    });

    let Some(rel) = target_release else {
        return Ok(CheckUpdateResult {
            has_update: false,
            current_version: current.to_string(),
            latest_version: current.to_string(),
            release_name: "ShareL is up to date".to_string(),
            release_notes: String::new(),
            release_url: format!("https://github.com/{}", GITHUB_REPO),
            published_at: String::new(),
            is_ignored: false,
            download_url: None,
            asset_name: None,
        });
    };

    let latest_ver = rel.tag_name.trim().trim_start_matches('v').trim_start_matches('V').to_string();
    let has_update = compare_versions(&latest_ver, current) == Ordering::Greater;
    let is_ignored = cfg.ignored_versions.contains(&latest_ver) || cfg.ignored_versions.contains(&rel.tag_name);

    let matching_asset = rel.assets.iter().find(|a| {
        let name = a.name.to_lowercase();
        name.ends_with(".appimage") || name.ends_with(".tar.gz") || name == "sharel" || name.contains("sharel_linux")
    }).or_else(|| rel.assets.first());

    let download_url = matching_asset.map(|a| a.browser_download_url.clone());
    let asset_name = matching_asset.map(|a| a.name.clone());

    let raw_notes = rel.body.unwrap_or_default();
    let cleaned_notes = raw_notes
        .lines()
        .filter(|line| !line.to_lowercase().contains("dependabot") && !line.contains("@dependabot[bot]"))
        .collect::<Vec<_>>()
        .join("\n");

    Ok(CheckUpdateResult {
        has_update,
        current_version: current.to_string(),
        latest_version: latest_ver,
        release_name: rel.name.unwrap_or_else(|| rel.tag_name.clone()),
        release_notes: cleaned_notes,
        release_url: rel.html_url,
        published_at: rel.published_at.unwrap_or_default(),
        is_ignored,
        download_url,
        asset_name,
    })
}

pub fn ignore_version(version: String) -> Result<(), String> {
    let mut cfg = load_config();
    let clean = version.trim().trim_start_matches('v').to_string();
    if !cfg.ignored_versions.contains(&clean) {
        cfg.ignored_versions.push(clean);
        save_config(&cfg)?;
    }
    Ok(())
}

pub fn unignore_version(version: String) -> Result<(), String> {
    let mut cfg = load_config();
    let clean = version.trim().trim_start_matches('v').to_string();
    cfg.ignored_versions.retain(|v| v != &clean && v != &version);
    save_config(&cfg)
}

pub fn get_backup_dir() -> PathBuf {
    let mut dir = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("sharel");
    dir.push("backups");
    fs::create_dir_all(&dir).ok();
    dir
}

pub fn get_installed_binary_path() -> Result<PathBuf, String> {
    env::current_exe().map_err(|e| format!("Could not locate current executable: {}", e))
}

pub async fn install_update_with_progress(
    app: Option<&tauri::AppHandle>,
    custom_download_url: Option<String>,
) -> Result<String, String> {
    let update_info = check_for_updates().await?;
    let download_url = match custom_download_url {
        Some(u) => u,
        None => update_info.download_url.ok_or_else(|| "No downloadable binary found in latest release.".to_string())?,
    };

    let send_progress = |status: &str, progress_pct: f64, downloaded: u64, total: u64, msg: &str| {
        if let Some(app_handle) = app {
            let _ = app_handle.emit("update://progress", UpdateProgress {
                status: status.to_string(),
                progress_pct,
                bytes_downloaded: downloaded,
                total_bytes: total,
                message: msg.to_string(),
            });
        }
    };

    send_progress("downloading", 0.0, 0, 0, "Initiating download...");

    let client = reqwest::Client::builder()
        .user_agent("ShareL-Desktop-App")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download update file: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(0);
    let temp_dir = env::temp_dir();
    let temp_file_path = temp_dir.join(format!("sharel_update_{}", uuid::Uuid::new_v4()));
    let mut file = fs::File::create(&temp_file_path).map_err(|e| e.to_string())?;

    let mut downloaded: u64 = 0;
    let mut response_bytes = res;
    while let Some(chunk) = response_bytes.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let pct = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            50.0
        };
        send_progress("downloading", pct, downloaded, total_size, &format!("Downloading: {:.1}%", pct));
    }
    drop(file);

    send_progress("installing", 90.0, downloaded, total_size, "Applying update and backing up previous binary...");

    let current_exe = get_installed_binary_path()?;
    let backup_dir = get_backup_dir();
    let backup_path = backup_dir.join(format!("sharel_v{}_backup", CURRENT_VERSION));

    if current_exe.exists() {
        let _ = fs::copy(&current_exe, &backup_path);
        let current_meta_path = backup_dir.join("latest_backup_meta.json");
        let meta = serde_json::json!({
            "version": CURRENT_VERSION,
            "backup_file": backup_path.to_string_lossy(),
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "target_path": current_exe.to_string_lossy(),
        });
        let _ = fs::write(&current_meta_path, meta.to_string());
    }

    let mut perms = fs::metadata(&temp_file_path).map_err(|e| e.to_string())?.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(&temp_file_path, perms).map_err(|e| e.to_string())?;

    fs::copy(&temp_file_path, &current_exe).map_err(|e| format!("Failed to replace executable at {:?}: {}", current_exe, e))?;
    let _ = fs::remove_file(&temp_file_path);

    send_progress("completed", 100.0, downloaded, total_size, "Update installed successfully!");

    Ok(format!("Updated ShareL to {}", update_info.latest_version))
}

pub async fn rollback_to_previous_version() -> Result<RollbackResult, String> {
    let backup_dir = get_backup_dir();
    let meta_path = backup_dir.join("latest_backup_meta.json");

    if !meta_path.exists() {
        return Err("No prior local backup found to restore.".to_string());
    }

    let meta_content = fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    let meta: serde_json::Value = serde_json::from_str(&meta_content).map_err(|e| e.to_string())?;

    let backup_file = meta["backup_file"].as_str().ok_or_else(|| "Invalid backup metadata".to_string())?;
    let target_path = meta["target_path"].as_str().ok_or_else(|| "Invalid target path".to_string())?;
    let version = meta["version"].as_str().unwrap_or("previous").to_string();

    let backup_path = Path::new(backup_file);
    let target = Path::new(target_path);

    if !backup_path.exists() {
        return Err(format!("Backup binary was not found at {:?}", backup_path));
    }

    fs::copy(backup_path, target).map_err(|e| format!("Failed to restore backup binary: {}", e))?;
    let mut perms = fs::metadata(target).map_err(|e| e.to_string())?.permissions();
    perms.set_mode(0o755);
    fs::set_permissions(target, perms).map_err(|e| e.to_string())?;

    Ok(RollbackResult {
        success: true,
        message: format!("Successfully restored ShareL v{}", version),
        restored_version: Some(version),
    })
}

pub async fn install_specific_release_tag(app: Option<&tauri::AppHandle>, tag: &str) -> Result<String, String> {
    let releases = fetch_github_releases().await?;
    let target_tag = tag.trim().trim_start_matches('v').to_lowercase();

    let rel = releases.into_iter().find(|r| {
        let t = r.tag_name.trim().trim_start_matches('v').to_lowercase();
        t == target_tag || r.tag_name.to_lowercase() == tag.to_lowercase()
    }).ok_or_else(|| format!("Release '{}' was not found on GitHub repository.", tag))?;

    let matching_asset = rel.assets.iter().find(|a| {
        let name = a.name.to_lowercase();
        name.ends_with(".appimage") || name.ends_with(".tar.gz") || name == "sharel" || name.contains("sharel_linux")
    }).or_else(|| rel.assets.first()).ok_or_else(|| "Release contains no downloadable binary assets.".to_string())?;

    install_update_with_progress(app, Some(matching_asset.browser_download_url.clone())).await
}

// ─────────────────────────────────────────────────────────────
// TAURI COMMANDS
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn check_for_updates_cmd() -> Result<CheckUpdateResult, String> {
    check_for_updates().await
}

#[tauri::command]
pub async fn list_available_releases_cmd() -> Result<Vec<ReleaseInfo>, String> {
    fetch_github_releases().await
}

#[tauri::command]
pub async fn install_update_cmd(app: tauri::AppHandle) -> Result<String, String> {
    install_update_with_progress(Some(&app), None).await
}

#[tauri::command]
pub async fn ignore_version_cmd(version: String) -> Result<(), String> {
    ignore_version(version)
}

#[tauri::command]
pub async fn unignore_version_cmd(version: String) -> Result<(), String> {
    unignore_version(version)
}

#[tauri::command]
pub async fn rollback_version_cmd() -> Result<RollbackResult, String> {
    rollback_to_previous_version().await
}

#[tauri::command]
pub async fn install_version_tag_cmd(app: tauri::AppHandle, tag: String) -> Result<String, String> {
    install_specific_release_tag(Some(&app), &tag).await
}

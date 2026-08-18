use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AfterCaptureTasks {
    pub copy_to_clipboard: bool,
    pub save_to_file: bool,
    pub upload_to_host: bool,
    pub open_in_editor: bool,
    pub show_notification: bool,
    pub play_sound: bool,
}

impl Default for AfterCaptureTasks {
    fn default() -> Self {
        Self {
            copy_to_clipboard: true,
            save_to_file: true,
            upload_to_host: false,
            open_in_editor: true,
            show_notification: true,
            play_sound: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AfterUploadTasks {
    pub copy_url_to_clipboard: bool,
    pub open_url_in_browser: bool,
    pub show_notification: bool,
}

impl Default for AfterUploadTasks {
    fn default() -> Self {
        Self {
            copy_url_to_clipboard: true,
            open_url_in_browser: false,
            show_notification: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub save_directory: String,
    pub recordings_directory: String,
    pub file_naming_pattern: String,
    pub default_image_format: String,
    pub default_recording_format: String,
    pub recording_fps: u32,
    pub recording_include_audio: bool,
    pub after_capture: AfterCaptureTasks,
    pub after_upload: AfterUploadTasks,
    pub active_uploader_id: String,
    pub theme: String,
    pub minimize_to_tray: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        let pictures_dir = dirs::picture_dir()
            .unwrap_or_else(|| PathBuf::from("./Screenshots"))
            .join("ShareL")
            .to_string_lossy()
            .to_string();

        let videos_dir = dirs::video_dir()
            .unwrap_or_else(|| PathBuf::from("./Recordings"))
            .join("ShareL")
            .to_string_lossy()
            .to_string();

        Self {
            save_directory: pictures_dir,
            recordings_directory: videos_dir,
            file_naming_pattern: "%Y-%m-%d_%H-%M-%S".to_string(),
            default_image_format: "png".to_string(),
            default_recording_format: "gif".to_string(),
            recording_fps: 30,
            recording_include_audio: false,
            after_capture: AfterCaptureTasks::default(),
            after_upload: AfterUploadTasks::default(),
            active_uploader_id: "default_sxcu".to_string(),
            theme: "dark".to_string(),
            minimize_to_tray: true,
        }
    }
}

pub fn get_config_path() -> PathBuf {
    let mut dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("sharel");
    fs::create_dir_all(&dir).ok();
    dir.push("config.json");
    dir
}

pub fn load_config() -> AppConfig {
    let path = get_config_path();
    if let Ok(contents) = fs::read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str::<AppConfig>(&contents) {
            return cfg;
        }
    }
    let default_cfg = AppConfig::default();
    save_config(&default_cfg).ok();
    default_cfg
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path();
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

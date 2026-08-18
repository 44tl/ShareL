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
pub struct GlobalShortcuts {
    pub capture_region: String,
    pub capture_fullscreen: String,
    pub capture_window: String,
    pub capture_active_screen: String,
    pub open_main_window: String,
    pub stop_recording: String,
    pub upload_last_capture: String,
    pub ocr_last_capture: String,
}

impl Default for GlobalShortcuts {
    fn default() -> Self {
        Self {
            capture_region: "Ctrl+Shift+PrintScreen".to_string(),
            capture_fullscreen: "PrintScreen".to_string(),
            capture_window: "Alt+PrintScreen".to_string(),
            capture_active_screen: "Ctrl+PrintScreen".to_string(),
            open_main_window: String::new(),
            stop_recording: String::new(),
            upload_last_capture: String::new(),
            ocr_last_capture: String::new(),
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
    #[serde(default = "default_recording_bitrate")]
    pub recording_bitrate_kbps: u32,
    #[serde(default = "default_recording_codec")]
    pub recording_codec: String,
    #[serde(default = "default_audio_source")]
    pub recording_audio_source: String,
    #[serde(default = "default_bool_true")]
    pub recording_capture_cursor: bool,
    #[serde(default)]
    pub recording_highlight_cursor: bool,
    #[serde(default)]
    pub recording_webcam_overlay: bool,
    #[serde(default = "default_webcam_device")]
    pub recording_webcam_device: String,
    #[serde(default = "default_webcam_position")]
    pub recording_webcam_position: String,
    #[serde(default = "default_filename_template")]
    pub recording_filename_template: String,
    #[serde(default)]
    pub recording_auto_upload: bool,
    pub after_capture: AfterCaptureTasks,
    pub after_upload: AfterUploadTasks,
    pub active_uploader_id: String,
    pub theme: String,
    pub minimize_to_tray: bool,
    #[serde(default = "default_backend_auto")]
    pub preferred_screenshot_backend: String,
    #[serde(default = "default_backend_auto")]
    pub preferred_recording_backend: String,
    #[serde(default)]
    pub shortcuts: GlobalShortcuts,
}

fn default_backend_auto() -> String {
    "auto".to_string()
}

fn default_recording_bitrate() -> u32 {
    8000
}

fn default_recording_codec() -> String {
    "h264".to_string()
}

fn default_audio_source() -> String {
    "none".to_string()
}

fn default_bool_true() -> bool {
    true
}

fn default_webcam_device() -> String {
    "/dev/video0".to_string()
}

fn default_webcam_position() -> String {
    "bottom_right".to_string()
}

fn default_filename_template() -> String {
    "ShareL_Rec_{date}_{time}".to_string()
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
            default_recording_format: "mp4".to_string(),
            recording_fps: 60,
            recording_include_audio: false,
            recording_bitrate_kbps: 8000,
            recording_codec: "h264".to_string(),
            recording_audio_source: "none".to_string(),
            recording_capture_cursor: true,
            recording_highlight_cursor: false,
            recording_webcam_overlay: false,
            recording_webcam_device: "/dev/video0".to_string(),
            recording_webcam_position: "bottom_right".to_string(),
            recording_filename_template: "ShareL_Rec_{date}_{time}".to_string(),
            recording_auto_upload: false,
            after_capture: AfterCaptureTasks::default(),
            after_upload: AfterUploadTasks::default(),
            active_uploader_id: "default_sxcu".to_string(),
            theme: "dark".to_string(),
            minimize_to_tray: true,
            preferred_screenshot_backend: "auto".to_string(),
            preferred_recording_backend: "auto".to_string(),
            shortcuts: GlobalShortcuts::default(),
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

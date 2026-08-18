use arboard::Clipboard;
use ashpd::desktop::screenshot::Screenshot;
use chrono::Local;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptureMode {
    Region,
    Fullscreen,
    Window,
    ActiveScreen,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureResult {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub timestamp: i64,
    pub data_url: String,
    pub format: String,
}

pub fn generate_file_path(save_dir: &str, format: &str) -> PathBuf {
    let now = Local::now();
    let filename = format!("ShareL_{}.{}", now.format("%Y-%m-%d_%H-%M-%S"), format);
    let mut dir = PathBuf::from(save_dir);
    if !dir.exists() {
        fs::create_dir_all(&dir).ok();
    }
    dir.push(filename);
    dir
}

pub fn copy_image_to_clipboard(path: &Path) -> Result<(), String> {
    // If running on Wayland (WAYLAND_DISPLAY is set), try wl-copy first for persistent clipboard across process exits
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        if let Ok(mut child) = std::process::Command::new("wl-copy")
            .arg("-t")
            .arg("image/png")
            .stdin(std::process::Stdio::piped())
            .spawn()
        {
            if let Ok(bytes) = fs::read(path) {
                if let Some(mut stdin) = child.stdin.take() {
                    use std::io::Write;
                    let _ = stdin.write_all(&bytes);
                }
                if let Ok(status) = child.wait() {
                    if status.success() {
                        return Ok(());
                    }
                }
            }
        }
    }

    let img = image::open(path).map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (width, height) = img.dimensions();

    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let img_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: std::borrow::Cow::Borrowed(rgba.as_raw()),
    };
    clipboard.set_image(img_data).map_err(|e| e.to_string())
}

pub fn copy_text_to_clipboard(text: &str) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())
}

async fn capture_with_grim_slurp(interactive: bool, target_path: &Path) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).ok();
    }

    let mut cmd = std::process::Command::new("grim");
    if interactive {
        let slurp_out = std::process::Command::new("slurp")
            .output()
            .map_err(|e| format!("Failed to execute slurp: {}", e))?;
        if !slurp_out.status.success() {
            return Err("Region selection cancelled via slurp".to_string());
        }
        let region = String::from_utf8_lossy(&slurp_out.stdout).trim().to_string();
        if region.is_empty() {
            return Err("Empty region selected".to_string());
        }
        cmd.arg("-g").arg(region);
    }
    cmd.arg(target_path);

    let status = cmd.status().map_err(|e| format!("Failed to execute grim: {}", e))?;
    if !status.success() {
        return Err("grim failed to capture screenshot".to_string());
    }
    Ok(())
}

async fn capture_with_xdg_portal(interactive: bool, target_path: &Path) -> Result<(), String> {
    let req = Screenshot::request().interactive(interactive).modal(false);
    let portal_res = req.send().await;

    match portal_res {
        Ok(sent) => {
            if let Ok(response) = sent.response() {
                let uri = response.uri();
                if let Ok(temp_path) = uri.to_file_path() {
                    if temp_path.exists() {
                        if let Some(parent) = target_path.parent() {
                            fs::create_dir_all(parent).ok();
                        }
                        if fs::copy(&temp_path, target_path).is_ok() {
                            return Ok(());
                        }
                    }
                }
            }
        }
        Err(e) => {
            // Portal error/absence fallback to grim/slurp if running Wayland
            if std::env::var("WAYLAND_DISPLAY").is_ok() {
                if let Ok(()) = capture_with_grim_slurp(interactive, target_path).await {
                    return Ok(());
                }
            }
            return Err(format!("XDG Desktop Portal screenshot error: {}", e));
        }
    }

    // Fallback if portal completed but produced invalid response
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        if let Ok(()) = capture_with_grim_slurp(interactive, target_path).await {
            return Ok(());
        }
    }

    Err("Screenshot capture failed via Portal and fallback tools".to_string())
}

pub async fn take_screenshot(
    mode: CaptureMode,
    save_dir: &str,
    format: &str,
    delay_ms: u64,
) -> Result<CaptureResult, String> {
    if delay_ms > 0 {
        tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
    }

    let target_path = generate_file_path(save_dir, format);
    let interactive = matches!(mode, CaptureMode::Region | CaptureMode::Window);

    capture_with_xdg_portal(interactive, &target_path).await?;

    if !target_path.exists() {
        return Err("Screenshot file was not created".to_string());
    }

    let img = image::open(&target_path).map_err(|e| format!("Failed to read captured image: {}", e))?;
    let (width, height) = img.dimensions();
    let metadata = fs::metadata(&target_path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();

    let file_bytes = fs::read(&target_path).map_err(|e| e.to_string())?;
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &file_bytes);
    let mime = match format {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    };
    let data_url = format!("data:{};base64,{}", mime, b64);

    let id = uuid::Uuid::new_v4().to_string();
    let file_name = target_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    Ok(CaptureResult {
        id,
        file_path: target_path.to_string_lossy().to_string(),
        file_name,
        file_size,
        width,
        height,
        timestamp: Local::now().timestamp(),
        data_url,
        format: format.to_string(),
    })
}

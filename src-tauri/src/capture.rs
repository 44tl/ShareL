use arboard::Clipboard;
use ashpd::desktop::screenshot::Screenshot;
use chrono::Local;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

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

fn try_capture_with_gnome_shell(target_path: &Path) -> Result<(), String> {
    let output = Command::new("gnome-screenshot")
        .args(["-f", target_path.to_str().unwrap_or_default()])
        .output();

    if let Ok(o) = output {
        if o.status.success() && target_path.exists() {
            return Ok(());
        }
    }
    Err("gnome-screenshot unavailable or failed".to_string())
}

fn try_capture_with_grim(mode: &CaptureMode, target_path: &Path) -> Result<(), String> {
    match mode {
        CaptureMode::Region => {
            let slurp_output = Command::new("slurp")
                .args(["-d", "-b", "#00000088", "-c", "#8ab4f8ff", "-w", "2"])
                .output()
                .map_err(|e| format!("Failed to run slurp: {}", e))?;

            if !slurp_output.status.success() {
                return Err("Region selection cancelled".to_string());
            }

            let geometry = String::from_utf8_lossy(&slurp_output.stdout).trim().to_string();
            if geometry.is_empty() {
                return Err("No region selected".to_string());
            }

            let grim_output = Command::new("grim")
                .arg("-g")
                .arg(&geometry)
                .arg(target_path)
                .output()
                .map_err(|e| format!("Failed to run grim: {}", e))?;

            if !grim_output.status.success() {
                return Err(format!("Grim error: {}", String::from_utf8_lossy(&grim_output.stderr)));
            }
            Ok(())
        }
        CaptureMode::Fullscreen | CaptureMode::ActiveScreen => {
            let grim_output = Command::new("grim")
                .arg(target_path)
                .output()
                .map_err(|e| format!("Failed to run grim: {}", e))?;

            if !grim_output.status.success() {
                return Err(format!("Grim error: {}", String::from_utf8_lossy(&grim_output.stderr)));
            }
            Ok(())
        }
        CaptureMode::Window => {
            let slurp_output = Command::new("slurp")
                .args(["-d", "-b", "#00000088", "-c", "#8ab4f8ff", "-w", "2"])
                .output()
                .map_err(|e| format!("Failed to run slurp: {}", e))?;

            if !slurp_output.status.success() {
                return Err("Window selection cancelled".to_string());
            }

            let geometry = String::from_utf8_lossy(&slurp_output.stdout).trim().to_string();
            let grim_output = Command::new("grim")
                .arg("-g")
                .arg(&geometry)
                .arg(target_path)
                .output()
                .map_err(|e| format!("Failed to run grim: {}", e))?;

            if !grim_output.status.success() {
                return Err(format!("Grim error: {}", String::from_utf8_lossy(&grim_output.stderr)));
            }
            Ok(())
        }
    }
}

async fn capture_with_xdg_portal(interactive: bool, target_path: &Path) -> Result<(), String> {
    let req = Screenshot::request().interactive(interactive).modal(false);
    let response = req
        .send()
        .await
        .map_err(|e| format!("XDG Desktop Portal error: {}", e))?
        .response()
        .map_err(|e| format!("XDG Desktop Portal response error: {}", e))?;

    let uri = response.uri();
    let temp_path = uri
        .to_file_path()
        .map_err(|_| "Failed to parse portal file URI".to_string())?;

    if !temp_path.exists() {
        return Err("Portal did not produce screenshot file".to_string());
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).ok();
    }

    fs::copy(&temp_path, target_path).map_err(|e| format!("Failed to copy screenshot to destination: {}", e))?;
    Ok(())
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
    let mut captured = false;

    if try_capture_with_grim(&mode, &target_path).is_ok() {
        captured = true;
    }

    if !captured && matches!(mode, CaptureMode::Fullscreen | CaptureMode::ActiveScreen) {
        if try_capture_with_gnome_shell(&target_path).is_ok() {
            captured = true;
        }
    }

    if !captured {
        let interactive = matches!(mode, CaptureMode::Region | CaptureMode::Window);
        capture_with_xdg_portal(interactive, &target_path).await?;
    }

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

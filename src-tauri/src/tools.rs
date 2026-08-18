use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorResult {
    pub hex: String,
    pub rgb: String,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    pub success: bool,
    pub text: String,
    pub error: Option<String>,
}

pub fn save_annotated_image(
    data_url: &str,
    save_dir: &str,
    original_path: Option<String>,
    format: &str,
) -> Result<String, String> {
    let base64_prefix = "base64,";
    let b64_idx = data_url.find(base64_prefix).ok_or("Invalid image data url")?;
    let b64_str = &data_url[b64_idx + base64_prefix.len()..];

    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64_str)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    let out_path = if let Some(orig) = original_path {
        let orig_p = PathBuf::from(orig);
        if orig_p.parent().is_some() {
            orig_p
        } else {
            let mut dir = PathBuf::from(save_dir);
            dir.push(orig_p.file_name().unwrap_or_default());
            dir
        }
    } else {
        let now = chrono::Local::now();
        let mut dir = PathBuf::from(save_dir);
        fs::create_dir_all(&dir).ok();
        dir.push(format!("ShareL_Edited_{}.{}", now.format("%Y-%m-%d_%H-%M-%S"), format));
        dir
    };

    if let Some(parent) = out_path.parent() {
        fs::create_dir_all(parent).ok();
    }

    fs::write(&out_path, bytes).map_err(|e| format!("Failed to write edited image: {}", e))?;
    Ok(out_path.to_string_lossy().to_string())
}

pub fn extract_text_ocr(image_path: &str) -> OcrResult {
    let has_tess = Command::new("which").arg("tesseract").output().map(|o| o.status.success()).unwrap_or(false);

    if !has_tess {
        return OcrResult {
            success: false,
            text: String::new(),
            error: Some("Tesseract OCR is not installed. Install it with your package manager: sudo pacman -S tesseract".to_string()),
        };
    }

    let output = Command::new("tesseract")
        .arg(image_path)
        .arg("stdout")
        .output();

    match output {
        Ok(out) => {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
                OcrResult {
                    success: true,
                    text,
                    error: None,
                }
            } else {
                let err = String::from_utf8_lossy(&out.stderr).to_string();
                OcrResult {
                    success: false,
                    text: String::new(),
                    error: Some(err),
                }
            }
        }
        Err(e) => OcrResult {
            success: false,
            text: String::new(),
            error: Some(e.to_string()),
        },
    }
}

pub fn show_in_folder(path_str: &str) -> Result<(), String> {
    let p = Path::new(path_str);
    if let Some(parent) = p.parent() {
        open::that(parent).map_err(|e| e.to_string())
    } else {
        open::that(p).map_err(|e| e.to_string())
    }
}

pub fn open_url_browser(url: &str) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

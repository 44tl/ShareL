use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    pub success: bool,
    pub text: String,
    pub error: Option<String>,
}

pub fn read_file_as_data_url(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        _ => "image/png",
    };

    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
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

pub fn show_in_folder(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    let target_dir = if p.is_dir() {
        p.to_path_buf()
    } else if let Some(parent) = p.parent() {
        if parent.as_os_str().is_empty() {
            PathBuf::from(".")
        } else {
            parent.to_path_buf()
        }
    } else {
        PathBuf::from(path)
    };

    if let Ok(abs_path) = fs::canonicalize(p) {
        let uri = format!("file://{}", abs_path.to_string_lossy());
        if let Ok(out) = Command::new("dbus-send")
            .args([
                "--session",
                "--dest=org.freedesktop.FileManager1",
                "--type=method_call",
                "/org/freedesktop/FileManager1",
                "org.freedesktop.FileManager1.ShowItems",
                &format!("array:string:{}", uri),
                "string:\"\"",
            ])
            .output()
        {
            if out.status.success() {
                return Ok(());
            }
        }
    }

    let dir_str = target_dir.to_string_lossy().to_string();

    if let Ok(out) = Command::new("xdg-open").arg(&dir_str).spawn() {
        let _ = out;
        return Ok(());
    }

    if let Ok(out) = Command::new("gio").args(["open", &dir_str]).spawn() {
        let _ = out;
        return Ok(());
    }

    open::that(&target_dir).map_err(|e| e.to_string())
}

pub fn open_url_browser(url: &str) -> Result<(), String> {
    if let Ok(out) = Command::new("xdg-open").arg(url).spawn() {
        let _ = out;
        return Ok(());
    }
    open::that(url).map_err(|e| e.to_string())
}

pub fn extract_text_ocr(image_path: &str) -> OcrResult {
    let output = Command::new("tesseract")
        .arg(image_path)
        .arg("stdout")
        .arg("-l")
        .arg("eng")
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
                let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
                OcrResult {
                    success: false,
                    text: String::new(),
                    error: Some(if err.is_empty() {
                        "Tesseract OCR failed".to_string()
                    } else {
                        err
                    }),
                }
            }
        }
        Err(e) => OcrResult {
            success: false,
            text: String::new(),
            error: Some(format!("Tesseract not found: {}", e)),
        },
    }
}

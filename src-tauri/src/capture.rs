use crate::environment::{detect_backends, detect_compositor, CompositorKind};
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
    pub backend_used: String,
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
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        if let Ok(mut child) = Command::new("wl-copy")
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

async fn capture_with_grim_slurp(mode: &CaptureMode, target_path: &Path) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).ok();
    }

    let mut cmd = Command::new("grim");
    match mode {
        CaptureMode::Region => {
            let slurp_out = Command::new("slurp")
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
        CaptureMode::Window => {
            // Check if compositor CLI can assist in window geometry
            let (compositor, _) = detect_compositor();
            let mut region_found = false;

            if compositor == CompositorKind::Hyprland {
                if let Ok(out) = Command::new("hyprctl").args(["activewindow", "-j"]).output() {
                    if out.status.success() {
                        if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                            if let (Some(at), Some(size)) = (val.get("at"), val.get("size")) {
                                if let (Some(x), Some(y), Some(w), Some(h)) = (
                                    at.get(0).and_then(|v| v.as_i64()),
                                    at.get(1).and_then(|v| v.as_i64()),
                                    size.get(0).and_then(|v| v.as_i64()),
                                    size.get(1).and_then(|v| v.as_i64()),
                                ) {
                                    cmd.arg("-g").arg(format!("{},{} {}x{}", x, y, w, h));
                                    region_found = true;
                                }
                            }
                        }
                    }
                }
            } else if compositor == CompositorKind::Sway {
                if let Ok(out) = Command::new("swaymsg").args(["-t", "get_tree"]).output() {
                    if out.status.success() {
                        if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                            fn find_focused(node: &serde_json::Value) -> Option<&serde_json::Value> {
                                if node.get("focused").and_then(|v| v.as_bool()).unwrap_or(false) {
                                    return Some(node);
                                }
                                if let Some(nodes) = node.get("nodes").and_then(|v| v.as_array()) {
                                    for n in nodes {
                                        if let Some(f) = find_focused(n) {
                                            return Some(f);
                                        }
                                    }
                                }
                                if let Some(floating) = node.get("floating_nodes").and_then(|v| v.as_array()) {
                                    for n in floating {
                                        if let Some(f) = find_focused(n) {
                                            return Some(f);
                                        }
                                    }
                                }
                                None
                            }
                            if let Some(focused) = find_focused(&val) {
                                if let Some(rect) = focused.get("rect") {
                                    let x = rect.get("x").and_then(|v| v.as_i64()).unwrap_or(0);
                                    let y = rect.get("y").and_then(|v| v.as_i64()).unwrap_or(0);
                                    let w = rect.get("width").and_then(|v| v.as_i64()).unwrap_or(0);
                                    let h = rect.get("height").and_then(|v| v.as_i64()).unwrap_or(0);
                                    if w > 0 && h > 0 {
                                        cmd.arg("-g").arg(format!("{},{} {}x{}", x, y, w, h));
                                        region_found = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if !region_found {
                // Interactive window selection with slurp borders
                let slurp_out = Command::new("slurp")
                    .output()
                    .map_err(|e| format!("Failed to execute slurp for window select: {}", e))?;
                if !slurp_out.status.success() {
                    return Err("Window selection cancelled via slurp".to_string());
                }
                let region = String::from_utf8_lossy(&slurp_out.stdout).trim().to_string();
                if region.is_empty() {
                    return Err("Empty window region selected".to_string());
                }
                cmd.arg("-g").arg(region);
            }
        }
        CaptureMode::ActiveScreen | CaptureMode::Fullscreen => {}
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
            Err("XDG Portal succeeded but screenshot temp file could not be read".to_string())
        }
        Err(e) => Err(format!("XDG Desktop Portal screenshot error: {}", e)),
    }
}

async fn capture_with_compositor_native(
    compositor: &CompositorKind,
    mode: &CaptureMode,
    _target_path: &Path,
) -> Result<(), String> {
    match compositor {
        CompositorKind::Niri => {
            // Niri provides native actions: screenshot, screenshot-screen, screenshot-window
            // We can invoke niri msg action screenshot or leverage grim+slurp
            let action = match mode {
                CaptureMode::Region => "screenshot",
                CaptureMode::Window => "screenshot-window",
                CaptureMode::Fullscreen | CaptureMode::ActiveScreen => "screenshot-screen",
            };

            let out = Command::new("niri")
                .args(["msg", "action", action])
                .output()
                .map_err(|e| format!("Failed to invoke niri msg: {}", e))?;

            if out.status.success() {
                return Ok(());
            }
            Err("Niri screenshot action returned error".to_string())
        }
        _ => Err("Compositor native integration not available for this compositor".to_string()),
    }
}

pub async fn take_screenshot_with_backend(
    mode: CaptureMode,
    save_dir: &str,
    format: &str,
    delay_ms: u64,
    preferred_backend: Option<&str>,
) -> Result<CaptureResult, String> {
    if delay_ms > 0 {
        tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
    }

    let target_path = generate_file_path(save_dir, format);
    let interactive = matches!(mode, CaptureMode::Region | CaptureMode::Window);

    let (compositor, _) = detect_compositor();
    let backends = detect_backends(&compositor);

    let pref = preferred_backend.unwrap_or("auto");
    let mut used_backend = "unknown".to_string();
    let mut captured = false;

    // Strategy 1: If user prefers grim/slurp or on wlroots/Niri/Hyprland/Sway with grim+slurp available
    if (pref == "grim_slurp" || pref == "auto") && backends.grim && (backends.slurp || !interactive) {
        if let Ok(()) = capture_with_grim_slurp(&mode, &target_path).await {
            used_backend = "grim/slurp".to_string();
            captured = true;
        }
    }

    // Strategy 2: If user prefers XDG Portal or grim/slurp failed
    if !captured && (pref == "xdg_desktop_portal" || pref == "auto") && backends.xdg_desktop_portal {
        if let Ok(()) = capture_with_xdg_portal(interactive, &target_path).await {
            used_backend = "xdg-desktop-portal".to_string();
            captured = true;
        }
    }

    // Strategy 3: Native compositor action fallback (e.g. Niri)
    if !captured && (pref == "compositor" || pref == "auto") && backends.compositor_integration {
        if let Ok(()) = capture_with_compositor_native(&compositor, &mode, &target_path).await {
            used_backend = format!("{}-native", backends.compositor_cli_name.unwrap_or_else(|| "compositor".to_string()));
            captured = true;
        }
    }

    // Final fallback: try grim/slurp unconditionally if Wayland is active
    if !captured && std::env::var("WAYLAND_DISPLAY").is_ok() && backends.grim {
        if let Ok(()) = capture_with_grim_slurp(&mode, &target_path).await {
            used_backend = "grim/slurp".to_string();
            captured = true;
        }
    }

    // Final fallback: try XDG Desktop Portal unconditionally
    if !captured {
        if let Ok(()) = capture_with_xdg_portal(interactive, &target_path).await {
            used_backend = "xdg-desktop-portal".to_string();
            captured = true;
        }
    }

    if !captured || !target_path.exists() {
        return Err("Screenshot capture failed across all backends (XDG Portal, grim/slurp, and compositor native)".to_string());
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
        backend_used: used_backend,
    })
}

pub async fn take_screenshot(
    mode: CaptureMode,
    save_dir: &str,
    format: &str,
    delay_ms: u64,
) -> Result<CaptureResult, String> {
    take_screenshot_with_backend(mode, save_dir, format, delay_ms, None).await
}

use serde::{Deserialize, Serialize};
use std::env;
use std::process::Command;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompositorKind {
    Niri,
    Hyprland,
    Sway,
    Gnome,
    KdePlasma,
    Cosmic,
    GenericWayland,
    X11,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendAvailability {
    pub xdg_desktop_portal: bool,
    pub grim: bool,
    pub slurp: bool,
    pub gpu_screen_recorder: bool,
    pub wf_recorder: bool,
    pub ffmpeg: bool,
    pub compositor_integration: bool,
    pub compositor_cli_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEnvironmentInfo {
    pub compositor: CompositorKind,
    pub compositor_name: String,
    pub session_type: String,
    pub wayland_display: Option<String>,
    pub backends: BackendAvailability,
    pub preferred_screenshot_backend: String,
    pub preferred_recording_backend: String,
}

fn command_exists(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn detect_compositor() -> (CompositorKind, String) {
    if env::var_os("NIRI_SOCKET").is_some() {
        return (CompositorKind::Niri, "Niri (Scrollable Tiling)".to_string());
    }

    let desktop = env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_lowercase();
    let session = env::var("DESKTOP_SESSION").unwrap_or_default().to_lowercase();
    let gdm_session = env::var("GDMSESSION").unwrap_or_default().to_lowercase();

    if desktop.contains("niri") || session.contains("niri") || gdm_session.contains("niri") {
        return (CompositorKind::Niri, "Niri (Scrollable Tiling)".to_string());
    }

    if env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some()
        || env::var_os("HYPRLAND_CMD").is_some()
        || desktop.contains("hyprland")
        || session.contains("hyprland")
    {
        return (CompositorKind::Hyprland, "Hyprland (Dynamic Tiling)".to_string());
    }

    if env::var_os("SWAYSOCK").is_some() || desktop.contains("sway") || session.contains("sway") {
        return (CompositorKind::Sway, "Sway (i3-compatible Wayland)".to_string());
    }

    if desktop.contains("cosmic") || session.contains("cosmic") || env::var_os("COSMIC_DATA_CONTROL").is_some() {
        return (CompositorKind::Cosmic, "COSMIC (Pop!_OS / Rust)".to_string());
    }

    if env::var("KDE_FULL_SESSION").map(|v| v == "true").unwrap_or(false)
        || desktop.contains("kde")
        || desktop.contains("plasma")
        || session.contains("plasma")
    {
        return (CompositorKind::KdePlasma, "KDE Plasma (KWin)".to_string());
    }

    if desktop.contains("gnome")
        || session.contains("gnome")
        || gdm_session.contains("gnome")
        || env::var_os("GNOME_DESKTOP_SESSION_ID").is_some()
    {
        return (CompositorKind::Gnome, "GNOME (Mutter)".to_string());
    }

    if env::var_os("WAYLAND_DISPLAY").is_some()
        || env::var("XDG_SESSION_TYPE").map(|v| v.to_lowercase() == "wayland").unwrap_or(false)
    {
        return (CompositorKind::GenericWayland, "Generic Wayland Compositor".to_string());
    }

    if env::var_os("DISPLAY").is_some()
        || env::var("XDG_SESSION_TYPE").map(|v| v.to_lowercase() == "x11").unwrap_or(false)
    {
        return (CompositorKind::X11, "X11 Display Server".to_string());
    }

    (CompositorKind::Unknown, "Unknown Environment".to_string())
}

pub fn detect_backends(compositor: &CompositorKind) -> BackendAvailability {
    let has_grim = command_exists("grim");
    let has_slurp = command_exists("slurp");
    let has_gpu_rec = command_exists("gpu-screen-recorder");
    let has_wf_rec = command_exists("wf-recorder");
    let has_ffmpeg = command_exists("ffmpeg");

    let (comp_int, comp_cli) = match compositor {
        CompositorKind::Niri => {
            let exists = command_exists("niri");
            (exists, if exists { Some("niri msg".to_string()) } else { None })
        }
        CompositorKind::Hyprland => {
            let exists = command_exists("hyprctl");
            (exists, if exists { Some("hyprctl".to_string()) } else { None })
        }
        CompositorKind::Sway => {
            let exists = command_exists("swaymsg");
            (exists, if exists { Some("swaymsg".to_string()) } else { None })
        }
        CompositorKind::Cosmic => {
            let exists = command_exists("cosmic-screenshot") || command_exists("cosmic-comp");
            (exists, if exists { Some("cosmic-comp".to_string()) } else { None })
        }
        CompositorKind::Gnome => {
            let exists = command_exists("gnome-screenshot");
            (exists, if exists { Some("gnome-screenshot".to_string()) } else { None })
        }
        CompositorKind::KdePlasma => {
            let exists = command_exists("spectacle");
            (exists, if exists { Some("spectacle".to_string()) } else { None })
        }
        _ => (false, None),
    };

    let has_portal = env::var_os("WAYLAND_DISPLAY").is_some() || env::var_os("DISPLAY").is_some();

    BackendAvailability {
        xdg_desktop_portal: has_portal,
        grim: has_grim,
        slurp: has_slurp,
        gpu_screen_recorder: has_gpu_rec,
        wf_recorder: has_wf_rec,
        ffmpeg: has_ffmpeg,
        compositor_integration: comp_int,
        compositor_cli_name: comp_cli,
    }
}

pub fn get_system_environment_info(
    pref_screenshot: Option<&str>,
    pref_recording: Option<&str>,
) -> SystemEnvironmentInfo {
    let (compositor, compositor_name) = detect_compositor();
    let backends = detect_backends(&compositor);

    let session_type = match compositor {
        CompositorKind::X11 => "x11".to_string(),
        CompositorKind::Unknown => "unknown".to_string(),
        _ => "wayland".to_string(),
    };

    let wayland_display = env::var("WAYLAND_DISPLAY").ok();

    let preferred_screenshot = pref_screenshot
        .filter(|s| !s.is_empty() && *s != "auto")
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            if backends.grim && backends.slurp && matches!(compositor, CompositorKind::Niri | CompositorKind::Hyprland | CompositorKind::Sway | CompositorKind::GenericWayland) {
                "grim_slurp".to_string()
            } else if backends.xdg_desktop_portal {
                "xdg_desktop_portal".to_string()
            } else if backends.grim {
                "grim_slurp".to_string()
            } else {
                "compositor_native".to_string()
            }
        });

    let preferred_recording = pref_recording
        .filter(|s| !s.is_empty() && *s != "auto")
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            if backends.gpu_screen_recorder {
                "gpu-screen-recorder".to_string()
            } else if backends.wf_recorder {
                "wf-recorder".to_string()
            } else if backends.ffmpeg {
                "ffmpeg".to_string()
            } else {
                "none".to_string()
            }
        });

    SystemEnvironmentInfo {
        compositor,
        compositor_name,
        session_type,
        wayland_display,
        backends,
        preferred_screenshot_backend: preferred_screenshot,
        preferred_recording_backend: preferred_recording,
    }
}

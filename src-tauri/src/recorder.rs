use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
#[cfg(unix)]
use std::os::unix::process::CommandExt;

static RECORDING_PROCESS: Mutex<Option<RecordingState>> = Mutex::new(None);

pub struct RecordingState {
    pub child: Child,
    pub output_path: PathBuf,
    pub start_time: i64,
    pub format: String,
    pub is_gif: bool,
    pub fps: u32,
    pub backend: String,
    pub is_paused: bool,
    pub mode: String,
    pub codec: String,
    pub auto_upload: bool,
    pub temp_video_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingOptions {
    pub recordings_dir: String,
    pub format: String,
    pub fps: u32,
    pub bitrate_kbps: Option<u32>,
    pub codec: Option<String>,
    pub audio_source: Option<String>,
    pub record_microphone: bool,
    pub record_system_audio: bool,
    pub separate_audio_tracks: bool,
    pub capture_cursor: bool,
    pub highlight_cursor: bool,
    pub webcam_device: Option<String>,
    pub webcam_position: Option<String>,
    pub mode: String,
    pub region_geometry: Option<String>,
    pub preferred_backend: Option<String>,
    pub filename_template: Option<String>,
    pub auto_upload: bool,
}

impl Default for RecordingOptions {
    fn default() -> Self {
        Self {
            recordings_dir: String::new(),
            format: "mp4".to_string(),
            fps: 60,
            bitrate_kbps: Some(8000),
            codec: Some("h264".to_string()),
            audio_source: Some("none".to_string()),
            record_microphone: false,
            record_system_audio: false,
            separate_audio_tracks: false,
            capture_cursor: true,
            highlight_cursor: false,
            webcam_device: None,
            webcam_position: Some("bottom_right".to_string()),
            mode: "fullscreen".to_string(),
            region_geometry: None,
            preferred_backend: Some("auto".to_string()),
            filename_template: Some("ShareL_Rec_{date}_{time}".to_string()),
            auto_upload: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStatus {
    pub is_recording: bool,
    pub is_paused: bool,
    pub is_processing: bool,
    pub duration_seconds: u64,
    pub output_path: Option<String>,
    pub format: Option<String>,
    pub backend: Option<String>,
    pub fps: u32,
    pub mode: String,
    pub codec: String,
    pub auto_upload: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingResult {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub duration_seconds: u64,
    pub format: String,
    pub timestamp: i64,
    pub backend_used: String,
    pub auto_upload: bool,
    pub is_processing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingProcessingEvent {
    pub id: String,
    pub file_name: String,
    pub format: String,
    pub message: String,
}

pub fn list_webcam_devices() -> Vec<String> {
    let mut devices = Vec::new();
    if let Ok(entries) = fs::read_dir("/dev") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("video") {
                devices.push(format!("/dev/{}", name));
            }
        }
    }
    devices.sort();
    devices
}

pub fn detect_window_geometry() -> Result<String, String> {
    let (compositor, _) = crate::environment::detect_compositor();
    match compositor {
        crate::environment::CompositorKind::Hyprland => {
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
                                if w > 0 && h > 0 {
                                    return Ok(format!("{},{} {}x{}", x, y, w, h));
                                }
                            }
                        }
                    }
                }
            }
        }
        crate::environment::CompositorKind::Sway => {
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
                                    return Ok(format!("{},{} {}x{}", x, y, w, h));
                                }
                            }
                        }
                    }
                }
            }
        }
        crate::environment::CompositorKind::Niri => {
            if let Ok(out) = Command::new("niri").args(["msg", "-j", "focused-window"]).output() {
                if out.status.success() {
                    if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                        if let (Some(x), Some(y), Some(w), Some(h)) = (
                            val.get("x").and_then(|v| v.as_i64()),
                            val.get("y").and_then(|v| v.as_i64()),
                            val.get("width").and_then(|v| v.as_i64()),
                            val.get("height").and_then(|v| v.as_i64()),
                        ) {
                            if w > 0 && h > 0 {
                                return Ok(format!("{},{} {}x{}", x, y, w, h));
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }

    let slurp_out = Command::new("slurp")
        .output()
        .map_err(|e| format!("Failed to execute slurp for window detection: {}", e))?;
    if !slurp_out.status.success() {
        return Err("Window selection cancelled via slurp".to_string());
    }
    let region = String::from_utf8_lossy(&slurp_out.stdout).trim().to_string();
    if region.is_empty() {
        return Err("Empty window region selected".to_string());
    }
    Ok(region)
}

fn format_geometry_for_gsr(geom: &str) -> String {
    let trimmed = geom.trim();
    if trimmed.contains('+') {
        return trimmed.to_string();
    }
    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() == 2 {
        let pos_part = parts[0];
        let size_part = parts[1];
        let pos_coords: Vec<&str> = pos_part.split(',').collect();
        if pos_coords.len() == 2 {
            let x = pos_coords[0];
            let y = pos_coords[1];
            return format!("{}+{}+{}", size_part, x, y);
        }
    }
    trimmed.to_string()
}

pub fn parse_filename_template(template: &str, format: &str, fps: u32, codec: &str, mode: &str) -> String {
    let now = Local::now();
    let name = template
        .replace("{date}", &now.format("%Y-%m-%d").to_string())
        .replace("{time}", &now.format("%H-%M-%S").to_string())
        .replace("{timestamp}", &now.timestamp().to_string())
        .replace("{fps}", &fps.to_string())
        .replace("{codec}", codec)
        .replace("{mode}", mode)
        .replace("{format}", format);

    let ext = format!(".{}", format);
    if name.ends_with(&ext) {
        name
    } else {
        format!("{}{}", name, ext)
    }
}

pub fn get_recording_status() -> RecordingStatus {
    let state = RECORDING_PROCESS.lock().unwrap();
    if let Some(ref r) = *state {
        let duration = (Local::now().timestamp() - r.start_time).max(0) as u64;
        RecordingStatus {
            is_recording: true,
            is_paused: r.is_paused,
            is_processing: false,
            duration_seconds: duration,
            output_path: Some(r.output_path.to_string_lossy().to_string()),
            format: Some(r.format.clone()),
            backend: Some(r.backend.clone()),
            fps: r.fps,
            mode: r.mode.clone(),
            codec: r.codec.clone(),
            auto_upload: r.auto_upload,
        }
    } else {
        RecordingStatus {
            is_recording: false,
            is_paused: false,
            is_processing: false,
            duration_seconds: 0,
            output_path: None,
            format: None,
            backend: None,
            fps: 60,
            mode: "fullscreen".to_string(),
            codec: "h264".to_string(),
            auto_upload: false,
        }
    }
}

pub fn pause_recording() -> Result<(), String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    if let Some(ref mut state) = *state_lock {
        if state.is_paused {
            return Err("Recording is already paused".to_string());
        }
        #[cfg(unix)]
        {
            let pid = state.child.id() as i32;
            if pid > 1 {
                let res = unsafe { libc::kill(pid, libc::SIGSTOP) };
                if res != 0 {
                    return Err("Failed to pause recording process".to_string());
                }
            }
        }
        state.is_paused = true;
        Ok(())
    } else {
        Err("No active recording to pause".to_string())
    }
}

pub fn resume_recording() -> Result<(), String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    if let Some(ref mut state) = *state_lock {
        if !state.is_paused {
            return Err("Recording is not paused".to_string());
        }
        #[cfg(unix)]
        {
            let pid = state.child.id() as i32;
            if pid > 1 {
                let res = unsafe { libc::kill(pid, libc::SIGCONT) };
                if res != 0 {
                    return Err("Failed to resume recording process".to_string());
                }
            }
        }
        state.is_paused = false;
        Ok(())
    } else {
        Err("No active recording to resume".to_string())
    }
}

pub fn start_recording_advanced(options: RecordingOptions) -> Result<(), String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    if state_lock.is_some() {
        return Err("A recording is already in progress".to_string());
    }

    let dir = PathBuf::from(if options.recordings_dir.is_empty() {
        dirs::video_dir()
            .unwrap_or_else(|| PathBuf::from("./Recordings"))
            .join("ShareL")
            .to_string_lossy()
            .to_string()
    } else {
        options.recordings_dir.clone()
    });

    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    let now = Local::now();
    let is_gif = options.format.eq_ignore_ascii_case("gif");
    let target_format = if is_gif { "gif" } else { &options.format };
    let raw_codec = options.codec.unwrap_or_else(|| "h264".to_string()).to_lowercase();
    let target_fps = options.fps.clamp(15, 240);

    let template = options.filename_template.unwrap_or_else(|| "ShareL_Rec_{date}_{time}".to_string());
    let filename = parse_filename_template(&template, target_format, target_fps, &raw_codec, &options.mode);
    let final_path = dir.join(filename);

    let temp_video_path = if is_gif {
        Some(std::env::temp_dir().join(format!("sharel_rec_{}.mp4", uuid::Uuid::new_v4())))
    } else {
        None
    };

    let record_target = if let Some(ref p) = temp_video_path {
        p.to_string_lossy().to_string()
    } else {
        final_path.to_string_lossy().to_string()
    };

    let mut final_geometry = options.region_geometry.clone();
    if options.mode.to_lowercase() == "window" && final_geometry.is_none() {
        if let Ok(geom) = detect_window_geometry() {
            final_geometry = Some(geom);
        }
    } else if options.mode.to_lowercase() == "region" && final_geometry.is_none() {
        let slurp_out = Command::new("slurp")
            .output()
            .map_err(|e| format!("Failed to execute slurp: {}", e))?;
        if !slurp_out.status.success() {
            return Err("Region selection cancelled".to_string());
        }
        let region = String::from_utf8_lossy(&slurp_out.stdout).trim().to_string();
        if region.is_empty() {
            return Err("Empty region selected".to_string());
        }
        final_geometry = Some(region);
    }

    let has_gpu_recorder = Command::new("which")
        .arg("gpu-screen-recorder")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let has_wf = Command::new("which")
        .arg("wf-recorder")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let has_ffmpeg = Command::new("which")
        .arg("ffmpeg")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let pref = options.preferred_backend.as_deref().unwrap_or("auto");
    let bitrate_kbps = options.bitrate_kbps.unwrap_or(8000);

    let should_include_audio = options.record_microphone || options.record_system_audio || options.audio_source.as_deref().unwrap_or("none") != "none";

    let (child, backend_name) = if (pref == "gpu-screen-recorder" || (pref == "auto" && has_gpu_recorder)) && has_gpu_recorder {
        let mut cmd = Command::new("gpu-screen-recorder");

        if let Some(ref geom) = final_geometry {
            let gsr_region = format_geometry_for_gsr(geom);
            cmd.arg("-w").arg("region");
            cmd.arg("-region").arg(gsr_region);
        } else if options.mode.to_lowercase() == "window" {
            cmd.arg("-w").arg("focused");
        } else {
            cmd.arg("-w").arg("screen");
        }

        cmd.arg("-f").arg(target_fps.to_string());

        let gpu_codec = match raw_codec.as_str() {
            "hevc" | "h265" => "hevc",
            "av1" => "av1",
            "vp8" => "vp8",
            "vp9" => "vp9",
            _ => "h264",
        };
        cmd.arg("-k").arg(gpu_codec);

        let container = if target_format == "gif" {
            "mp4"
        } else {
            target_format
        };
        cmd.arg("-c").arg(container);

        let quality = if bitrate_kbps >= 15000 {
            "ultra"
        } else if bitrate_kbps >= 8000 {
            "very_high"
        } else if bitrate_kbps >= 5000 {
            "high"
        } else if bitrate_kbps >= 2500 {
            "medium"
        } else {
            "low"
        };
        cmd.arg("-q").arg(quality);

        if options.capture_cursor {
            cmd.arg("-cursor").arg("yes");
        } else {
            cmd.arg("-cursor").arg("no");
        }

        cmd.arg("-o").arg(&record_target);

        if options.record_system_audio && options.record_microphone {
            cmd.arg("-a").arg("default_output").arg("-a").arg("default_input");
        } else if options.record_microphone || options.audio_source.as_deref() == Some("microphone") {
            cmd.arg("-a").arg("default_input");
        } else if options.record_system_audio || options.audio_source.as_deref() == Some("system") || should_include_audio {
            cmd.arg("-a").arg("default_output");
        }

        #[cfg(unix)]
        cmd.process_group(0);

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn gpu-screen-recorder: {}", e))?;
        (child, "gpu-screen-recorder".to_string())
    } else if (pref == "wf-recorder" || (pref == "auto" && has_wf) || (!has_gpu_recorder && has_wf)) && has_wf {
        let mut cmd = Command::new("wf-recorder");
        cmd.arg("-f").arg(&record_target);
        cmd.arg("-r").arg(target_fps.to_string());

        let wf_codec = match raw_codec.as_str() {
            "hevc" | "h265" => "libx265",
            "av1" => "libsvtav1",
            "vp9" => "libvpx-vp9",
            _ => "libx264",
        };
        cmd.arg("-c").arg(wf_codec);
        cmd.arg("-b").arg(format!("{}k", bitrate_kbps));

        if let Some(ref geom) = final_geometry {
            if !geom.trim().is_empty() {
                cmd.arg("-g").arg(geom);
            }
        }

        if !options.capture_cursor {
            cmd.arg("--no-cursor");
        }

        if should_include_audio {
            cmd.arg("-a");
        }

        #[cfg(unix)]
        cmd.process_group(0);

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn wf-recorder: {}", e))?;
        (child, "wf-recorder".to_string())
    } else if has_ffmpeg {
        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y");

        let display = std::env::var("DISPLAY").unwrap_or_else(|_| ":0.0".to_string());
        cmd.arg("-f").arg("x11grab");
        cmd.arg("-r").arg(target_fps.to_string());

        if let Some(ref geom) = final_geometry {
            if let Some((offset, size)) = geom.split_once(' ') {
                cmd.arg("-video_size").arg(size);
                if let Some((x, y)) = offset.split_once(',') {
                    cmd.arg("-grab_x").arg(x);
                    cmd.arg("-grab_y").arg(y);
                }
            }
        }

        if !options.capture_cursor {
            cmd.arg("-draw_mouse").arg("0");
        }

        cmd.arg("-i").arg(&display);

        if should_include_audio {
            cmd.arg("-f").arg("pulse").arg("-i").arg("default");
        }

        let ff_codec = match raw_codec.as_str() {
            "hevc" | "h265" => "libx265",
            "av1" => "libsvtav1",
            "vp9" => "libvpx-vp9",
            _ => "libx264",
        };
        cmd.arg("-c:v").arg(ff_codec);
        cmd.arg("-b:v").arg(format!("{}k", bitrate_kbps));
        cmd.arg("-preset").arg("ultrafast");
        cmd.arg(&record_target);

        #[cfg(unix)]
        cmd.process_group(0);

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn ffmpeg recorder: {}", e))?;
        (child, "ffmpeg".to_string())
    } else {
        return Err("No supported screen recorder backend (gpu-screen-recorder, wf-recorder, or ffmpeg) found on this system.".to_string());
    };

    *state_lock = Some(RecordingState {
        child,
        output_path: final_path,
        start_time: now.timestamp(),
        format: target_format.to_string(),
        is_gif,
        fps: target_fps,
        backend: backend_name,
        is_paused: false,
        mode: options.mode,
        codec: raw_codec,
        auto_upload: options.auto_upload,
        temp_video_path,
    });

    Ok(())
}

pub fn start_recording(
    recordings_dir: &str,
    format: &str,
    fps: u32,
    include_audio: bool,
    region: Option<String>,
    preferred_backend: Option<&str>,
) -> Result<(), String> {
    start_recording_advanced(RecordingOptions {
        recordings_dir: recordings_dir.to_string(),
        format: format.to_string(),
        fps,
        bitrate_kbps: Some(8000),
        codec: Some("h264".to_string()),
        audio_source: if include_audio { Some("system".to_string()) } else { Some("none".to_string()) },
        record_microphone: false,
        record_system_audio: include_audio,
        separate_audio_tracks: false,
        capture_cursor: true,
        highlight_cursor: false,
        webcam_device: None,
        webcam_position: Some("bottom_right".to_string()),
        mode: if region.is_some() { "region".to_string() } else { "fullscreen".to_string() },
        region_geometry: region,
        preferred_backend: preferred_backend.map(|s| s.to_string()),
        filename_template: Some("ShareL_Rec_{date}_{time}".to_string()),
        auto_upload: false,
    })
}

#[derive(Debug, Clone)]
pub struct StoppedRecordingState {
    pub id: String,
    pub output_path: PathBuf,
    pub duration_seconds: u64,
    pub format: String,
    pub is_gif: bool,
    pub fps: u32,
    pub backend: String,
    pub auto_upload: bool,
    pub temp_video_path: Option<PathBuf>,
    pub start_time: i64,
}

pub fn stop_recording_process() -> Result<StoppedRecordingState, String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    let mut state = state_lock.take().ok_or("No active recording to stop")?;

    #[cfg(unix)]
    {
        let pid = state.child.id() as i32;
        if pid > 1 {
            if let Ok(None) = state.child.try_wait() {
                if state.is_paused {
                    unsafe {
                        libc::kill(pid, libc::SIGCONT);
                    }
                }
                unsafe {
                    libc::kill(pid, libc::SIGINT);
                }
            }
        }
    }

    let start_wait = std::time::Instant::now();
    loop {
        match state.child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start_wait.elapsed().as_millis() > 3000 {
                    #[cfg(unix)]
                    {
                        let pid = state.child.id() as i32;
                        if pid > 1 {
                            unsafe {
                                libc::kill(pid, libc::SIGTERM);
                            }
                        }
                    }
                    let _ = state.child.wait();
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            Err(_) => break,
        }
    }

    let duration = (Local::now().timestamp() - state.start_time).max(1) as u64;

    Ok(StoppedRecordingState {
        id: uuid::Uuid::new_v4().to_string(),
        output_path: state.output_path,
        duration_seconds: duration,
        format: state.format,
        is_gif: state.is_gif,
        fps: state.fps,
        backend: state.backend,
        auto_upload: state.auto_upload,
        temp_video_path: state.temp_video_path,
        start_time: state.start_time,
    })
}

pub fn finalize_recording_sync(stopped: StoppedRecordingState) -> Result<RecordingResult, String> {
    if stopped.is_gif {
        if let Some(ref temp_mp4) = stopped.temp_video_path {
            if temp_mp4.exists() {
                let filter_graph = format!(
                    "fps={},scale=iw:ih:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff:reserve_transparent=0[p];[s1][p]paletteuse=dither=floyd_steinberg:diff_mode=rectangle",
                    stopped.fps
                );

                let _ = Command::new("ffmpeg")
                    .args([
                        "-y",
                        "-i",
                        temp_mp4.to_str().unwrap_or(""),
                        "-vf",
                        &filter_graph,
                        stopped.output_path.to_str().unwrap_or(""),
                    ])
                    .status();

                let _ = fs::remove_file(temp_mp4);
            }
        }
    }

    if !stopped.output_path.exists() {
        return Err("Recording output file was not produced.".to_string());
    }

    let metadata = fs::metadata(&stopped.output_path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    let file_name = stopped.output_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    Ok(RecordingResult {
        id: stopped.id,
        file_path: stopped.output_path.to_string_lossy().to_string(),
        file_name,
        file_size,
        duration_seconds: stopped.duration_seconds,
        format: stopped.format,
        timestamp: stopped.start_time,
        backend_used: stopped.backend,
        auto_upload: stopped.auto_upload,
        is_processing: false,
    })
}

pub fn stop_recording() -> Result<RecordingResult, String> {
    let stopped = stop_recording_process()?;
    finalize_recording_sync(stopped)
}

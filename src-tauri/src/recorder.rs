use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;

static RECORDING_PROCESS: Mutex<Option<RecordingState>> = Mutex::new(None);

pub struct RecordingState {
    pub child: Child,
    pub output_path: PathBuf,
    pub start_time: i64,
    pub format: String,
    pub is_gif: bool,
    pub fps: u32,
    pub backend: String,
    pub temp_video_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStatus {
    pub is_recording: bool,
    pub duration_seconds: u64,
    pub output_path: Option<String>,
    pub format: Option<String>,
    pub backend: Option<String>,
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
}

pub fn get_recording_status() -> RecordingStatus {
    let state = RECORDING_PROCESS.lock().unwrap();
    if let Some(ref r) = *state {
        let duration = (Local::now().timestamp() - r.start_time).max(0) as u64;
        RecordingStatus {
            is_recording: true,
            duration_seconds: duration,
            output_path: Some(r.output_path.to_string_lossy().to_string()),
            format: Some(r.format.clone()),
            backend: Some(r.backend.clone()),
        }
    } else {
        RecordingStatus {
            is_recording: false,
            duration_seconds: 0,
            output_path: None,
            format: None,
            backend: None,
        }
    }
}

pub fn start_recording(
    recordings_dir: &str,
    format: &str,
    fps: u32,
    include_audio: bool,
    region: Option<String>,
    preferred_backend: Option<&str>,
) -> Result<(), String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    if state_lock.is_some() {
        return Err("A recording is already in progress".to_string());
    }

    let dir = PathBuf::from(recordings_dir);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    let now = Local::now();
    let is_gif = format.eq_ignore_ascii_case("gif");
    let target_format = if is_gif { "gif" } else { format };
    let filename = format!("ShareL_Recording_{}.{}", now.format("%Y-%m-%d_%H-%M-%S"), target_format);
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

    let target_fps = fps.clamp(15, 60);

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

    let pref = preferred_backend.unwrap_or("auto");

    let (child, backend_name) = if (pref == "gpu-screen-recorder" || (pref == "auto" && has_gpu_recorder)) && has_gpu_recorder {
        let mut cmd = Command::new("gpu-screen-recorder");
        cmd.arg("-w").arg("screen");
        cmd.arg("-f").arg(target_fps.to_string());
        cmd.arg("-k").arg("h264");
        cmd.arg("-q").arg("ultra");
        cmd.arg("-o").arg(&record_target);
        if include_audio {
            cmd.arg("-a").arg("default_output");
        }
        let child = cmd.spawn().map_err(|e| format!("Failed to spawn gpu-screen-recorder: {}", e))?;
        (child, "gpu-screen-recorder".to_string())
    } else if (pref == "wf-recorder" || (pref == "auto" && has_wf) || (!has_gpu_recorder && has_wf)) && has_wf {
        let mut cmd = Command::new("wf-recorder");
        cmd.arg("-f").arg(&record_target);
        cmd.arg("-r").arg(target_fps.to_string());

        if let Some(geom) = region {
            if !geom.trim().is_empty() {
                cmd.arg("-g").arg(geom);
            }
        }

        if include_audio {
            cmd.arg("-a");
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn wf-recorder: {}", e))?;
        (child, "wf-recorder".to_string())
    } else if has_ffmpeg {
        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y");
        let display = std::env::var("DISPLAY").unwrap_or_else(|_| ":0.0".to_string());
        cmd.arg("-f").arg("x11grab");
        cmd.arg("-r").arg(target_fps.to_string());
        cmd.arg("-i").arg(&display);
        if include_audio {
            cmd.arg("-f").arg("pulse").arg("-i").arg("default");
        }
        cmd.arg("-c:v").arg("libx264").arg("-preset").arg("ultrafast");
        cmd.arg(&record_target);
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
        temp_video_path,
    });

    Ok(())
}

pub fn stop_recording() -> Result<RecordingResult, String> {
    let mut state_lock = RECORDING_PROCESS.lock().unwrap();
    let mut state = state_lock.take().ok_or("No active recording to stop")?;

    #[cfg(unix)]
    {
        let pid = state.child.id() as i32;
        unsafe {
            libc::kill(pid, libc::SIGINT);
        }
    }

    let _ = state.child.wait();

    let duration = (Local::now().timestamp() - state.start_time).max(1) as u64;

    if state.is_gif {
        if let Some(ref temp_mp4) = state.temp_video_path {
            if temp_mp4.exists() {
                let filter_graph = format!(
                    "fps={},scale=iw:ih:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff:reserve_transparent=0[p];[s1][p]paletteuse=dither=floyd_steinberg:diff_mode=rectangle",
                    state.fps
                );

                let _ = Command::new("ffmpeg")
                    .args([
                        "-y",
                        "-i",
                        temp_mp4.to_str().unwrap_or(""),
                        "-vf",
                        &filter_graph,
                        state.output_path.to_str().unwrap_or(""),
                    ])
                    .status();

                let _ = fs::remove_file(temp_mp4);
            }
        }
    }

    if !state.output_path.exists() {
        return Err("Recording output file was not produced.".to_string());
    }

    let metadata = fs::metadata(&state.output_path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();
    let file_name = state.output_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    Ok(RecordingResult {
        id: uuid::Uuid::new_v4().to_string(),
        file_path: state.output_path.to_string_lossy().to_string(),
        file_name,
        file_size,
        duration_seconds: duration,
        format: state.format,
        timestamp: state.start_time,
        backend_used: state.backend,
    })
}

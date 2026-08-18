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
    pub temp_video_path: Option<PathBuf>,
    pub start_time: i64,
    pub format: String,
    pub is_gif: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStatus {
    pub is_recording: bool,
    pub duration_seconds: u64,
    pub output_path: Option<String>,
    pub format: Option<String>,
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
        }
    } else {
        RecordingStatus {
            is_recording: false,
            duration_seconds: 0,
            output_path: None,
            format: None,
        }
    }
}

pub fn start_recording(
    recordings_dir: &str,
    format: &str,
    fps: u32,
    include_audio: bool,
    region: Option<String>,
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
        p.clone()
    } else {
        final_path.clone()
    };

    let mut cmd = Command::new("wf-recorder");
    cmd.arg("-f").arg(&record_target);
    cmd.arg("-r").arg(fps.to_string());

    if let Some(geom) = region {
        if !geom.trim().is_empty() {
            cmd.arg("-g").arg(geom);
        }
    }

    if include_audio {
        cmd.arg("-a");
    }

    let child = cmd.spawn().map_err(|e| {
        format!("Failed to spawn wf-recorder. Please ensure wf-recorder is installed: {}", e)
    })?;

    *state_lock = Some(RecordingState {
        child,
        output_path: final_path,
        temp_video_path,
        start_time: now.timestamp(),
        format: target_format.to_string(),
        is_gif,
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
                let palette_path = std::env::temp_dir().join("sharel_palette.png");

                let gen_status = Command::new("ffmpeg")
                    .args([
                        "-y",
                        "-i",
                        temp_mp4.to_str().unwrap_or(""),
                        "-vf",
                        "fps=15,scale=flags=lanczos,palettegen",
                        palette_path.to_str().unwrap_or(""),
                    ])
                    .status();

                if gen_status.map(|s| s.success()).unwrap_or(false) && palette_path.exists() {
                    Command::new("ffmpeg")
                        .args([
                            "-y",
                            "-i",
                            temp_mp4.to_str().unwrap_or(""),
                            "-i",
                            palette_path.to_str().unwrap_or(""),
                            "-lavfi",
                            "fps=15,scale=flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3",
                            state.output_path.to_str().unwrap_or(""),
                        ])
                        .status()
                        .ok();

                    fs::remove_file(palette_path).ok();
                } else {
                    Command::new("ffmpeg")
                        .args([
                            "-y",
                            "-i",
                            temp_mp4.to_str().unwrap_or(""),
                            "-vf",
                            "fps=12",
                            state.output_path.to_str().unwrap_or(""),
                        ])
                        .status()
                        .ok();
                }

                fs::remove_file(temp_mp4).ok();
            }
        }
    }

    if !state.output_path.exists() {
        return Err("Recording output file was not produced".to_string());
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
    })
}

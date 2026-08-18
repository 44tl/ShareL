use chrono::Local;
use gstreamer as gst;
use gstreamer::prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

static RECORDING_PIPELINE: Mutex<Option<RecordingState>> = Mutex::new(None);

pub struct RecordingState {
    pub pipeline: gst::Pipeline,
    pub output_path: PathBuf,
    pub start_time: i64,
    pub format: String,
    pub is_gif: bool,
    pub temp_video_path: Option<PathBuf>,
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
    let state = RECORDING_PIPELINE.lock().unwrap();
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
    _include_audio: bool,
    _region: Option<String>,
) -> Result<(), String> {
    let mut state_lock = RECORDING_PIPELINE.lock().unwrap();
    if state_lock.is_some() {
        return Err("A recording is already in progress".to_string());
    }

    gst::init().map_err(|e| format!("Failed to initialize GStreamer: {}", e))?;

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

    let framerate = fps.max(10).min(60);

    let pipe_str = format!(
        "pipewiresrc do-timestamp=true ! videoconvert ! videorate ! video/x-raw,framerate={}/1 ! x264enc tune=zerolatency speed-preset=ultrafast ! mp4mux ! filesink location=\"{}\"",
        framerate,
        record_target
    );

    let pipeline = gst::parse::launch(&pipe_str)
        .map_err(|e| format!("Failed to create GStreamer recording pipeline: {}", e))?
        .dynamic_cast::<gst::Pipeline>()
        .map_err(|_| "Failed to cast element to GStreamer Pipeline".to_string())?;

    pipeline
        .set_state(gst::State::Playing)
        .map_err(|e| format!("Failed to start recording stream: {:?}", e))?;

    *state_lock = Some(RecordingState {
        pipeline,
        output_path: final_path,
        start_time: now.timestamp(),
        format: target_format.to_string(),
        is_gif,
        temp_video_path,
    });

    Ok(())
}

pub fn stop_recording() -> Result<RecordingResult, String> {
    let mut state_lock = RECORDING_PIPELINE.lock().unwrap();
    let state = state_lock.take().ok_or("No active recording to stop")?;

    let _ = state.pipeline.send_event(gst::event::Eos::new());

    let bus = state.pipeline.bus().ok_or("Pipeline bus not available")?;
    for msg in bus.iter_timed(gst::ClockTime::from_seconds(3)) {
        if let gst::MessageView::Eos(..) = msg.view() {
            break;
        }
    }

    let _ = state.pipeline.set_state(gst::State::Null);

    let duration = (Local::now().timestamp() - state.start_time).max(1) as u64;

    if state.is_gif {
        if let Some(ref temp_mp4) = state.temp_video_path {
            if temp_mp4.exists() {
                let _ = std::process::Command::new("ffmpeg")
                    .args([
                        "-y",
                        "-i",
                        temp_mp4.to_str().unwrap_or(""),
                        "-vf",
                        "fps=15,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
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
    })
}

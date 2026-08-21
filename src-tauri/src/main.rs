use sharel_lib::capture::{
    copy_image_to_clipboard, copy_text_to_clipboard, take_screenshot_with_backend, CaptureMode,
};
use sharel_lib::config::load_config;
use sharel_lib::environment::get_system_environment_info;
use sharel_lib::history::{add_history_item, HistoryItem};
use sharel_lib::recorder::{start_recording_advanced, stop_recording, RecordingOptions};
use sharel_lib::tools::extract_text_ocr;
use sharel_lib::uploader::{execute_upload, list_custom_uploaders, resolve_active_uploader};
use std::env;
use std::path::Path;

fn print_help() {
    println!("ShareL - High Performance Screen Capture & Sharing for Linux (Wayland)\n");
    println!("USAGE:");
    println!("  sharel [COMMAND] [OPTIONS]\n");
    println!("COMMANDS:");
    println!("  gui                       Launch the interactive desktop interface (default)");
    println!("  capture, -c [MODE]        Take a screenshot (region, fullscreen, window, active)");
    println!("  record, -r [MODE]         Record video/GIF (fullscreen, region, window)");
    println!("  upload, -u [FILE]         Upload a file to the active or specified destination");
    println!("  ocr [FILE]                Extract text from an image using OCR");
    println!("  uploaders, -l             List all configured ShareX upload destinations");
    println!("  update [--check]          Check for and install updates from GitHub");
    println!("  revert, rollback [VER]    Rollback to previous version or install a specific release tag");
    println!("  ignore-version [VER]      Ignore a specific release version from prompting");
    println!("  unignore-version [VER]    Remove a version from the ignore list");
    println!("  versions, releases        List available ShareL releases on GitHub");
    println!("  info, doctor              Display detected Wayland compositor and capture backends");
    println!("  help, -h, --help          Print this help message\n");
    println!("CAPTURE OPTIONS:");
    println!("  --upload, -u              Upload capture immediately after taking it");
    println!("  --copy, -p                Copy capture image to clipboard (default: enabled in config)");
    println!("  --delay, -d [SECONDS]     Delay capture by specified seconds (e.g. -d 2)");
    println!("  --format, -f [FORMAT]     Image format: png, jpg, webp (default: png)");
    println!("  --backend, -b [BACKEND]   Override backend: auto, grim_slurp, xdg_desktop_portal, compositor");
    println!("  --uploader [ID]           Specific destination ID to upload to\n");
    println!("RECORDING OPTIONS:");
    println!("  --fps [FPS]               Framerate: 30, 60, 120 (default: 60)");
    println!("  --codec [CODEC]           Video codec: h264, hevc, av1, vp9 (default: h264)");
    println!("  --format, -f [FORMAT]     Output format: mp4, mkv, webm, gif (default: mp4)");
    println!("  --audio [SOURCE]          Audio source: none, mic, system, both (default: none)");
    println!("  --no-cursor               Hide mouse cursor during recording");
    println!("  --upload, -u              Automatically upload recording after stopping\n");
    println!("EXAMPLES:");
    println!("  sharel capture region");
    println!("  sharel capture fullscreen --upload");
    println!("  sharel record window --fps 60");
    println!("  sharel record region --format gif");
    println!("  sharel info");
    println!("  sharel upload ~/Pictures/photo.png");
    println!("  sharel ocr ~/Pictures/receipt.png");
}

fn init_gui_env() {
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    if std::env::var_os("G_MESSAGES_DEBUG").is_none() {
        std::env::set_var("G_MESSAGES_DEBUG", "");
    }
    glib::log_set_writer_func(|level, fields| {
        let is_gtk_or_indicator = fields.iter().any(|f| {
            let key = f.key();
            let val = f.value_str().unwrap_or_default();
            (key == "GLIB_DOMAIN" && (val == "Gtk" || val.contains("appindicator") || val.contains("ayatana")))
                || (key == "MESSAGE" && val.contains("deprecated"))
        });
        if is_gtk_or_indicator && (level == glib::LogLevel::Warning || level == glib::LogLevel::Message || level == glib::LogLevel::Info) {
            return glib::LogWriterOutput::Handled;
        }
        glib::log_writer_default(level, fields)
    });
}

#[tokio::main]
async fn run_cli(args: Vec<String>) {
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("gui");

    match command {
        "help" | "-h" | "--help" => {
            print_help();
        }
        "info" | "doctor" | "env" => {
            let cfg = load_config();
            let env_info = get_system_environment_info(
                Some(&cfg.preferred_screenshot_backend),
                Some(&cfg.preferred_recording_backend),
            );
            println!("=== ShareL Environment & Backend Diagnostics ===");
            println!("  Compositor:         {}", env_info.compositor_name);
            println!("  Session Type:       {}", env_info.session_type);
            println!("  Wayland Display:    {}", env_info.wayland_display.unwrap_or_else(|| "None".to_string()));
            println!("\n  Available Backends:");
            println!("    ├── XDG Desktop Portal:      {}", if env_info.backends.xdg_desktop_portal { "✓ Yes" } else { "✗ No" });
            println!("    ├── grim:                    {}", if env_info.backends.grim { "✓ Yes" } else { "✗ No" });
            println!("    ├── slurp:                   {}", if env_info.backends.slurp { "✓ Yes" } else { "✗ No" });
            println!("    ├── gpu-screen-recorder:     {}", if env_info.backends.gpu_screen_recorder { "✓ Yes" } else { "✗ No" });
            println!("    ├── wf-recorder:             {}", if env_info.backends.wf_recorder { "✓ Yes" } else { "✗ No" });
            println!("    ├── ffmpeg:                  {}", if env_info.backends.ffmpeg { "✓ Yes" } else { "✗ No" });
            println!("    └── Compositor Integration:  {} ({})", 
                if env_info.backends.compositor_integration { "✓ Yes" } else { "✗ No" },
                env_info.backends.compositor_cli_name.unwrap_or_else(|| "none".to_string())
            );
            println!("\n  Active Preferences:");
            println!("    • Screenshot Backend: {}", env_info.preferred_screenshot_backend);
            println!("    • Recording Backend:  {}", env_info.preferred_recording_backend);
            println!("================================================");
        }
        "uploaders" | "-l" | "--list" => {
            let uploaders = list_custom_uploaders();
            println!("Configured Destinations ({}):", uploaders.len());
            for u in uploaders {
                println!("  * [{}] {} ({} -> {})", u.id, u.name, u.request_method, u.request_url);
            }
        }
        "ocr" => {
            let file = match args.get(2) {
                Some(f) => f,
                None => {
                    eprintln!("Error: Specify an image path for OCR. Example: sharel ocr /path/to/image.png");
                    std::process::exit(1);
                }
            };
            let res = extract_text_ocr(file);
            if res.success {
                println!("{}", res.text);
                let _ = copy_text_to_clipboard(&res.text);
            } else {
                eprintln!("OCR Error: {}", res.error.unwrap_or_else(|| "Failed to extract text".to_string()));
                std::process::exit(1);
            }
        }
        "upload" | "-u" => {
            let file = match args.get(2) {
                Some(f) => f,
                None => {
                    eprintln!("Error: Specify a file path to upload. Example: sharel upload /path/to/image.png");
                    std::process::exit(1);
                }
            };

            let cfg = load_config();
            let target_uploader = resolve_active_uploader(&cfg.active_uploader_id);

            let uploader = match target_uploader {
                Some(u) => u,
                None => {
                    eprintln!("Error: No uploader destinations configured.");
                    std::process::exit(1);
                }
            };

            println!("Uploading '{}' to {}...", file, uploader.name);
            match execute_upload(&uploader, file).await {
                Ok(res) => {
                    if res.success {
                        if let Some(ref url) = res.url {
                            println!("Upload successful: {}", url);
                            let _ = copy_text_to_clipboard(url);
                        } else {
                            println!("Upload completed (HTTP {}).", res.status_code);
                        }
                    } else {
                        eprintln!("Upload failed: {}", res.error_message.unwrap_or_else(|| "Unknown error".to_string()));
                        std::process::exit(1);
                    }
                }
                Err(e) => {
                    eprintln!("Upload error: {}", e);
                    std::process::exit(1);
                }
            }
        }
        "record" | "-r" => {
            let mode_str = args.get(2).map(|s| s.as_str()).unwrap_or("fullscreen");
            let mut format = "mp4".to_string();
            let mut fps = 60u32;
            let mut codec = "h264".to_string();
            let mut audio = "none".to_string();
            let mut cursor = true;
            let mut auto_upload = false;

            let mut i = 3;
            while i < args.len() {
                match args[i].as_str() {
                    "--format" | "-f" if i + 1 < args.len() => {
                        format = args[i + 1].clone();
                        i += 1;
                    }
                    "--fps" if i + 1 < args.len() => {
                        if let Ok(val) = args[i + 1].parse::<u32>() {
                            fps = val;
                        }
                        i += 1;
                    }
                    "--codec" if i + 1 < args.len() => {
                        codec = args[i + 1].clone();
                        i += 1;
                    }
                    "--audio" | "-a" if i + 1 < args.len() => {
                        audio = args[i + 1].clone();
                        i += 1;
                    }
                    "--no-cursor" => cursor = false,
                    "--upload" | "-u" => auto_upload = true,
                    _ => {}
                }
                i += 1;
            }

            let cfg = load_config();
            let opts = RecordingOptions {
                recordings_dir: cfg.recordings_directory.clone(),
                format: format.clone(),
                fps,
                bitrate_kbps: Some(cfg.recording_bitrate_kbps),
                codec: Some(codec),
                audio_source: Some(audio),
                record_microphone: false,
                record_system_audio: false,
                separate_audio_tracks: false,
                capture_cursor: cursor,
                highlight_cursor: false,
                webcam_device: None,
                webcam_position: Some("bottom_right".to_string()),
                mode: mode_str.to_string(),
                region_geometry: None,
                preferred_backend: Some(cfg.preferred_recording_backend.clone()),
                filename_template: Some(cfg.recording_filename_template.clone()),
                auto_upload,
            };

            println!("Starting Wayland recording ({:?}, {} fps, {})...", mode_str, fps, format);
            println!("Press Ctrl+C to stop recording.");

            if let Err(e) = start_recording_advanced(opts) {
                eprintln!("Failed to start recording: {}", e);
                std::process::exit(1);
            }

            tokio::signal::ctrl_c().await.ok();
            println!("\nStopping recording and processing file...");

            match stop_recording() {
                Ok(result) => {
                    println!("Recording saved: {} ({} seconds)", result.file_path, result.duration_seconds);
                    if auto_upload {
                        if let Some(uploader) = resolve_active_uploader(&cfg.active_uploader_id) {
                            println!("Uploading recording to {}...", uploader.name);
                            if let Ok(res) = execute_upload(&uploader, &result.file_path).await {
                                if let Some(ref url) = res.url {
                                    println!("Uploaded URL: {}", url);
                                    let _ = copy_text_to_clipboard(url);
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to stop recording: {}", e);
                    std::process::exit(1);
                }
            }
        }
        "capture" | "-c" => {
            let mode_str = args.get(2).map(|s| s.as_str()).unwrap_or("region");
            let mode = match mode_str.to_lowercase().as_str() {
                "fullscreen" | "full" | "screen" => CaptureMode::Fullscreen,
                "window" | "win" => CaptureMode::Window,
                "active" | "activescreen" => CaptureMode::ActiveScreen,
                _ => CaptureMode::Region,
            };

            let mut delay_ms: u64 = 0;
            let mut do_upload = false;
            let mut custom_format: Option<String> = None;
            let mut custom_backend: Option<String> = None;
            let mut custom_uploader_id: Option<String> = None;

            let mut i = 3;
            while i < args.len() {
                match args[i].as_str() {
                    "--upload" | "-u" => do_upload = true,
                    "--delay" | "-d" => {
                        if i + 1 < args.len() {
                            if let Ok(sec) = args[i + 1].parse::<u64>() {
                                delay_ms = sec * 1000;
                            }
                            i += 1;
                        }
                    }
                    "--format" | "-f" => {
                        if i + 1 < args.len() {
                            custom_format = Some(args[i + 1].clone());
                            i += 1;
                        }
                    }
                    "--backend" | "-b" => {
                        if i + 1 < args.len() {
                            custom_backend = Some(args[i + 1].clone());
                            i += 1;
                        }
                    }
                    "--uploader" if i + 1 < args.len() => {
                        custom_uploader_id = Some(args[i + 1].clone());
                        i += 1;
                    }
                    _ => {}
                }
                i += 1;
            }

            let cfg = load_config();
            let format = custom_format.unwrap_or(cfg.default_image_format.clone());
            let backend_pref = custom_backend.as_deref().or(Some(&cfg.preferred_screenshot_backend));

            println!("Capturing {:?} on Wayland...", mode);
            match take_screenshot_with_backend(mode, &cfg.save_directory, &format, delay_ms, backend_pref).await {
                Ok(result) => {
                    println!("Screenshot saved (via {}): {}", result.backend_used, result.file_path);

                    let should_copy = if args.iter().any(|a| a == "--copy" || a == "-p") {
                        true
                    } else if args.iter().any(|a| a == "--no-copy") {
                        false
                    } else {
                        cfg.after_capture.copy_to_clipboard
                    };

                    if should_copy {
                        let _ = copy_image_to_clipboard(Path::new(&result.file_path));
                    }

                    let history_item = HistoryItem {
                        id: result.id.clone(),
                        title: result.file_name.clone(),
                        file_path: result.file_path.clone(),
                        file_name: result.file_name.clone(),
                        file_size: result.file_size,
                        item_type: "image".to_string(),
                        format: result.format.clone(),
                        width: Some(result.width),
                        height: Some(result.height),
                        duration_seconds: None,
                        timestamp: result.timestamp,
                        upload_url: None,
                        deletion_url: None,
                        thumbnail_url: None,
                        is_favorite: false,
                    };
                    let _ = add_history_item(history_item);

                    if do_upload || cfg.after_capture.upload_to_host {
                        let uploader_id = custom_uploader_id.unwrap_or(cfg.active_uploader_id.clone());
                        if let Some(uploader) = resolve_active_uploader(&uploader_id) {
                            println!("Uploading to {}...", uploader.name);
                            if let Ok(upload_res) = execute_upload(&uploader, &result.file_path).await {
                                if let Some(ref url) = upload_res.url {
                                    println!("Uploaded URL: {}", url);
                                    let _ = copy_text_to_clipboard(url);
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Capture failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
        "update" | "upgrade" => {
            let check_only = args.iter().any(|a| a == "--check" || a == "-c");
            println!("Checking for updates on GitHub (44tl/ShareL)...");
            match sharel_lib::updater::check_for_updates().await {
                Ok(info) => {
                    println!("\n  Current Version:  v{}", info.current_version);
                    println!("  Latest Version:   v{}", info.latest_version);
                    if info.is_ignored {
                        println!("  Status:           Ignored by user setting");
                    }
                    if info.has_update {
                        println!("\n🎉 New version v{} is available!", info.latest_version);
                        println!("Release Title: {}\n", info.release_name);
                        if !info.release_notes.is_empty() {
                            println!("Changelog:\n--------------------------------------------------");
                            println!("{}", info.release_notes);
                            println!("--------------------------------------------------");
                        }
                        if check_only {
                            println!("\nRun 'sharel update' to install this update.");
                        } else {
                            println!("\nDownloading and installing update...");
                            match sharel_lib::updater::install_update_with_progress(None, None).await {
                                Ok(msg) => {
                                    println!("✓ {}", msg);
                                    println!("Update complete. Please restart ShareL.");
                                }
                                Err(e) => {
                                    eprintln!("✗ Failed to install update: {}", e);
                                    std::process::exit(1);
                                }
                            }
                        }
                    } else {
                        println!("\n✓ ShareL is already up to date.");
                    }
                }
                Err(e) => {
                    eprintln!("Failed to check updates: {}", e);
                    std::process::exit(1);
                }
            }
        }
        "revert" | "rollback" => {
            let specific_tag = args.get(2);
            if let Some(tag) = specific_tag {
                println!("Installing specific release version '{}'...", tag);
                match sharel_lib::updater::install_specific_release_tag(None, tag).await {
                    Ok(msg) => {
                        println!("✓ {}", msg);
                        println!("Reverted successfully. Please restart ShareL.");
                    }
                    Err(e) => {
                        eprintln!("✗ Revert failed: {}", e);
                        std::process::exit(1);
                    }
                }
            } else {
                println!("Rolling back to previous backup binary...");
                match sharel_lib::updater::rollback_to_previous_version().await {
                    Ok(res) => {
                        println!("✓ {}", res.message);
                        println!("Rollback complete. Please restart ShareL.");
                    }
                    Err(e) => {
                        eprintln!("✗ Rollback failed: {}", e);
                        println!("Tip: You can specify a version tag directly: sharel revert v1.0.0");
                        std::process::exit(1);
                    }
                }
            }
        }
        "ignore-version" => {
            let ver = match args.get(2) {
                Some(v) => v,
                None => {
                    eprintln!("Error: Specify a version to ignore. Example: sharel ignore-version 1.1.0");
                    std::process::exit(1);
                }
            };
            if let Err(e) = sharel_lib::updater::ignore_version(ver.clone()) {
                eprintln!("Failed to ignore version: {}", e);
                std::process::exit(1);
            }
            println!("✓ Version v{} added to ignored versions list.", ver.trim_start_matches('v'));
        }
        "unignore-version" => {
            let ver = match args.get(2) {
                Some(v) => v,
                None => {
                    eprintln!("Error: Specify a version to unignore. Example: sharel unignore-version 1.1.0");
                    std::process::exit(1);
                }
            };
            if let Err(e) = sharel_lib::updater::unignore_version(ver.clone()) {
                eprintln!("Failed to unignore version: {}", e);
                std::process::exit(1);
            }
            println!("✓ Version v{} removed from ignored versions list.", ver.trim_start_matches('v'));
        }
        "versions" | "releases" => {
            println!("Fetching recent releases from GitHub...");
            match sharel_lib::updater::fetch_github_releases().await {
                Ok(releases) => {
                    println!("\nAvailable Releases ({}):", releases.len());
                    for r in releases {
                        let date = r.published_at.as_deref().unwrap_or("unknown");
                        let title = r.name.as_deref().unwrap_or(&r.tag_name);
                        println!("  • {:<10} {:<30} ({})", r.tag_name, title, date);
                    }
                    println!("\nTip: To revert to any version, run: sharel revert <TAG>");
                }
                Err(e) => {
                    eprintln!("Failed to fetch releases: {}", e);
                    std::process::exit(1);
                }
            }
        }
        _ => {
            init_gui_env();
            sharel_lib::run();
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] != "gui" {
        run_cli(args);
    } else {
        init_gui_env();
        sharel_lib::run();
    }
}

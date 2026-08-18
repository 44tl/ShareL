#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sharel_lib::capture::{copy_image_to_clipboard, copy_text_to_clipboard, take_screenshot, CaptureMode};
use sharel_lib::config::load_config;
use sharel_lib::history::{add_history_item, HistoryItem};
use sharel_lib::tools::extract_text_ocr;
use sharel_lib::uploader::{execute_upload, list_custom_uploaders};
use std::env;
use std::path::Path;

fn print_help() {
    println!("ShareL - High Performance Screen Capture & Sharing for Linux (Wayland)\n");
    println!("USAGE:");
    println!("  sharel [COMMAND] [OPTIONS]\n");
    println!("COMMANDS:");
    println!("  gui                       Launch the interactive desktop interface (default)");
    println!("  capture, -c [MODE]        Take a screenshot (region, fullscreen, window, active)");
    println!("  upload, -u [FILE]         Upload a file to the active or specified destination");
    println!("  ocr [FILE]                Extract text from an image using OCR");
    println!("  uploaders, -l             List all configured ShareX upload destinations");
    println!("  help, -h, --help          Print this help message\n");
    println!("CAPTURE OPTIONS:");
    println!("  --upload, -u              Upload capture immediately after taking it");
    println!("  --copy, -p                Copy capture image to clipboard (default: enabled in config)");
    println!("  --delay, -d [SECONDS]     Delay capture by specified seconds (e.g. -d 2)");
    println!("  --format, -f [FORMAT]     Image format: png, jpg, webp (default: png)");
    println!("  --uploader [ID]           Specific destination ID to upload to\n");
    println!("EXAMPLES:");
    println!("  sharel capture region");
    println!("  sharel capture fullscreen --upload");
    println!("  sharel capture region -d 3 -u");
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
            let uploaders = list_custom_uploaders();
            let target_uploader = uploaders
                .into_iter()
                .find(|u| u.id == cfg.active_uploader_id)
                .or_else(|| list_custom_uploaders().into_iter().next());

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
                    "--uploader" => {
                        if i + 1 < args.len() {
                            custom_uploader_id = Some(args[i + 1].clone());
                            i += 1;
                        }
                    }
                    _ => {}
                }
                i += 1;
            }

            let cfg = load_config();
            let format = custom_format.unwrap_or(cfg.default_image_format.clone());

            println!("Capturing {:?} on Wayland...", mode);
            match take_screenshot(mode, &cfg.save_directory, &format, delay_ms).await {
                Ok(result) => {
                    println!("Screenshot saved: {}", result.file_path);
                    let _ = copy_image_to_clipboard(Path::new(&result.file_path));

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
                        let uploaders = list_custom_uploaders();
                        if let Some(uploader) = uploaders.into_iter().find(|u| u.id == uploader_id) {
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
        "gui" | _ => {
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

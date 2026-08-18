pub mod capture;
pub mod config;
pub mod environment;
pub mod history;
pub mod recorder;
pub mod tools;
pub mod uploader;

// todo: update capture part later.

use capture::{
    copy_image_to_clipboard, copy_text_to_clipboard, take_screenshot_with_backend, CaptureMode,
    CaptureResult,
};
use config::{load_config, save_config, AppConfig};
use environment::{get_system_environment_info, SystemEnvironmentInfo};
use history::{
    add_history_item, clear_history, delete_history_item, load_history,
    toggle_favorite_history_item, update_history_item, HistoryItem,
};
use recorder::{
    finalize_recording_sync, get_recording_status, list_webcam_devices, pause_recording,
    resume_recording, start_recording, start_recording_advanced, stop_recording_process,
    RecordingOptions, RecordingResult, RecordingStatus,
};
use std::path::Path;
use std::sync::Mutex;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use tools::{extract_text_ocr, open_url_browser, read_file_as_data_url, save_annotated_image, show_in_folder, OcrResult};
use uploader::{
    delete_custom_uploader, execute_upload_with_progress, list_custom_uploaders, parse_sxcu_file,
    resolve_active_uploader, save_custom_uploader, CustomUploaderConfig, UploadResult,
};

static REGISTERED_SHORTCUTS: Mutex<Vec<Shortcut>> = Mutex::new(Vec::new());

fn notify_history_changed(app: &tauri::AppHandle) {
    let _ = app.emit("history://changed", ());
}

fn shortcut_map(cfg: &AppConfig) -> Vec<(Shortcut, &'static str)> {
    let pairs: [(&String, &'static str); 8] = [
        (&cfg.shortcuts.capture_region, "region"),
        (&cfg.shortcuts.capture_fullscreen, "fullscreen"),
        (&cfg.shortcuts.capture_window, "window"),
        (&cfg.shortcuts.capture_active_screen, "active"),
        (&cfg.shortcuts.open_main_window, "open_main_window"),
        (&cfg.shortcuts.stop_recording, "stop_recording"),
        (&cfg.shortcuts.upload_last_capture, "upload_last_capture"),
        (&cfg.shortcuts.ocr_last_capture, "ocr_last_capture"),
    ];
    pairs
        .iter()
        .filter_map(|(raw, action)| {
            if raw.is_empty() {
                return None;
            }
            raw.parse::<Shortcut>().ok().map(|sc| (sc, *action))
        })
        .collect()
}

fn apply_global_shortcuts(app: &tauri::AppHandle) {
    let mut registered = REGISTERED_SHORTCUTS.lock().unwrap();
    for sc in registered.iter() {
        let _ = app.global_shortcut().unregister(*sc);
    }
    registered.clear();
    let cfg = load_config();
    for (sc, _) in shortcut_map(&cfg) {
        if app.global_shortcut().register(sc).is_ok() {
            registered.push(sc);
        }
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn upload_last_capture(app: &tauri::AppHandle) {
    let history = load_history();
    let Some(item) = history.into_iter().find(|i| i.item_type == "image") else {
        return;
    };
    let cfg = load_config();
    let Some(uploader) = resolve_active_uploader(&cfg.active_uploader_id) else {
        return;
    };
    let handle = app.clone();
    let file_path = item.file_path.clone();
    tauri::async_runtime::spawn(async move {
        let _ = perform_upload(&handle, uploader, &file_path).await;
    });
}

fn ocr_last_capture(app: &tauri::AppHandle) {
    let history = load_history();
    let Some(item) = history.into_iter().find(|i| i.item_type == "image") else {
        return;
    };
    let res = extract_text_ocr(&item.file_path);
    if res.success {
        let _ = copy_text_to_clipboard(&res.text);
        let _ = app.emit("ocr://result", serde_json::json!({ "success": true, "text": res.text }));
    } else {
        let _ = app.emit("ocr://result", serde_json::json!({ "success": false, "error": res.error }));
    }
}

async fn perform_upload(
    app: &tauri::AppHandle,
    uploader: CustomUploaderConfig,
    file_path: &str,
) -> Result<UploadResult, String> {
    let job_id = uuid::Uuid::new_v4().to_string();
    let file_name = Path::new(file_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let _ = app.emit(
        "upload://start",
        serde_json::json!({
            "job_id": job_id,
            "uploader_id": uploader.id,
            "uploader_name": uploader.name,
            "file_path": file_path,
            "file_name": file_name,
        }),
    );

    let progress_app = app.clone();
    let progress_job_id = job_id.clone();
    let result = execute_upload_with_progress(&uploader, file_path, move |sent, total| {
        let progress = if total > 0 {
            (sent as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        let _ = progress_app.emit(
            "upload://progress",
            serde_json::json!({
                "job_id": progress_job_id,
                "progress": progress,
                "bytes_sent": sent,
                "bytes_total": total,
            }),
        );
    })
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit(
                "upload://complete",
                serde_json::json!({
                    "job_id": job_id,
                    "success": false,
                    "error_message": e,
                }),
            );
            return Err(e);
        }
    };

    if result.success {
        if let Some(ref url) = result.url {
            let cfg = load_config();
            if cfg.after_upload.copy_url_to_clipboard {
                let _ = copy_text_to_clipboard(url);
            }
            if cfg.after_upload.open_url_in_browser {
                let _ = open_url_browser(url);
            }

            let history = load_history();
            if let Some(item) = history.iter().find(|i| i.file_path == file_path) {
                let _ = update_history_item(&item.id, Some(url.clone()), result.deletion_url.clone());
                notify_history_changed(app);
            }
        }
    }

    let _ = app.emit(
        "upload://complete",
        serde_json::json!({
            "job_id": job_id,
            "success": result.success,
            "url": result.url,
            "deletion_url": result.deletion_url,
            "thumbnail_url": result.thumbnail_url,
            "error_message": result.error_message,
            "status_code": result.status_code,
            "duration_ms": result.duration_ms,
        }),
    );

    Ok(result)
}

#[tauri::command]
fn get_system_environment() -> SystemEnvironmentInfo {
    let cfg = load_config();
    get_system_environment_info(
        Some(&cfg.preferred_screenshot_backend),
        Some(&cfg.preferred_recording_backend),
    )
}

#[tauri::command]
fn get_app_config() -> AppConfig {
    load_config()
}

#[tauri::command]
fn update_app_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    save_config(&config)?;
    apply_global_shortcuts(&app);
    Ok(())
}

#[tauri::command]
async fn capture_screen(app: tauri::AppHandle, mode: String, delay_ms: u64) -> Result<CaptureResult, String> {
    let cfg = load_config();
    let capture_mode = match mode.to_lowercase().as_str() {
        "region" => CaptureMode::Region,
        "window" => CaptureMode::Window,
        "activescreen" | "active" => CaptureMode::ActiveScreen,
        _ => CaptureMode::Fullscreen,
    };

    let result = take_screenshot_with_backend(
        capture_mode,
        &cfg.save_directory,
        &cfg.default_image_format,
        delay_ms,
        Some(&cfg.preferred_screenshot_backend),
    )
    .await?;

    let p = Path::new(&result.file_path);

    if cfg.after_capture.copy_to_clipboard {
        let _ = copy_image_to_clipboard(p);
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

    notify_history_changed(&app);

    if cfg.after_capture.upload_to_host {
        if let Some(uploader) = resolve_active_uploader(&cfg.active_uploader_id) {
            let handle = app.clone();
            let file_path = result.file_path.clone();
            tauri::async_runtime::spawn(async move {
                let _ = perform_upload(&handle, uploader, &file_path).await;
            });
        }
    }

    Ok(result)
}

#[tauri::command]
fn start_screen_recording(format: String, fps: u32, include_audio: bool) -> Result<(), String> {
    let cfg = load_config();
    start_recording(
        &cfg.recordings_directory,
        &format,
        fps,
        include_audio,
        None,
        Some(&cfg.preferred_recording_backend),
    )
}

#[tauri::command]
fn start_screen_recording_advanced(options: RecordingOptions) -> Result<(), String> {
    let mut opts = options;
    if opts.recordings_dir.is_empty() {
        let cfg = load_config();
        opts.recordings_dir = cfg.recordings_directory;
    }
    start_recording_advanced(opts)
}

#[tauri::command]
fn pause_screen_recording() -> Result<(), String> {
    pause_recording()
}

#[tauri::command]
fn resume_screen_recording() -> Result<(), String> {
    resume_recording()
}

#[tauri::command]
fn list_webcam_devices_cmd() -> Vec<String> {
    list_webcam_devices()
}

#[tauri::command]
fn stop_screen_recording(app: tauri::AppHandle) -> Result<RecordingResult, String> {
    let stopped = stop_recording_process()?;

    if stopped.is_gif {
        let file_name = stopped
            .output_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let initial_result = RecordingResult {
            id: stopped.id.clone(),
            file_path: stopped.output_path.to_string_lossy().to_string(),
            file_name: file_name.clone(),
            file_size: 0,
            duration_seconds: stopped.duration_seconds,
            format: stopped.format.clone(),
            timestamp: stopped.start_time,
            backend_used: stopped.backend.clone(),
            auto_upload: stopped.auto_upload,
            is_processing: true,
        };

        let _ = app.emit(
            "recording://processing_start",
            serde_json::json!({
                "id": stopped.id.clone(),
                "file_name": file_name,
                "format": stopped.format.clone(),
                "message": "Your recording is being processed..."
            }),
        );

        let handle = app.clone();
        tauri::async_runtime::spawn_blocking(move || {
            if let Ok(result) = finalize_recording_sync(stopped) {
                let history_item = HistoryItem {
                    id: result.id.clone(),
                    title: result.file_name.clone(),
                    file_path: result.file_path.clone(),
                    file_name: result.file_name.clone(),
                    file_size: result.file_size,
                    item_type: "recording".to_string(),
                    format: result.format.clone(),
                    width: None,
                    height: None,
                    duration_seconds: Some(result.duration_seconds),
                    timestamp: result.timestamp,
                    upload_url: None,
                    deletion_url: None,
                    thumbnail_url: None,
                    is_favorite: false,
                };

                let _ = add_history_item(history_item);
                notify_history_changed(&handle);

                let cfg = load_config();
                if result.auto_upload || cfg.recording_auto_upload {
                    if let Some(uploader) = resolve_active_uploader(&cfg.active_uploader_id) {
                        let app_handle = handle.clone();
                        let file_path = result.file_path.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = perform_upload(&app_handle, uploader, &file_path).await;
                        });
                    }
                }

                let _ = handle.emit("recording://processing_complete", &result);
            }
        });

        Ok(initial_result)
    } else {
        let result = finalize_recording_sync(stopped)?;

        let history_item = HistoryItem {
            id: result.id.clone(),
            title: result.file_name.clone(),
            file_path: result.file_path.clone(),
            file_name: result.file_name.clone(),
            file_size: result.file_size,
            item_type: "recording".to_string(),
            format: result.format.clone(),
            width: None,
            height: None,
            duration_seconds: Some(result.duration_seconds),
            timestamp: result.timestamp,
            upload_url: None,
            deletion_url: None,
            thumbnail_url: None,
            is_favorite: false,
        };

        let _ = add_history_item(history_item);
        notify_history_changed(&app);

        let cfg = load_config();
        if result.auto_upload || cfg.recording_auto_upload {
            if let Some(uploader) = resolve_active_uploader(&cfg.active_uploader_id) {
                let handle = app.clone();
                let file_path = result.file_path.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = perform_upload(&handle, uploader, &file_path).await;
                });
            }
        }

        Ok(result)
    }
}

#[tauri::command]
fn get_recording_state() -> RecordingStatus {
    get_recording_status()
}

#[tauri::command]
fn list_uploaders() -> Vec<CustomUploaderConfig> {
    list_custom_uploaders()
}

#[tauri::command]
fn save_uploader(uploader: CustomUploaderConfig) -> Result<(), String> {
    save_custom_uploader(&uploader)
}

#[tauri::command]
fn delete_uploader(id: String) -> Result<(), String> {
    delete_custom_uploader(&id)
}

#[tauri::command]
fn import_sxcu_file(content: String) -> Result<CustomUploaderConfig, String> {
    let uploader = parse_sxcu_file(&content)?;
    save_custom_uploader(&uploader)?;
    Ok(uploader)
}

#[tauri::command]
async fn upload_file(app: tauri::AppHandle, uploader_id: String, file_path: String) -> Result<UploadResult, String> {
    let uploader = resolve_active_uploader(&uploader_id)
        .ok_or_else(|| "No uploader configuration found".to_string())?;

    perform_upload(&app, uploader, &file_path).await
}

#[tauri::command]
fn get_history() -> Vec<HistoryItem> {
    load_history()
}

#[tauri::command]
fn toggle_favorite_history(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let res = toggle_favorite_history_item(&id);
    if res.is_ok() {
        notify_history_changed(&app);
    }
    res
}

#[tauri::command]
fn delete_history(app: tauri::AppHandle, id: String, delete_file: bool) -> Result<(), String> {
    let res = delete_history_item(&id, delete_file);
    if res.is_ok() {
        notify_history_changed(&app);
    }
    res
}

#[tauri::command]
fn clear_all_history(app: tauri::AppHandle) -> Result<(), String> {
    let res = clear_history();
    if res.is_ok() {
        notify_history_changed(&app);
    }
    res
}

#[tauri::command]
fn save_edited_image(data_url: String, original_path: Option<String>, format: String) -> Result<String, String> {
    let cfg = load_config();
    save_annotated_image(&data_url, &cfg.save_directory, original_path, &format)
}

#[tauri::command]
fn copy_image(path: String) -> Result<(), String> {
    copy_image_to_clipboard(std::path::Path::new(&path))
}

#[tauri::command]
fn copy_text(text: String) -> Result<(), String> {
    copy_text_to_clipboard(&text)
}

#[tauri::command]
fn show_file_in_folder(path: String) -> Result<(), String> {
    show_in_folder(&path)
}

#[tauri::command]
fn open_link(url: String) -> Result<(), String> {
    open_url_browser(&url)
}

#[tauri::command]
fn ocr_image(image_path: String) -> OcrResult {
    extract_text_ocr(&image_path)
}

#[tauri::command]
fn get_file_data_url(file_path: String) -> Result<String, String> {
    read_file_as_data_url(&file_path)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let cfg = load_config();
                        let action = shortcut_map(&cfg)
                            .into_iter()
                            .find(|(sc, _)| sc == shortcut)
                            .map(|(_, action)| action);

                        if let Some(action) = action {
                            match action {
                                "open_main_window" => {
                                    show_main_window(app);
                                }
                                "stop_recording" => {
                                    let handle = app.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let _ = stop_screen_recording(handle);
                                    });
                                }
                                "upload_last_capture" => {
                                    upload_last_capture(app);
                                }
                                "ocr_last_capture" => {
                                    ocr_last_capture(app);
                                }
                                _ => {
                                    let handle = app.clone();
                                    let mode = action.to_string();
                                    tauri::async_runtime::spawn(async move {
                                        let _ = capture_screen(handle, mode, 0).await;
                                    });
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            apply_global_shortcuts(app.handle());

            let show_i = MenuItem::with_id(app, "show", "Open ShareL", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let icon_bytes = include_bytes!("../icons/32x32.png");
            let icon = Image::from_bytes(icon_bytes).map_err(|e| e.to_string())?;

            let tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        show_main_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_main_window(app);
                    }
                })
                .build(app)?;

            let _ = tray;

            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let cfg = load_config();
                        if cfg.minimize_to_tray {
                            api.prevent_close();
                            let _ = win.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_environment,
            get_app_config,
            update_app_config,
            capture_screen,
            start_screen_recording,
            start_screen_recording_advanced,
            pause_screen_recording,
            resume_screen_recording,
            list_webcam_devices_cmd,
            stop_screen_recording,
            get_recording_state,
            list_uploaders,
            save_uploader,
            delete_uploader,
            import_sxcu_file,
            upload_file,
            get_history,
            toggle_favorite_history,
            delete_history,
            clear_all_history,
            save_edited_image,
            copy_image,
            copy_text,
            show_file_in_folder,
            open_link,
            ocr_image,
            get_file_data_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running ShareL application");
}
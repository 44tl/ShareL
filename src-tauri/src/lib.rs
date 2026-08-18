pub mod capture;
pub mod config;
pub mod history;
pub mod recorder;
pub mod tools;
pub mod uploader;

use capture::{copy_image_to_clipboard, copy_text_to_clipboard, take_screenshot, CaptureMode, CaptureResult};
use config::{load_config, save_config, AppConfig};
use history::{
    add_history_item, clear_history, delete_history_item, load_history,
    toggle_favorite_history_item, update_history_item, HistoryItem,
};
use recorder::{get_recording_status, start_recording, stop_recording, RecordingResult, RecordingStatus};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tools::{extract_text_ocr, open_url_browser, save_annotated_image, show_in_folder, OcrResult};
use uploader::{
    delete_custom_uploader, execute_upload, list_custom_uploaders, parse_sxcu_file,
    save_custom_uploader, CustomUploaderConfig, UploadResult,
};

#[tauri::command]
fn get_app_config() -> AppConfig {
    load_config()
}

#[tauri::command]
fn update_app_config(config: AppConfig) -> Result<(), String> {
    save_config(&config)
}

#[tauri::command]
async fn capture_screen(mode: String, delay_ms: u64) -> Result<CaptureResult, String> {
    let cfg = load_config();
    let capture_mode = match mode.to_lowercase().as_str() {
        "region" => CaptureMode::Region,
        "window" => CaptureMode::Window,
        "activescreen" | "active" => CaptureMode::ActiveScreen,
        _ => CaptureMode::Fullscreen,
    };

    let result = take_screenshot(
        capture_mode,
        &cfg.save_directory,
        &cfg.default_image_format,
        delay_ms,
    )
    .await?;

    let p = std::path::Path::new(&result.file_path);

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

    Ok(result)
}

#[tauri::command]
fn start_screen_recording(format: String, fps: u32, include_audio: bool) -> Result<(), String> {
    let cfg = load_config();
    start_recording(&cfg.recordings_directory, &format, fps, include_audio, None)
}

#[tauri::command]
fn stop_screen_recording() -> Result<RecordingResult, String> {
    let result = stop_recording()?;

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

    Ok(result)
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
async fn upload_file(uploader_id: String, file_path: String) -> Result<UploadResult, String> {
    let uploaders = list_custom_uploaders();
    let uploader = uploaders
        .into_iter()
        .find(|u| u.id == uploader_id)
        .ok_or_else(|| "Uploader configuration not found".to_string())?;

    let result = execute_upload(&uploader, &file_path).await?;
    let cfg = load_config();

    if result.success {
        if let Some(ref url) = result.url {
            if cfg.after_upload.copy_url_to_clipboard {
                let _ = copy_text_to_clipboard(url);
            }
            if cfg.after_upload.open_url_in_browser {
                let _ = open_url_browser(url);
            }

            let history = load_history();
            if let Some(item) = history.iter().find(|i| i.file_path == file_path) {
                let _ = update_history_item(&item.id, Some(url.clone()), result.deletion_url.clone());
            }
        }
    }

    Ok(result)
}

#[tauri::command]
fn get_history() -> Vec<HistoryItem> {
    load_history()
}

#[tauri::command]
fn toggle_favorite_history(id: String) -> Result<bool, String> {
    toggle_favorite_history_item(&id)
}

#[tauri::command]
fn delete_history(id: String, delete_file: bool) -> Result<(), String> {
    delete_history_item(&id, delete_file)
}

#[tauri::command]
fn clear_all_history() -> Result<(), String> {
    clear_history()
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
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
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
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
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let _ = tray;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            update_app_config,
            capture_screen,
            start_screen_recording,
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
            ocr_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running ShareL application");
}

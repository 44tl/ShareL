const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function invokeCommand<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isTauriEnv()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  }
  return fallbackHandler<T>(cmd, args);
}

function fallbackHandler<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case 'get_app_config':
      return Promise.resolve({
        save_directory: '/home/user/Pictures/Screenshots/ShareL',
        recordings_directory: '/home/user/Videos/Recordings/ShareL',
        file_naming_pattern: '%Y-%m-%d_%H-%M-%S',
        default_image_format: 'png',
        default_recording_format: 'mp4',
        recording_fps: 60,
        recording_include_audio: false,
        recording_bitrate_kbps: 8000,
        recording_codec: 'h264',
        recording_audio_source: 'none',
        recording_capture_cursor: true,
        recording_highlight_cursor: false,
        recording_webcam_overlay: false,
        recording_webcam_device: '/dev/video0',
        recording_webcam_position: 'bottom_right',
        recording_filename_template: 'ShareL_Rec_{date}_{time}',
        recording_auto_upload: false,
        after_capture: {
          copy_to_clipboard: true,
          save_to_file: true,
          upload_to_host: false,
          open_in_editor: true,
          show_notification: true,
          play_sound: true,
        },
        after_upload: {
          copy_url_to_clipboard: true,
          open_url_in_browser: false,
          show_notification: true,
        },
        active_uploader_id: 'sxcu_0x0',
        theme: 'dark',
        minimize_to_tray: true,
        shortcuts: {
          capture_region: 'Ctrl+Shift+PrintScreen',
          capture_fullscreen: 'PrintScreen',
          capture_window: 'Alt+PrintScreen',
          capture_active_screen: 'Ctrl+PrintScreen',
          open_main_window: '',
          stop_recording: '',
          upload_last_capture: '',
          ocr_last_capture: '',
        },
        check_updates_on_startup: true,
        auto_check_updates: true,
        ignored_versions: [],
        update_channel: 'stable',
      } as unknown as T);

    case 'update_app_config':
      return Promise.resolve(undefined as unknown as T);

    case 'capture_screen': {
      const mode = (args.mode as string) || 'region';
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '32px sans-serif';
        ctx.fillText(`ShareL Simulated ${mode.toUpperCase()} Capture`, 360, 360);
      }
      const dataUrl = canvas.toDataURL('image/png');
      return Promise.resolve({
        id: crypto.randomUUID(),
        file_path: `/tmp/ShareL_Simulated_${Date.now()}.png`,
        file_name: `ShareL_Simulated_${Date.now()}.png`,
        file_size: 142800,
        width: 1280,
        height: 720,
        timestamp: Math.floor(Date.now() / 1000),
        data_url: dataUrl,
        format: 'png',
      } as unknown as T);
    }

    case 'start_screen_recording':
    case 'start_screen_recording_advanced':
    case 'pause_screen_recording':
    case 'resume_screen_recording':
      return Promise.resolve(undefined as unknown as T);

    case 'list_webcam_devices_cmd':
      return Promise.resolve(['/dev/video0', '/dev/video1'] as unknown as T);

    case 'stop_screen_recording':
      return Promise.resolve({
        id: crypto.randomUUID(),
        file_path: `/tmp/ShareL_Recording_${Date.now()}.mp4`,
        file_name: `ShareL_Recording_${Date.now()}.mp4`,
        file_size: 2450000,
        duration_seconds: 6,
        format: 'mp4',
        timestamp: Math.floor(Date.now() / 1000),
        backend_used: 'gpu-screen-recorder',
      } as unknown as T);

    case 'get_recording_state':
      return Promise.resolve({
        is_recording: false,
        is_paused: false,
        duration_seconds: 0,
        fps: 60,
        mode: 'fullscreen',
        codec: 'h264',
      } as unknown as T);

    case 'list_uploaders':
      return Promise.resolve([
        {
          id: 'sxcu_0x0',
          Version: '15.0.0',
          Name: '0x0 (The Null Pointer)',
          DestinationType: 'ImageUploader',
          RequestMethod: 'POST',
          RequestURL: 'https://0x0.st',
          Headers: {},
          Parameters: {},
          Arguments: {},
          Body: 'MultipartFormData',
          FileFormName: 'file',
          URL: '$response$',
        },
        {
          id: 'sxcu_imgur',
          Version: '15.0.0',
          Name: 'Imgur API',
          DestinationType: 'ImageUploader',
          RequestMethod: 'POST',
          RequestURL: 'https://api.imgur.com/3/image',
          Headers: {},
          Parameters: {},
          Arguments: {},
          Body: 'MultipartFormData',
          FileFormName: 'image',
          URL: '$json:data.link$',
          DeletionURL: '$json:data.deletehash$',
        },
      ] as unknown as T);

    case 'save_uploader':
    case 'delete_uploader':
      return Promise.resolve(undefined as unknown as T);

    case 'upload_file':
      return Promise.resolve({
        success: true,
        url: 'https://example.com/uploaded/demo-capture.png',
        thumbnail_url: 'https://example.com/uploaded/demo-thumb.png',
        deletion_url: 'https://example.com/uploaded/demo-id',
        raw_response: '{"status_code":200,"image":{"url":"https://example.com/uploaded/demo-capture.png"}}',
        status_code: 200,
        duration_ms: 480,
      } as unknown as T);

    case 'get_history':
      return Promise.resolve([
        {
          id: 'hist-1',
          title: 'ShareL_2026-08-18_03-00-12.png',
          file_path: '/home/user/Pictures/Screenshots/ShareL/ShareL_2026-08-18_03-00-12.png',
          file_name: 'ShareL_2026-08-18_03-00-12.png',
          file_size: 428000,
          item_type: 'image',
          format: 'png',
          width: 1920,
          height: 1080,
          timestamp: Math.floor(Date.now() / 1000) - 600,
          upload_url: 'https://example.com/uploaded/demo-1.png',
          is_favorite: true,
        },
        {
          id: 'hist-2',
          title: 'ShareL_Recording_2026-08-18_02-45-00.mp4',
          file_path: '/home/user/Videos/Recordings/ShareL/ShareL_Recording_2026-08-18_02-45-00.mp4',
          file_name: 'ShareL_Recording_2026-08-18_02-45-00.mp4',
          file_size: 3450000,
          item_type: 'recording',
          format: 'mp4',
          duration_seconds: 12,
          timestamp: Math.floor(Date.now() / 1000) - 1500,
          is_favorite: false,
        },
      ] as unknown as T);

    case 'save_edited_image':
      return Promise.resolve('/home/user/Pictures/Screenshots/ShareL/ShareL_Edited.png' as unknown as T);

    case 'ocr_image':
      return Promise.resolve({
        success: true,
        text: 'Extracted text sample from screen capture using ShareL.',
      } as unknown as T);

    case 'check_for_updates_cmd':
      return Promise.resolve({
        has_update: true,
        current_version: '1.0.0',
        latest_version: '1.1.0',
        release_name: 'ShareL v1.1.0 - Next-Gen Performance & Wayland Tools',
        release_notes: '### What\'s New in v1.1.0\n- 🚀 Improved multi-monitor screenshot capture\n- 🎬 GPU accelerated recording stability with NVENC & VAAPI\n- 🔄 Integrated Auto-Update Engine with Rollback and Skip Version support\n- 📦 Automated multi-distro Linux package releases',
        release_url: 'https://github.com/44tl/ShareL/releases/tag/v1.1.0',
        published_at: new Date().toISOString(),
        is_ignored: false,
        download_url: 'https://github.com/44tl/ShareL/releases/download/v1.1.0/ShareL-x86_64.AppImage',
        asset_name: 'ShareL-x86_64.AppImage',
      } as unknown as T);

    case 'list_available_releases_cmd':
      return Promise.resolve([
        {
          tag_name: 'v1.1.0',
          name: 'ShareL v1.1.0 - Next-Gen Performance',
          body: 'Latest features and bugfixes.',
          html_url: 'https://github.com/44tl/ShareL/releases/tag/v1.1.0',
          published_at: new Date().toISOString(),
          prerelease: false,
          draft: false,
          assets: [{ name: 'ShareL-x86_64.AppImage', browser_download_url: '', size: 34000000 }],
        },
        {
          tag_name: 'v1.0.0',
          name: 'ShareL v1.0.0 Initial Release',
          body: 'Initial release with Wayland screenshot, recording studio, and ShareX hub.',
          html_url: 'https://github.com/44tl/ShareL/releases/tag/v1.0.0',
          published_at: '2026-08-15T12:00:00Z',
          prerelease: false,
          draft: false,
          assets: [{ name: 'ShareL-x86_64.AppImage', browser_download_url: '', size: 32000000 }],
        },
      ] as unknown as T);

    case 'install_update_cmd':
    case 'install_version_tag_cmd':
      return Promise.resolve('Updated ShareL to latest release.' as unknown as T);

    case 'ignore_version_cmd':
    case 'unignore_version_cmd':
      return Promise.resolve(undefined as unknown as T);

    case 'rollback_version_cmd':
      return Promise.resolve({
        success: true,
        message: 'Successfully rolled back to ShareL v1.0.0',
        restored_version: '1.0.0',
      } as unknown as T);

    default:
      return Promise.resolve(undefined as unknown as T);
  }
}

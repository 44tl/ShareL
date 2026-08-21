import React from 'react';
import {
  Folder,
  Sliders,
  Bell,
  Cpu,
  Keyboard,
  Layers,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  History,
  Trash2,
} from 'lucide-react';
import { AppConfig, CheckUpdateResult, GlobalShortcuts, ReleaseInfo, SystemEnvironmentInfo } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface SettingsPanelProps {
  config: AppConfig | null;
  environment?: SystemEnvironmentInfo | null;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
  updateInfo?: CheckUpdateResult | null;
  onCheckForUpdates?: () => Promise<void>;
  onTriggerUpdateModal?: () => void;
  onRollback?: (versionTag?: string) => Promise<void>;
  availableReleases?: ReleaseInfo[];
  onUnignoreVersion?: (ver: string) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  environment,
  onUpdateConfig,
  updateInfo,
  onCheckForUpdates,
  onTriggerUpdateModal,
  onRollback,
  availableReleases = [],
  onUnignoreVersion,
}) => {
  const [checkingUpdates, setCheckingUpdates] = React.useState(false);
  const [selectedRollbackTag, setSelectedRollbackTag] = React.useState<string>('');
  if (!config) return null;

  const handleChange = <K extends keyof AppConfig>(key: K, val: AppConfig[K]) => {
    const updated = { ...config, [key]: val };
    onUpdateConfig(updated);
  };

  const handleAfterUploadChange = (key: keyof AppConfig['after_upload'], val: boolean) => {
    const updated = {
      ...config,
      after_upload: {
        ...config.after_upload,
        [key]: val,
      },
    };
    onUpdateConfig(updated);
  };

  const handleShortcutChange = (key: keyof GlobalShortcuts, val: string) => {
    const updated = {
      ...config,
      shortcuts: {
        ...config.shortcuts,
        [key]: val,
      },
    };
    onUpdateConfig(updated);
  };

  const shortcutFields: { key: keyof GlobalShortcuts; label: string; placeholder: string }[] = [
    { key: 'capture_region', label: 'Capture Region', placeholder: 'Ctrl+Shift+PrintScreen' },
    { key: 'capture_fullscreen', label: 'Capture Fullscreen', placeholder: 'PrintScreen' },
    { key: 'capture_window', label: 'Capture Window', placeholder: 'Alt+PrintScreen' },
    { key: 'capture_active_screen', label: 'Capture Active Screen', placeholder: 'Ctrl+PrintScreen' },
    { key: 'open_main_window', label: 'Open Main Window', placeholder: 'Ctrl+Shift+Space' },
    { key: 'stop_recording', label: 'Stop Recording', placeholder: 'Ctrl+Shift+X' },
    { key: 'upload_last_capture', label: 'Upload Last Capture', placeholder: 'Ctrl+Shift+U' },
    { key: 'ocr_last_capture', label: 'OCR Last Capture', placeholder: 'Ctrl+Shift+O' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '28px', gap: '24px', maxWidth: '780px', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Configure Wayland compositors, capture backends, storage paths, and global shortcuts.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Wayland Compositor &amp; Backend Architecture
            </h2>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--md-sys-color-primary)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {environment?.compositor_name || 'Detecting Compositor...'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {[
            {
              name: 'XDG Desktop Portal',
              desc: 'ashpd screenshot & screencast API',
              available: environment?.backends.xdg_desktop_portal ?? true,
            },
            {
              name: 'grim / slurp',
              desc: 'Direct Wayland screencopy & selection',
              available: (environment?.backends.grim && environment?.backends.slurp) ?? false,
            },
            {
              name: 'gpu-screen-recorder',
              desc: 'Hardware accelerated (NVENC / VAAPI)',
              available: environment?.backends.gpu_screen_recorder ?? false,
            },
            {
              name: 'wf-recorder',
              desc: 'Wayland wlroots / Niri screencopy recorder',
              available: environment?.backends.wf_recorder ?? false,
            },
            {
              name: 'Compositor Integration',
              desc: environment?.backends.compositor_cli_name ? `Native CLI (${environment.backends.compositor_cli_name})` : 'Compositor-specific IPC',
              available: environment?.backends.compositor_integration ?? false,
            },
          ].map((b) => (
            <div
              key={b.name}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                border: '1px solid var(--md-sys-color-outline-variant)',
              }}
            >
              {b.available ? (
                <CheckCircle2 size={16} color="var(--md-sys-color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
              ) : (
                <XCircle size={16} color="var(--md-sys-color-on-surface-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {b.name}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                  {b.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Preferred Screenshot Backend
            </label>
            <CustomDropdown
              value={config.preferred_screenshot_backend || 'auto'}
              onChange={(val) => handleChange('preferred_screenshot_backend', val)}
              options={[
                { value: 'auto', label: 'Auto (Intelligent Wayland Router)' },
                { value: 'grim_slurp', label: 'grim / slurp (Fast & Direct)' },
                { value: 'xdg_desktop_portal', label: 'XDG Desktop Portal' },
                { value: 'compositor', label: 'Compositor Native (Niri/Hyprland)' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Preferred Recording Backend
            </label>
            <CustomDropdown
              value={config.preferred_recording_backend || 'auto'}
              onChange={(val) => handleChange('preferred_recording_backend', val)}
              options={[
                { value: 'auto', label: 'Auto (Hardware Acceleration First)' },
                { value: 'gpu-screen-recorder', label: 'gpu-screen-recorder (NVENC/VAAPI)' },
                { value: 'wf-recorder', label: 'wf-recorder (Wayland Screencopy)' },
                { value: 'ffmpeg', label: 'ffmpeg (Software Grabber)' },
              ]}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={18} color="var(--md-sys-color-primary)" />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            Storage Paths &amp; File Naming
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
              Screenshots Save Directory
            </label>
            <input
              type="text"
              value={config.save_directory}
              onChange={(e) => handleChange('save_directory', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
              Recordings Save Directory
            </label>
            <input
              type="text"
              value={config.recordings_directory}
              onChange={(e) => handleChange('recordings_directory', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
              File Naming Pattern
            </label>
            <input
              type="text"
              value={config.file_naming_pattern}
              onChange={(e) => handleChange('file_naming_pattern', e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', marginTop: '4px', display: 'block' }}>
              Format tokens: %Y (Year), %m (Month), %d (Day), %H (Hour), %M (Minute), %S (Second)
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--md-sys-color-primary)" />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            Formats &amp; Recording Quality
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Default Image Format
            </label>
            <CustomDropdown
              value={config.default_image_format}
              onChange={(val) => handleChange('default_image_format', val)}
              options={[
                { value: 'png', label: 'PNG (Lossless)' },
                { value: 'jpg', label: 'JPEG (Compressed)' },
                { value: 'webp', label: 'WebP (Modern)' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Default Recording Format
            </label>
            <CustomDropdown
              value={config.default_recording_format}
              onChange={(val) => handleChange('default_recording_format', val)}
              options={[
                { value: 'gif', label: 'GIF (Palette Optimized)' },
                { value: 'mp4', label: 'MP4 (H.264 Video)' },
                { value: 'webm', label: 'WebM (VP9 Video)' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Recording Framerate
            </label>
            <CustomDropdown
              value={config.recording_fps || 60}
              onChange={(val) => handleChange('recording_fps', Number(val))}
              options={[
                { value: 15, label: '15 FPS' },
                { value: 30, label: '30 FPS' },
                { value: 60, label: '60 FPS (Fluid)' },
                { value: 120, label: '120 FPS (Ultra)' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Video Codec
            </label>
            <CustomDropdown
              value={config.recording_codec || 'h264'}
              onChange={(val) => handleChange('recording_codec', val)}
              options={[
                { value: 'h264', label: 'H.264 (Universal)' },
                { value: 'hevc', label: 'H.265 / HEVC' },
                { value: 'av1', label: 'AV1' },
                { value: 'vp9', label: 'VP9' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Video Bitrate
            </label>
            <CustomDropdown
              value={config.recording_bitrate_kbps || 8000}
              onChange={(val) => handleChange('recording_bitrate_kbps', Number(val))}
              options={[
                { value: 2500, label: '2.5 Mbps' },
                { value: 5000, label: '5.0 Mbps' },
                { value: 8000, label: '8.0 Mbps' },
                { value: 12000, label: '12.0 Mbps' },
                { value: 20000, label: '20.0 Mbps' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Audio Source
            </label>
            <CustomDropdown
              value={config.recording_audio_source || 'none'}
              onChange={(val) => handleChange('recording_audio_source', val)}
              options={[
                { value: 'none', label: 'No Audio (Muted)' },
                { value: 'system', label: 'Desktop / System Audio' },
                { value: 'microphone', label: 'Microphone Voice' },
                { value: 'both', label: 'System + Microphone' },
              ]}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--md-sys-color-on-surface)' }}>Capture Mouse Cursor</span>
            <input
              type="checkbox"
              checked={config.recording_capture_cursor ?? true}
              onChange={(e) => handleChange('recording_capture_cursor', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--md-sys-color-on-surface)' }}>Auto-Upload Recording</span>
            <input
              type="checkbox"
              checked={config.recording_auto_upload ?? false}
              onChange={(e) => handleChange('recording_auto_upload', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="var(--md-sys-color-primary)" />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            After Upload Workflows
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.after_upload.copy_url_to_clipboard}
              onChange={(e) => handleAfterUploadChange('copy_url_to_clipboard', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
            <span>Copy uploaded URL to clipboard automatically</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.after_upload.open_url_in_browser}
              onChange={(e) => handleAfterUploadChange('open_url_in_browser', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
            <span>Open uploaded link in default web browser</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.after_upload.show_notification}
              onChange={(e) => handleAfterUploadChange('show_notification', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
            <span>Show desktop system notification upon successful upload</span>
          </label>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Keyboard size={18} color="var(--md-sys-color-primary)" />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            Global Keyboard Shortcuts
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {shortcutFields.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                {f.label}
              </label>
              <input
                type="text"
                value={config.shortcuts[f.key]}
                onChange={(e) => handleShortcutChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', fontFamily: 'Roboto Mono' }}
              />
            </div>
          ))}
        </div>

        <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Shortcuts are registered system-wide. Format: Ctrl+Shift+PrintScreen, Alt+P, etc. Leave empty to disable an action.
        </span>
      </div>

      {/* Software Updates & Releases Section */}
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Software Updates &amp; GitHub Releases
            </h2>
          </div>

          <button
            onClick={async () => {
              if (onCheckForUpdates) {
                setCheckingUpdates(true);
                await onCheckForUpdates();
                setCheckingUpdates(false);
              }
            }}
            disabled={checkingUpdates}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: checkingUpdates ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: checkingUpdates ? 'spin 1s linear infinite' : 'none' }} />
            <span>{checkingUpdates ? 'Checking...' : 'Check for Updates'}</span>
          </button>
        </div>

        {updateInfo?.has_update && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>
                New version available: v{updateInfo.latest_version}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                {updateInfo.release_name}
              </span>
            </div>

            <button
              onClick={onTriggerUpdateModal}
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View &amp; Install Update
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--md-sys-color-on-surface)' }}>Check updates on app startup</span>
            <input
              type="checkbox"
              checked={config.check_updates_on_startup ?? true}
              onChange={(e) => handleChange('check_updates_on_startup', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--md-sys-color-on-surface)' }}>Automatic periodic checks</span>
            <input
              type="checkbox"
              checked={config.auto_check_updates ?? true}
              onChange={(e) => handleChange('auto_check_updates', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Ignored Versions List */}
        {config.ignored_versions && config.ignored_versions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)' }}>
              Ignored / Skipped Versions
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {config.ignored_versions.map((ver) => (
                <div
                  key={ver}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '11.5px',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                  }}
                >
                  <span>v{ver}</span>
                  <button
                    onClick={() => onUnignoreVersion?.(ver)}
                    title="Unignore this version"
                    style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-error)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rollback & Revert Tool */}
        <div
          style={{
            marginTop: '8px',
            padding: '14px',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={15} color="var(--md-sys-color-primary)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Version Rollback &amp; Release Reversion
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', margin: 0 }}>
            Revert to previous installed backup or switch directly to any prior GitHub release tag.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <CustomDropdown
                value={selectedRollbackTag}
                onChange={(val) => setSelectedRollbackTag(val)}
                options={[
                  { value: '', label: 'Previous Backup Binary (Default)' },
                  ...availableReleases.map((r) => ({
                    value: r.tag_name,
                    label: `${r.tag_name} - ${r.name || 'Release'} (${r.published_at ? new Date(r.published_at).toLocaleDateString() : ''})`,
                  })),
                ]}
              />
            </div>
            <button
              onClick={() => onRollback?.(selectedRollbackTag || undefined)}
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                border: '1px solid var(--md-sys-color-outline)',
                color: 'var(--md-sys-color-on-surface)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Execute Revert
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
        }}
      >
        <Cpu size={20} color="var(--md-sys-color-success)" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            {environment?.compositor_name || 'Wayland Environment'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
            Session: {environment?.session_type.toUpperCase() || 'WAYLAND'} • Wayland Display: {environment?.wayland_display || ':0'} • First-class Niri, Hyprland, Sway &amp; COSMIC support.
          </span>
        </div>
      </div>
    </div>
  );
};

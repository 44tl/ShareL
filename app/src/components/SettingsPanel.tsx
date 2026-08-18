import React from 'react';
import {
  Folder,
  Sliders,
  Bell,
  Cpu,
} from 'lucide-react';
import { AppConfig } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface SettingsPanelProps {
  config: AppConfig | null;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onUpdateConfig,
}) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '28px', gap: '24px', maxWidth: '780px', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Configure file storage, naming templates, capture workflows, and encoding parameters.
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
              value={config.recording_fps}
              onChange={(val) => handleChange('recording_fps', Number(val))}
              options={[
                { value: 15, label: '15 FPS (Smooth GIF)' },
                { value: 30, label: '30 FPS (Standard Video)' },
                { value: 60, label: '60 FPS (High Motion)' },
              ]}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '6px' }}>
              Audio Recording
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '10px',
                fontSize: '13px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={config.recording_include_audio}
                onChange={(e) => handleChange('recording_include_audio', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
              />
              <span>Record PulseAudio / PipeWire audio stream</span>
            </label>
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
            Linux Desktop Environment
          </span>
          <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
            Wayland session with native XDG Desktop Portal integration.
          </span>
        </div>
      </div>
    </div>
  );
};

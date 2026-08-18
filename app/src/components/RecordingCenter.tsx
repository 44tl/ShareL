import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Square,
  Pause,
  Monitor,
  AppWindow,
  Crop,
  Mic,
  Volume2,
  MousePointer,
  Camera,
  Layers,
  Sparkles,
  CloudUpload,
  FolderOpen,
  CheckCircle2,
  FileCode,
  Gauge,
} from 'lucide-react';
import { AppConfig, CustomUploaderConfig, RecordingOptions, RecordingResult, RecordingStatus, SystemEnvironmentInfo } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { invokeCommand } from '../lib/tauri';

interface RecordingCenterProps {
  config: AppConfig | null;
  recordingStatus: RecordingStatus;
  onStartAdvancedRecording: (options: RecordingOptions) => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => Promise<void>;
  onResumeRecording: () => Promise<void>;
  lastRecording: RecordingResult | null;
  onShowInFolder: (path: string) => void;
  onUploadFile: (path: string) => Promise<void>;
  uploaders: CustomUploaderConfig[];
  environment?: SystemEnvironmentInfo | null;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
}

export const RecordingCenter: React.FC<RecordingCenterProps> = ({
  config,
  recordingStatus,
  onStartAdvancedRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  lastRecording,
  onShowInFolder,
  onUploadFile,
  uploaders,
  environment,
  onUpdateConfig,
}) => {
  const [mode, setMode] = useState<'fullscreen' | 'window' | 'region'>('fullscreen');
  const [format, setFormat] = useState<string>(config?.default_recording_format || 'mp4');
  const [fps, setFps] = useState<number>(config?.recording_fps || 60);
  const [customFps, setCustomFps] = useState<string>('60');
  const [isCustomFps, setIsCustomFps] = useState<boolean>(false);
  const [bitrateKbps, setBitrateKbps] = useState<number>(config?.recording_bitrate_kbps || 8000);
  const [codec, setCodec] = useState<string>(config?.recording_codec || 'h264');
  const [audioSource, setAudioSource] = useState<string>(config?.recording_audio_source || 'none');
  const [separateAudio, setSeparateAudio] = useState<boolean>(false);
  const [captureCursor, setCaptureCursor] = useState<boolean>(config?.recording_capture_cursor ?? true);
  const [highlightCursor, setHighlightCursor] = useState<boolean>(config?.recording_highlight_cursor ?? false);
  const [webcamOverlay, setWebcamOverlay] = useState<boolean>(config?.recording_webcam_overlay ?? false);
  const [webcamDevice, setWebcamDevice] = useState<string>(config?.recording_webcam_device || '/dev/video0');
  const [webcamPosition, setWebcamPosition] = useState<string>(config?.recording_webcam_position || 'bottom_right');
  const [webcamDevices, setWebcamDevices] = useState<string[]>([]);
  const [filenameTemplate, setFilenameTemplate] = useState<string>(config?.recording_filename_template || 'ShareL_Rec_{date}_{time}');
  const [autoUpload, setAutoUpload] = useState<boolean>(config?.recording_auto_upload ?? false);

  useEffect(() => {
    invokeCommand<string[]>('list_webcam_devices_cmd')
      .then((devs) => {
        if (devs && devs.length > 0) {
          setWebcamDevices(devs);
          if (!devs.includes(webcamDevice)) {
            setWebcamDevice(devs[0]);
          }
        }
      })
      .catch(() => {});
  }, [webcamDevice]);

  const activeUploader = uploaders.find((u) => u.id === config?.active_uploader_id) || uploaders[0];

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    const finalFps = isCustomFps ? Math.max(15, parseInt(customFps, 10) || 60) : fps;
    const options: RecordingOptions = {
      recordings_dir: config?.recordings_directory || '',
      format,
      fps: finalFps,
      bitrate_kbps: bitrateKbps,
      codec,
      audio_source: audioSource,
      record_microphone: audioSource === 'microphone' || audioSource === 'both' || audioSource === 'separate',
      record_system_audio: audioSource === 'system' || audioSource === 'both' || audioSource === 'separate',
      separate_audio_tracks: separateAudio,
      capture_cursor: captureCursor,
      highlight_cursor: highlightCursor,
      webcam_device: webcamOverlay ? webcamDevice : undefined,
      webcam_position: webcamOverlay ? webcamPosition : undefined,
      mode,
      preferred_backend: config?.preferred_recording_backend || 'auto',
      filename_template: filenameTemplate,
      auto_upload: autoUpload,
    };

    if (config) {
      const updatedConfig: AppConfig = {
        ...config,
        default_recording_format: format,
        recording_fps: finalFps,
        recording_bitrate_kbps: bitrateKbps,
        recording_codec: codec,
        recording_audio_source: audioSource,
        recording_capture_cursor: captureCursor,
        recording_highlight_cursor: highlightCursor,
        recording_webcam_overlay: webcamOverlay,
        recording_webcam_device: webcamDevice,
        recording_webcam_position: webcamPosition,
        recording_filename_template: filenameTemplate,
        recording_auto_upload: autoUpload,
      };
      onUpdateConfig(updatedConfig).catch(() => {});
    }

    await onStartAdvancedRecording(options);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '28px',
        height: '100%',
        backgroundColor: 'var(--md-sys-color-background)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
              Recording Control Center
            </h1>
            {environment && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--md-sys-color-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Layers size={12} />
                <span>{environment.compositor_name}</span>
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Hardware-accelerated screencasting, window targeting, audio track routing, and GIF encoding.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {recordingStatus.is_recording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 16px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: recordingStatus.is_paused ? 'var(--md-sys-color-warning)' : 'var(--md-sys-color-error)',
                  boxShadow: recordingStatus.is_paused ? '0 0 8px var(--md-sys-color-warning)' : '0 0 8px var(--md-sys-color-error)',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--md-sys-color-on-surface)' }}>
                {formatTimer(recordingStatus.duration_seconds)}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', textTransform: 'uppercase' }}>
                {recordingStatus.is_paused ? 'PAUSED' : 'REC'}
              </span>
            </div>
          )}

          {recordingStatus.is_recording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={recordingStatus.is_paused ? onResumeRecording : onPauseRecording}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  color: 'var(--md-sys-color-on-surface)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {recordingStatus.is_paused ? <Play size={14} color="var(--md-sys-color-success)" /> : <Pause size={14} color="var(--md-sys-color-warning)" />}
                <span>{recordingStatus.is_paused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={onStopRecording}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--md-sys-color-error)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <Square size={14} fill="#ffffff" />
                <span>Stop Recording</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleStart}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                fontSize: '13.5px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Video size={16} />
              <span>Start Recording</span>
            </button>
          )}
        </div>
      </div>

      {recordingStatus.is_processing && (
        <div
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  borderTopColor: 'var(--md-sys-color-primary)',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {recordingStatus.processing_message || 'Your recording is being processed in the background...'}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Palette optimization &amp; encoding
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '40%',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--md-sys-color-primary)',
                animation: 'indeterminateProgress 1.4s infinite ease-in-out',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Recording Target
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <button
            onClick={() => setMode('fullscreen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '18px',
              backgroundColor: mode === 'fullscreen' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
              border: `1px solid ${mode === 'fullscreen' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'fullscreen' ? 'rgba(99, 102, 241, 0.25)' : 'var(--md-sys-color-surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mode === 'fullscreen' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <Monitor size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '2px' }}>
                Fullscreen Display
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                Capture full active screen resolution
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('window')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '18px',
              backgroundColor: mode === 'window' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
              border: `1px solid ${mode === 'window' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'window' ? 'rgba(99, 102, 241, 0.25)' : 'var(--md-sys-color-surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mode === 'window' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <AppWindow size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '2px' }}>
                Active / Selected Window
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                Direct Wayland window geometry
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('region')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '18px',
              backgroundColor: mode === 'region' ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
              border: `1px solid ${mode === 'region' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'region' ? 'rgba(99, 102, 241, 0.25)' : 'var(--md-sys-color-surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mode === 'region' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              }}
            >
              <Crop size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '2px' }}>
                Custom Area / Region
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                Interactive slurp selection box
              </div>
            </div>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '10px' }}>
            <Gauge size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Video &amp; Encoding Engine
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                Framerate (FPS)
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[30, 60, 120].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setFps(rate);
                      setIsCustomFps(false);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: !isCustomFps && fps === rate ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                      color: !isCustomFps && fps === rate ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
                      border: '1px solid var(--md-sys-color-outline-variant)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {rate} FPS
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomFps(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isCustomFps ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                    color: isCustomFps ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Custom
                </button>
                {isCustomFps && (
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={customFps}
                    onChange={(e) => setCustomFps(e.target.value)}
                    style={{
                      width: '70px',
                      backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      border: '1px solid var(--md-sys-color-outline)',
                      color: 'var(--md-sys-color-on-surface)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                  Container Format
                </label>
                <CustomDropdown
                  value={format}
                  onChange={(val) => setFormat(String(val))}
                  width="100%"
                  options={[
                    { value: 'mp4', label: 'MP4 (.mp4)' },
                    { value: 'mkv', label: 'MKV (.mkv)' },
                    { value: 'webm', label: 'WebM (.webm)' },
                    { value: 'gif', label: 'Animated GIF (.gif)' },
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                  Video Codec
                </label>
                <CustomDropdown
                  value={codec}
                  onChange={(val) => setCodec(String(val))}
                  width="100%"
                  options={[
                    { value: 'h264', label: 'H.264 (Universal)' },
                    { value: 'hevc', label: 'H.265 / HEVC' },
                    { value: 'av1', label: 'AV1 (Next-Gen)' },
                    { value: 'vp9', label: 'VP9' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                Video Bitrate
              </label>
              <CustomDropdown
                value={bitrateKbps}
                onChange={(val) => setBitrateKbps(Number(val))}
                width="100%"
                options={[
                  { value: 2500, label: '2.5 Mbps (Low bandwidth)' },
                  { value: 5000, label: '5.0 Mbps (Standard 1080p)' },
                  { value: 8000, label: '8.0 Mbps (High Quality 60FPS)' },
                  { value: 12000, label: '12.0 Mbps (Ultra 1440p)' },
                  { value: 20000, label: '20.0 Mbps (Crisp 4K)' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '10px' }}>
            <Volume2 size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Audio Track Routing
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                Audio Input Source
              </label>
              <CustomDropdown
                value={audioSource}
                onChange={(val) => setAudioSource(String(val))}
                width="100%"
                options={[
                  { value: 'none', label: 'No Audio (Muted)' },
                  { value: 'system', label: 'Desktop / System Audio Only' },
                  { value: 'microphone', label: 'Microphone Voice Input Only' },
                  { value: 'both', label: 'Mixed Desktop Audio + Microphone' },
                ]}
              />
            </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mic size={16} color="var(--md-sys-color-primary)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                    Separate Audio Tracks
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                    Record system audio &amp; mic into distinct MKV/MP4 channels
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={separateAudio}
                onChange={(e) => setSeparateAudio(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
        <div
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '10px' }}>
            <Sparkles size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Visual Overlays &amp; Cursor
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MousePointer size={15} color="var(--md-sys-color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>Capture Mouse Cursor</span>
              </div>
              <input
                type="checkbox"
                checked={captureCursor}
                onChange={(e) => setCaptureCursor(e.target.checked)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={15} color="var(--md-sys-color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>Highlight Cursor Clicks</span>
              </div>
              <input
                type="checkbox"
                checked={highlightCursor}
                onChange={(e) => setHighlightCursor(e.target.checked)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={15} color="var(--md-sys-color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>Webcam Picture-in-Picture</span>
              </div>
              <input
                type="checkbox"
                checked={webcamOverlay}
                onChange={(e) => setWebcamOverlay(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
              />
            </label>

            {webcamOverlay && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '4px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '4px' }}>
                    Webcam Video Device
                  </label>
                  <CustomDropdown
                    value={webcamDevice}
                    onChange={(val) => setWebcamDevice(String(val))}
                    width="100%"
                    options={
                      webcamDevices.length > 0
                        ? webcamDevices.map((d) => ({ value: d, label: d }))
                        : [{ value: '/dev/video0', label: '/dev/video0' }]
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '4px' }}>
                    Overlay Position
                  </label>
                  <CustomDropdown
                    value={webcamPosition}
                    onChange={(val) => setWebcamPosition(String(val))}
                    width="100%"
                    options={[
                      { value: 'bottom_right', label: 'Bottom Right' },
                      { value: 'bottom_left', label: 'Bottom Left' },
                      { value: 'top_right', label: 'Top Right' },
                      { value: 'top_left', label: 'Top Left' },
                    ]}
                  />
                </div>
              </div>
            )}
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
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '10px' }}>
            <FileCode size={16} color="var(--md-sys-color-primary)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Filename Template &amp; Automation
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '6px' }}>
                Naming Template (tags: <code>&#123;date&#125;</code>, <code>&#123;time&#125;</code>, <code>&#123;fps&#125;</code>, <code>&#123;codec&#125;</code>)
              </label>
              <input
                type="text"
                value={filenameTemplate}
                onChange={(e) => setFilenameTemplate(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--md-sys-color-surface-container-high)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CloudUpload size={15} color="var(--md-sys-color-primary)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                    Auto-Upload to Active Destination
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                    Target: {activeUploader ? activeUploader.Name : 'None configured'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoUpload}
                onChange={(e) => setAutoUpload(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
      </div>

      {lastRecording && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={20} color="var(--md-sys-color-success)" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {lastRecording.file_name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                Format: {lastRecording.format.toUpperCase()} • Duration: {lastRecording.duration_seconds}s • Size: {Math.round(lastRecording.file_size / 1024)} KB • Backend: {lastRecording.backend_used || 'system'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onUploadFile(lastRecording.file_path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <CloudUpload size={14} />
              <span>Upload</span>
            </button>

            <button
              onClick={() => onShowInFolder(lastRecording.file_path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--md-sys-color-outline-variant)',
              }}
            >
              <FolderOpen size={14} />
              <span>Show in Folder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

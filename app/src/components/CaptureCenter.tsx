import React, { useState } from 'react';
import {
  Camera,
  Monitor,
  AppWindow,
  Video,
  Film,
  Clock,
  UploadCloud,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { CaptureResult, RecordingResult } from '../types';

interface CaptureCenterProps {
  onTriggerCapture: (mode: string, delayMs: number) => Promise<void>;
  onStartRecording: (format: string, fps: number, audio: boolean) => Promise<void>;
  onOpenImageInEditor: (dataUrl: string, filePath?: string) => void;
  lastCapture: CaptureResult | null;
  lastRecording: RecordingResult | null;
  onCopyPath: (path: string) => void;
  onShowInFolder: (path: string) => void;
}

export const CaptureCenter: React.FC<CaptureCenterProps> = ({
  onTriggerCapture,
  onStartRecording,
  onOpenImageInEditor,
  lastCapture,
  lastRecording,
  onShowInFolder,
}) => {
  const [delaySeconds, setDelaySeconds] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleCapture = async (mode: string) => {
    setIsCapturing(true);
    try {
      await onTriggerCapture(mode, delaySeconds * 1000);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onOpenImageInEditor(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
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
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', marginBottom: '4px' }}>
            Capture Hub
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
            High-performance Wayland screen capture and media workflow automation.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 14px',
          }}
        >
          <Clock size={16} color="var(--md-sys-color-primary)" />
          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>Delay:</span>
          <select
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Number(e.target.value))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--md-sys-color-on-surface)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            <option value={0}>0s (Instant)</option>
            <option value={1}>1s</option>
            <option value={2}>2s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Screenshots
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <button
            onClick={() => handleCapture('region')}
            disabled={isCapturing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '22px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '4px' }}>
                Capture Region
              </div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Select arbitrary rectangle or area with interactive magnifier
              </div>
            </div>
          </button>

          <button
            onClick={() => handleCapture('fullscreen')}
            disabled={isCapturing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '22px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              <Monitor size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '4px' }}>
                Capture Fullscreen
              </div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Grab full display resolution instantly
              </div>
            </div>
          </button>

          <button
            onClick={() => handleCapture('window')}
            disabled={isCapturing}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '22px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              <AppWindow size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '4px' }}>
                Capture Window
              </div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Target specific application window on Wayland
              </div>
            </div>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Recordings
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <button
            onClick={() => onStartRecording('gif', 15, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '18px 22px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-warning)',
              }}
            >
              <Video size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                Record Animated GIF
              </div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                Two-pass optimal palette generation for web and chat sharing
              </div>
            </div>
          </button>

          <button
            onClick={() => onStartRecording('mp4', 30, false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '18px 22px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-success)',
              }}
            >
              <Film size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                Record MP4 Video
              </div>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>
                High framerate H.264 video encoding via wf-recorder and ffmpeg
              </div>
            </div>
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        style={{
          border: `1px dashed ${dragOver ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          backgroundColor: dragOver ? 'var(--md-sys-color-surface-container-high)' : 'var(--md-sys-color-surface-container)',
        }}
      >
        <UploadCloud size={28} color="var(--md-sys-color-on-surface-muted)" />
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
          Drag and drop any image here to annotate or upload
        </div>
        <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Supports PNG, JPG, WebP, GIF
        </div>
      </div>

      {lastCapture && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={18} color="var(--md-sys-color-success)" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {lastCapture.file_name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                {lastCapture.width}x{lastCapture.height} px ({Math.round(lastCapture.file_size / 1024)} KB)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onOpenImageInEditor(lastCapture.data_url, lastCapture.file_path)}
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              Open in Editor
            </button>

            <button
              onClick={() => onShowInFolder(lastCapture.file_path)}
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

      {lastRecording && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={18} color="var(--md-sys-color-success)" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {lastRecording.file_name}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                Duration: {lastRecording.duration_seconds}s ({Math.round(lastRecording.file_size / 1024)} KB)
              </div>
            </div>
          </div>

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
      )}
    </div>
  );
};

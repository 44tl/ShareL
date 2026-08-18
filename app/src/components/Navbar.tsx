import React from 'react';
import { Camera, Video, Circle, ShieldCheck, Monitor } from 'lucide-react';
import { RecordingStatus } from '../types';

interface NavbarProps {
  recordingStatus: RecordingStatus;
  onQuickCapture: (mode: string) => void;
  onStartRecording: (format: string, fps: number, audio: boolean) => void;
  onStopRecording: () => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  recordingStatus,
  onQuickCapture,
  onStartRecording,
  onStopRecording,
}) => {
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRecordButtonClick = () => {
    if (recordingStatus.is_recording) {
      onStopRecording();
    } else {
      onStartRecording('gif', 30, false);
    }
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <img
          src="/sharel-logo.svg"
          alt="ShareL"
          style={{ width: '30px', height: '30px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            ShareL
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-primary)',
              border: '1px solid var(--md-sys-color-outline-variant)',
            }}
          >
            Wayland Native
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {recordingStatus.is_processing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: 'var(--md-sys-color-primary)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                borderTopColor: 'var(--md-sys-color-primary)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Processing Recording...</span>
          </div>
        )}

        {recordingStatus.is_recording && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-on-error-container)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <Circle size={10} color="var(--md-sys-color-error)" fill="var(--md-sys-color-error)" />
            <span>REC {formatSeconds(recordingStatus.duration_seconds)}</span>
            <button
              onClick={onStopRecording}
              style={{
                backgroundColor: 'var(--md-sys-color-error)',
                color: '#410002',
                padding: '2px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Stop
            </button>
          </div>
        )}

        <button
          onClick={() => onQuickCapture('region')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-on-surface)',
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
        >
          <Camera size={15} color="var(--md-sys-color-primary)" />
          <span>Region</span>
        </button>

        <button
          onClick={() => onQuickCapture('fullscreen')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-on-surface)',
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
        >
          <Monitor size={15} color="var(--md-sys-color-primary)" />
          <span>Fullscreen</span>
        </button>

        <button
          onClick={handleRecordButtonClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: recordingStatus.is_recording ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            color: recordingStatus.is_recording ? '#ffffff' : 'var(--md-sys-color-on-surface)',
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)')}
        >
          <Video size={15} color={recordingStatus.is_recording ? '#ffffff' : 'var(--md-sys-color-primary)'} />
          <span>{recordingStatus.is_recording ? 'Stop Recording' : 'Record GIF'}</span>
        </button>

        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)', margin: '0 4px' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--md-sys-color-on-surface-variant)',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <ShieldCheck size={14} color="var(--md-sys-color-success)" />
          <span>Portal Active</span>
        </div>
      </div>
    </header>
  );
};

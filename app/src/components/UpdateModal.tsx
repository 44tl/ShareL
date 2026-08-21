import React from 'react';
import {
  Sparkles,
  Download,
  X,
  ExternalLink,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { CheckUpdateResult, UpdateProgressEvent } from '../types';

interface UpdateModalProps {
  updateInfo: CheckUpdateResult | null;
  isOpen: boolean;
  onClose: () => void;
  onInstallUpdate: () => Promise<void>;
  onIgnoreVersion: (version: string) => Promise<void>;
  isInstalling: boolean;
  installProgress?: UpdateProgressEvent | null;
  onOpenReleaseUrl: (url: string) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
  onInstallUpdate,
  onIgnoreVersion,
  isInstalling,
  installProgress,
  onOpenReleaseUrl,
}) => {
  if (!isOpen || !updateInfo) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInstalling) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          border: '1px solid var(--md-sys-color-outline-variant)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '620px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                  Software Update Available
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--md-sys-color-primary)',
                    color: '#ffffff',
                  }}
                >
                  v{updateInfo.latest_version}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)', marginTop: '2px' }}>
                Currently on v{updateInfo.current_version} • Published {updateInfo.published_at ? new Date(updateInfo.published_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </div>

          {!isInstalling && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--md-sys-color-on-surface-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-pill)',
                display: 'flex',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-muted)' }}>
              Release Title
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginTop: '4px' }}>
              {updateInfo.release_name || `ShareL v${updateInfo.latest_version}`}
            </div>
          </div>

          {/* Changelog Card */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-on-surface-muted)' }}>
              What's New in this Release
            </span>
            <div
              style={{
                marginTop: '6px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '12.5px',
                lineHeight: '1.6',
                color: 'var(--md-sys-color-on-surface-variant)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Inter, system-ui, sans-serif',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {updateInfo.release_notes || 'No detailed changelog provided for this release.'}
            </div>
          </div>

          {/* Installation Progress state */}
          {isInstalling && (
            <div
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                border: '1px solid var(--md-sys-color-outline)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} color="var(--md-sys-color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                    {installProgress?.message || 'Installing update...'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  {Math.round(installProgress?.progress_pct ?? 0)}%
                </span>
              </div>

              <div
                style={{
                  height: '6px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${installProgress?.progress_pct ?? 0}%`,
                    backgroundColor: 'var(--md-sys-color-primary)',
                    borderRadius: 'var(--radius-pill)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--md-sys-color-outline-variant)',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onOpenReleaseUrl(updateInfo.release_url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'transparent',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <ExternalLink size={14} />
              <span>GitHub Notes</span>
            </button>

            <button
              onClick={() => onIgnoreVersion(updateInfo.latest_version)}
              disabled={isInstalling}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                color: 'var(--md-sys-color-on-surface-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: isInstalling ? 'not-allowed' : 'pointer',
                opacity: isInstalling ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isInstalling) e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)';
              }}
              onMouseLeave={(e) => {
                if (!isInstalling) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <EyeOff size={14} />
              <span>Skip Version</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={isInstalling}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'transparent',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isInstalling ? 'not-allowed' : 'pointer',
                opacity: isInstalling ? 0.5 : 1,
              }}
            >
              Remind Later
            </button>

            <button
              onClick={onInstallUpdate}
              disabled={isInstalling}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: isInstalling ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                opacity: isInstalling ? 0.7 : 1,
              }}
            >
              {isInstalling ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Update to v{updateInfo.latest_version}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

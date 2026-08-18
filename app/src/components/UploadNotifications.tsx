import React from 'react';
import { UploadCloud, CheckCircle2, XCircle, Copy, RotateCw, X } from 'lucide-react';
import { UploadJob } from '../types';

interface UploadNotificationsProps {
  jobs: UploadJob[];
  onCopyUrl: (url: string) => void;
  onRetry: (job: UploadJob) => void;
  onDismiss: (jobId: string) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export const UploadNotifications: React.FC<UploadNotificationsProps> = ({
  jobs,
  onCopyUrl,
  onRetry,
  onDismiss,
}) => {
  if (jobs.length === 0) return null;

  const visible = jobs.slice(-5);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
        zIndex: 200,
        maxWidth: '360px',
        minWidth: '280px',
      }}
    >
      {visible.map((job) => (
        <div
          key={job.jobId}
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-highest)',
            border: `1px solid ${
              job.status === 'error'
                ? 'rgba(242, 184, 181, 0.5)'
                : job.status === 'success'
                ? 'rgba(109, 213, 140, 0.4)'
                : 'var(--md-sys-color-outline-variant)'
            }`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {job.status === 'error' ? (
                <XCircle size={18} color="var(--md-sys-color-error)" />
              ) : job.status === 'success' ? (
                <CheckCircle2 size={18} color="var(--md-sys-color-success)" />
              ) : (
                <UploadCloud size={18} color="var(--md-sys-color-primary)" style={{ animation: 'spin 1.6s linear infinite' }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.fileName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                  {job.status === 'uploading'
                    ? `Uploading to ${job.uploaderName}${job.bytesTotal > 0 ? ` · ${formatBytes(job.bytesSent)} / ${formatBytes(job.bytesTotal)}` : ''}`
                    : job.status === 'success'
                    ? `Uploaded to ${job.uploaderName}${job.durationMs !== undefined ? ` in ${job.durationMs}ms` : ''}`
                    : `Upload failed · ${job.uploaderName}`}
                </div>
              </div>
            </div>

            {job.status !== 'uploading' && (
              <button
                onClick={() => onDismiss(job.jobId)}
                style={{ color: 'var(--md-sys-color-on-surface-muted)', padding: '2px', flexShrink: 0 }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {job.status === 'uploading' && (
            <div style={{ height: '5px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--md-sys-color-surface-container)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(2, job.progress))}%`,
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  transition: 'width 0.15s ease',
                }}
              />
            </div>
          )}

          {job.status === 'error' && (
            <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-error)', wordBreak: 'break-word' }}>
              {job.error || 'Upload failed'}
            </div>
          )}

          {job.status === 'success' && job.url && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
              }}
            >
              <span style={{ fontSize: '11.5px', color: 'var(--md-sys-color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.url}
              </span>
              <button
                onClick={() => onCopyUrl(job.url!)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--md-sys-color-on-surface-variant)', flexShrink: 0, fontSize: '11px', fontWeight: 600 }}
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
          )}

          {job.status === 'error' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onRetry(job)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <RotateCw size={12} />
                <span>Retry Upload</span>
              </button>
              <button
                onClick={() => onDismiss(job.jobId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
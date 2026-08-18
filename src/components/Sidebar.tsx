import React from 'react';
import {
  Camera,
  Edit3,
  CloudUpload,
  Clock,
  Wrench,
  Settings,
  Clipboard,
  Save,
} from 'lucide-react';
import { AppConfig, CustomUploaderConfig } from '../types';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  config: AppConfig | null;
  uploaders: CustomUploaderConfig[];
  onToggleAfterCapture: (key: keyof AppConfig['after_capture']) => void;
  onSelectUploader: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  config,
  uploaders,
  onToggleAfterCapture,
  onSelectUploader,
}) => {
  const navItems = [
    { id: 'capture', label: 'Capture Hub', icon: Camera },
    { id: 'editor', label: 'Image Editor', icon: Edit3 },
    { id: 'destinations', label: 'Destinations (.sxcu)', icon: CloudUpload },
    { id: 'history', label: 'History Gallery', icon: Clock },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--md-sys-color-surface)',
        borderRight: '1px solid var(--md-sys-color-outline-variant)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 12px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'transparent',
                color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13.5px',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} color={isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <div
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--md-sys-color-on-surface-muted)',
              marginBottom: '8px',
            }}
          >
            Active Destination
          </div>

          <select
            value={config?.active_uploader_id || ''}
            onChange={(e) => onSelectUploader(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-on-surface)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              fontSize: '12px',
            }}
          >
            {uploaders.map((u) => (
              <option key={u.id} value={u.id}>
                {u.Name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--md-sys-color-on-surface-muted)',
              marginBottom: '10px',
            }}
          >
            Quick Workflow
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={14} color="var(--md-sys-color-primary)" />
                <span>Clipboard</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.copy_to_clipboard ?? true}
                onChange={() => onToggleAfterCapture('copy_to_clipboard')}
                style={{ cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={14} color="var(--md-sys-color-primary)" />
                <span>Save to File</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.save_to_file ?? true}
                onChange={() => onToggleAfterCapture('save_to_file')}
                style={{ cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={14} color="var(--md-sys-color-primary)" />
                <span>Open in Editor</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.open_in_editor ?? true}
                onChange={() => onToggleAfterCapture('open_in_editor')}
                style={{ cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface-variant)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudUpload size={14} color="var(--md-sys-color-primary)" />
                <span>Auto Upload</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.upload_to_host ?? false}
                onChange={() => onToggleAfterCapture('upload_to_host')}
                style={{ cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};

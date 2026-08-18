import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Video,
  Edit3,
  CloudUpload,
  Clock,
  Wrench,
  Settings,
  Clipboard,
  Save,
  ChevronDown,
  Check,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'capture', label: 'Capture Hub', icon: Camera },
    { id: 'recording', label: 'Recording Studio', icon: Video },
    { id: 'editor', label: 'Image Editor', icon: Edit3 },
    { id: 'destinations', label: 'Destinations (.sxcu)', icon: CloudUpload },
    { id: 'history', label: 'History Gallery', icon: Clock },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const activeUploader = uploaders.find((u) => u.id === config?.active_uploader_id) || uploaders[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          ref={dropdownRef}
          style={{
            position: 'relative',
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

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--md-sys-color-surface-container-high)',
              color: 'var(--md-sys-color-on-surface)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 500,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeUploader ? activeUploader.Name : 'Select Destination'}
            </span>
            <ChevronDown size={14} color="var(--md-sys-color-on-surface-muted)" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                right: '0',
                marginBottom: '6px',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                border: '1px solid var(--md-sys-color-outline)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {uploaders.map((u) => {
                const isSelected = u.id === (config?.active_uploader_id || uploaders[0]?.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUploader(u.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: isSelected ? 'var(--md-sys-color-primary-container)' : 'transparent',
                      color: isSelected ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{u.Name}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          )}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clipboard size={15} color="var(--md-sys-color-primary)" />
                <span>Clipboard</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.copy_to_clipboard ?? true}
                onChange={() => onToggleAfterCapture('copy_to_clipboard')}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Save size={15} color="var(--md-sys-color-primary)" />
                <span>Save to File</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.save_to_file ?? true}
                onChange={() => onToggleAfterCapture('save_to_file')}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={15} color="var(--md-sys-color-primary)" />
                <span>Open in Editor</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.open_in_editor ?? true}
                onChange={() => onToggleAfterCapture('open_in_editor')}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12.5px',
                color: 'var(--md-sys-color-on-surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CloudUpload size={15} color="var(--md-sys-color-primary)" />
                <span>Auto Upload</span>
              </div>
              <input
                type="checkbox"
                checked={config?.after_capture.upload_to_host ?? false}
                onChange={() => onToggleAfterCapture('upload_to_host')}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--md-sys-color-primary)' }}
              />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};

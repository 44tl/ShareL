import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  Star,
  Trash2,
  ExternalLink,
  Clipboard,
  FolderOpen,
  Edit3,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { invokeCommand } from '../lib/tauri';

interface HistoryGalleryProps {
  items: HistoryItem[];
  onOpenInEditor: (filePath: string) => void;
  onCopyImage: (filePath: string) => void;
  onCopyText: (text: string) => void;
  onShowInFolder: (filePath: string) => void;
  onOpenLink: (url: string) => void;
  onToggleFavorite: (id: string) => Promise<void>;
  onDeleteItem: (id: string, deleteFile: boolean) => Promise<void>;
  onClearAll: () => Promise<void>;
}

const HistoryThumbnail: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    if (item.file_path && !hasError) {
      invokeCommand<string>('get_file_data_url', { filePath: item.file_path })
        .then((url) => {
          if (isMounted) setDataUrl(url);
        })
        .catch(() => {
          if (isMounted) setHasError(true);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [item.file_path]);

  if (dataUrl && item.item_type === 'image') {
    return (
      <img
        src={dataUrl}
        alt={item.file_name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  if (dataUrl && item.item_type === 'recording' && item.format === 'gif') {
    return (
      <img
        src={dataUrl}
        alt={item.file_name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return item.item_type === 'image' ? (
    <ImageIcon size={32} color="var(--md-sys-color-primary)" />
  ) : (
    <Video size={32} color="var(--md-sys-color-warning)" />
  );
};

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  items,
  onOpenInEditor,
  onCopyImage,
  onCopyText,
  onShowInFolder,
  onOpenLink,
  onToggleFavorite,
  onDeleteItem,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'recording' | 'uploaded' | 'favorite'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'image') return item.item_type === 'image';
    if (filterType === 'recording') return item.item_type === 'recording';
    if (filterType === 'uploaded') return Boolean(item.upload_url);
    if (filterType === 'favorite') return item.is_favorite;
    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '28px', gap: '20px', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
            Capture History
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
            {items.length} total captures stored
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 12px',
            }}
          >
            <Search size={14} color="var(--md-sys-color-on-surface-muted)" />
            <input
              type="text"
              placeholder="Search captures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                padding: 0,
                fontSize: '12px',
                width: '140px',
              }}
            />
          </div>

          <div style={{ display: 'flex', backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--md-sys-color-outline-variant)', padding: '2px' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: viewMode === 'grid' ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-muted)',
              }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: viewMode === 'list' ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
                color: viewMode === 'list' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-muted)',
              }}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>

          {items.length > 0 && (
            <button
              onClick={onClearAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(242, 184, 181, 0.15)',
                color: 'var(--md-sys-color-error)',
                border: '1px solid rgba(242, 184, 181, 0.3)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '8px' }}>
        {[
          { id: 'all', label: 'All Items' },
          { id: 'image', label: 'Screenshots' },
          { id: 'recording', label: 'Recordings' },
          { id: 'uploaded', label: 'Uploaded' },
          { id: 'favorite', label: 'Favorites' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: filterType === tab.id ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
              color: filterType === tab.id ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              fontSize: '12.5px',
              fontWeight: filterType === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--md-sys-color-on-surface-muted)',
              gap: '12px',
            }}
          >
            <ImageIcon size={36} />
            <div style={{ fontSize: '14px', fontWeight: 500 }}>No captures matching current filter</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    height: '140px',
                    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <HistoryThumbnail item={item} />

                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(17, 19, 24, 0.8)',
                      padding: '5px',
                      borderRadius: '50%',
                      color: item.is_favorite ? 'var(--md-sys-color-warning)' : 'var(--md-sys-color-on-surface-muted)',
                      zIndex: 2,
                    }}
                  >
                    <Star size={14} fill={item.is_favorite ? 'currentColor' : 'none'} />
                  </button>

                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(17, 19, 24, 0.85)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--md-sys-color-primary)',
                      zIndex: 2,
                    }}
                  >
                    {item.format}
                  </span>
                </div>

                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', wordBreak: 'break-all', lineHeight: 1.3 }}>
                    {item.file_name}
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--md-sys-color-on-surface-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatBytes(item.file_size)}</span>
                    <span>{formatDate(item.timestamp)}</span>
                  </div>

                  {item.upload_url && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--md-sys-color-surface-container-high)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 8px',
                        fontSize: '11.5px',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--md-sys-color-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '170px',
                        }}
                      >
                        {item.upload_url}
                      </span>
                      <button
                        onClick={() => onOpenLink(item.upload_url!)}
                        style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.item_type === 'image' && (
                        <>
                          <button
                            onClick={() => onOpenInEditor(item.file_path)}
                            style={{ padding: '5px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-on-surface-variant)' }}
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => onCopyImage(item.file_path)}
                            style={{ padding: '5px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-on-surface-variant)' }}
                            title="Copy Image"
                          >
                            <Clipboard size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onShowInFolder(item.file_path)}
                        style={{ padding: '5px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-on-surface-variant)' }}
                        title="Show in Folder"
                      >
                        <FolderOpen size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => onDeleteItem(item.id, false)}
                      style={{ padding: '5px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-error)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-xs)', overflow: 'hidden', backgroundColor: 'var(--md-sys-color-surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HistoryThumbnail item={item} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.file_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'flex', gap: '12px' }}>
                      <span>{formatBytes(item.file_size)}</span>
                      <span>{formatDate(item.timestamp)}</span>
                      <span>{item.format.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    style={{ padding: '6px', borderRadius: 'var(--radius-xs)', color: item.is_favorite ? 'var(--md-sys-color-warning)' : 'var(--md-sys-color-on-surface-muted)' }}
                  >
                    <Star size={14} fill={item.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  {item.item_type === 'image' && (
                    <button
                      onClick={() => onOpenInEditor(item.file_path)}
                      style={{ padding: '6px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-on-surface-variant)' }}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onShowInFolder(item.file_path)}
                    style={{ padding: '6px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-on-surface-variant)' }}
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id, false)}
                    style={{ padding: '6px', borderRadius: 'var(--radius-xs)', color: 'var(--md-sys-color-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

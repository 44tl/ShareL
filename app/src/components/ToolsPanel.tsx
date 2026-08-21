import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Pipette,
  Ruler,
  FileText,
  QrCode,
  Copy,
  Check,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { OcrResult } from '../types';

interface ToolsPanelProps {
  onCopyText: (text: string) => void;
  onRunOcrOnPath: (filePath: string) => Promise<OcrResult>;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  onCopyText,
  onRunOcrOnPath,
}) => {
  const [activeToolTab, setActiveToolTab] = useState<'color' | 'ruler' | 'ocr' | 'qr'>('color');
  const [selectedColor, setSelectedColor] = useState<string>('#8ab4f8');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [ocrText, setOcrText] = useState<string>('');
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [qrInput, setQrInput] = useState<string>('https://github.com/44tl/ShareL');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(qrInput || 'ShareL', { width: 360, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!alive) return;
        setQrDataUrl(url);
        setQrError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setQrDataUrl('');
        setQrError(err instanceof Error ? err.message : 'Failed to generate QR code');
      });
    return () => {
      alive = false;
    };
  }, [qrInput]);

  const [rulerWidth, setRulerWidth] = useState<number>(640);
  const [rulerHeight, setRulerHeight] = useState<number>(480);

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgb = hexToRgb(selectedColor);
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const rgbaString = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1.0)`;

  const copyFormat = (text: string, key: string) => {
    onCopyText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setOcrLoading(true);
      setOcrError(null);
      try {
        const file = e.target.files[0];
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await onRunOcrOnPath(dataUrl);
        if (res.success) {
          setOcrText(res.text);
        } else {
          setOcrError(res.error || 'Failed to extract text');
        }
      } catch (err) {
        setOcrError(String(err));
      } finally {
        setOcrLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '28px', gap: '20px', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
          Utilities
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          Essential tools for screen color sampling, pixel calculation, OCR and QR generation.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '8px' }}>
        {[
          { id: 'color', label: 'Color Picker', icon: Pipette },
          { id: 'ruler', label: 'Pixel Ruler', icon: Ruler },
          { id: 'ocr', label: 'OCR Text Extractor', icon: FileText },
          { id: 'qr', label: 'QR Generator', icon: QrCode },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeToolTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveToolTab(t.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isActive ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
                color: isActive ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeToolTab === 'color' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
          <div
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: selectedColor,
                border: '1px solid var(--md-sys-color-outline-variant)',
                flexShrink: 0,
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                Pick Color:
              </div>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{ width: '100%', height: '36px', cursor: 'pointer', padding: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)' }}>
              Color Formats
            </div>

            {[
              { label: 'HEX', val: selectedColor.toUpperCase(), key: 'hex' },
              { label: 'RGB', val: rgbString, key: 'rgb' },
              { label: 'RGBA', val: rgbaString, key: 'rgba' },
              { label: 'Raw R, G, B', val: `${rgb.r}, ${rgb.g}, ${rgb.b}`, key: 'raw' },
            ].map((f) => (
              <div
                key={f.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{f.label}:</span>
                <span style={{ fontSize: '13px', fontFamily: 'Roboto Mono', color: 'var(--md-sys-color-on-surface)' }}>
                  {f.val}
                </span>
                <button
                  onClick={() => copyFormat(f.val, f.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '11px',
                    color: copiedKey === f.key ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  {copiedKey === f.key ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedKey === f.key ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeToolTab === 'ruler' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
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
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Pixel Dimension Calculator
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  Width (px)
                </label>
                <input
                  type="number"
                  value={rulerWidth}
                  onChange={(e) => setRulerWidth(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  Height (px)
                </label>
                <input
                  type="number"
                  value={rulerHeight}
                  onChange={(e) => setRulerHeight(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block' }}>Area:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>
                  {(rulerWidth * rulerHeight).toLocaleString()} px²
                </span>
              </div>
              <div style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block' }}>Diagonal:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {Math.round(Math.sqrt(rulerWidth * rulerWidth + rulerHeight * rulerHeight))} px
                </span>
              </div>
              <div style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block' }}>Aspect Ratio:</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {(rulerWidth / (rulerHeight || 1)).toFixed(2)}:1
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeToolTab === 'ocr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
          <div
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                Optical Character Recognition (OCR)
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Upload size={13} />
                <span>Select Image</span>
                <input type="file" accept="image/*" onChange={handleOcrFile} style={{ display: 'none' }} />
              </label>
            </div>

            {ocrLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--md-sys-color-primary)', fontSize: '12px' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Processing optical character recognition...</span>
              </div>
            )}

            {ocrError && (
              <div style={{ color: 'var(--md-sys-color-error)', fontSize: '12px', padding: '8px', backgroundColor: 'rgba(242, 184, 181, 0.1)', borderRadius: '4px' }}>
                {ocrError}
              </div>
            )}

            <textarea
              rows={8}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="Recognized text output will appear here..."
              style={{
                width: '100%',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-on-surface)',
                fontFamily: 'Roboto Mono',
                fontSize: '12px',
                padding: '12px',
                border: '1px solid var(--md-sys-color-outline-variant)',
              }}
            />

            {ocrText && (
              <button
                onClick={() => copyFormat(ocrText, 'ocr')}
                style={{
                  alignSelf: 'flex-end',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--md-sys-color-primary)',
                  color: 'var(--md-sys-color-on-primary)',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Copy size={13} />
                <span>Copy Text</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeToolTab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
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
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Generate QR Code
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                Content / URL
              </label>
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
                alignSelf: 'stretch',
                minHeight: '220px',
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  style={{ width: '180px', height: '180px' }}
                />
              ) : (
                <span style={{ fontSize: '12px', color: '#5f6368' }}>
                  {qrError || 'Enter content to generate a QR code'}
                </span>
              )}
              <span style={{ fontSize: '10px', color: '#9aa0a6' }}>
                Generated locally - nothing leaves this device
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

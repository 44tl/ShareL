import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MousePointer,
  ArrowUpRight,
  ListOrdered,
  Square,
  Circle as CircleIcon,
  Minus,
  PenTool,
  Highlighter,
  Type,
  EyeOff,
  Crop,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Clipboard,
  UploadCloud,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { EditorAnnotation, EditorTool } from '../types';

interface ImageEditorProps {
  imageSrc: string | null;
  filePath?: string;
  onSave: (dataUrl: string, origPath?: string) => Promise<void>;
  onCopyClipboard: (dataUrl: string) => Promise<void>;
  onUpload: (dataUrl: string) => Promise<void>;
  onRunOcr: (dataUrl: string) => Promise<void>;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageSrc,
  filePath,
  onSave,
  onCopyClipboard,
  onUpload,
  onRunOcr,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('arrow');
  const [selectedColor, setSelectedColor] = useState<string>('#8ab4f8');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [annotations, setAnnotations] = useState<EditorAnnotation[]>([]);
  const [redoStack, setRedoStack] = useState<EditorAnnotation[][]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<EditorAnnotation | null>(null);
  const [stepCount, setStepCount] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [inputText, setInputText] = useState<string>('Note');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const colors = [
    '#8ab4f8',
    '#81c995',
    '#fdd663',
    '#f28b82',
    '#c58af9',
    '#78d9ec',
    '#ffffff',
    '#202124',
  ];

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setLoadedImage(img);
      setAnnotations([]);
      setRedoStack([]);
      setStepCount(1);
      setCropBox(null);
    };
  }, [imageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = loadedImage.naturalWidth;
    canvas.height = loadedImage.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loadedImage, 0, 0);

    const allAnnotations = currentAnnotation ? [...annotations, currentAnnotation] : annotations;

    for (const ann of allAnnotations) {
      ctx.save();

      if (ann.type === 'blur') {
        const x = Math.min(ann.x, ann.x + ann.width);
        const y = Math.min(ann.y, ann.y + ann.height);
        const w = Math.abs(ann.width);
        const h = Math.abs(ann.height);

        if (w > 2 && h > 2) {
          const sampleSize = Math.max(8, Math.floor(w / 16));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = Math.max(1, Math.floor(w / sampleSize));
          tempCanvas.height = Math.max(1, Math.floor(h / sampleSize));
          const tCtx = tempCanvas.getContext('2d');

          if (tCtx) {
            tCtx.drawImage(canvas, x, y, w, h, 0, 0, tempCanvas.width, tempCanvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, w, h);
            ctx.imageSmoothingEnabled = true;
          }

          ctx.strokeStyle = 'rgba(138, 180, 248, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);
        }
        ctx.restore();
        continue;
      }

      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.type === 'arrow') {
        const fromX = ann.x;
        const fromY = ann.y;
        const toX = ann.x + ann.width;
        const toY = ann.y + ann.height;
        const headlen = Math.max(16, ann.strokeWidth * 3.5);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - headlen * Math.cos(angle - Math.PI / 6),
          toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          toX - headlen * Math.cos(angle + Math.PI / 6),
          toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (ann.type === 'rect') {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === 'ellipse') {
        ctx.beginPath();
        const rx = Math.abs(ann.width) / 2;
        const ry = Math.abs(ann.height) / 2;
        const cx = ann.x + ann.width / 2;
        const cy = ann.y + ann.height / 2;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
        ctx.stroke();
      } else if (ann.type === 'brush' && ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      } else if (ann.type === 'highlighter' && ann.points && ann.points.length > 1) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = ann.strokeWidth * 4;
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (ann.type === 'step') {
        const radius = Math.max(16, ann.strokeWidth * 4);
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111318';
        ctx.font = `bold ${radius * 1.1}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(ann.stepNumber || 1), ann.x, ann.y);
      } else if (ann.type === 'text') {
        const fontSize = Math.max(16, ann.strokeWidth * 4);
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.textBaseline = 'top';

        const padding = 6;
        const textMetrics = ctx.measureText(ann.text || 'Note');
        const textWidth = textMetrics.width;
        const textHeight = fontSize * 1.2;

        ctx.fillStyle = 'rgba(25, 28, 32, 0.9)';
        ctx.fillRect(ann.x - padding, ann.y - padding, textWidth + padding * 2, textHeight + padding * 2);

        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ann.x - padding, ann.y - padding, textWidth + padding * 2, textHeight + padding * 2);

        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text || 'Note', ann.x, ann.y);
      }

      ctx.restore();
    }

    if (cropBox) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, cropBox.y);
      ctx.fillRect(0, cropBox.y + cropBox.height, canvas.width, canvas.height - (cropBox.y + cropBox.height));
      ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.height);
      ctx.fillRect(cropBox.x + cropBox.width, cropBox.y, canvas.width - (cropBox.x + cropBox.width), cropBox.height);

      ctx.strokeStyle = '#8ab4f8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      ctx.restore();
    }
  }, [loadedImage, annotations, currentAnnotation, cropBox]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations, redoStack]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loadedImage || activeTool === 'select') return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    if (activeTool === 'step') {
      const newAnn: EditorAnnotation = {
        id: crypto.randomUUID(),
        type: 'step',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color: selectedColor,
        strokeWidth,
        stepNumber: stepCount,
      };
      setRedoStack([]);
      setAnnotations((prev) => [...prev, newAnn]);
      setStepCount((c) => c + 1);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'text') {
      const newAnn: EditorAnnotation = {
        id: crypto.randomUUID(),
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color: selectedColor,
        strokeWidth,
        text: inputText,
      };
      setRedoStack([]);
      setAnnotations((prev) => [...prev, newAnn]);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      setCurrentAnnotation({
        id: crypto.randomUUID(),
        type: activeTool,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color: selectedColor,
        strokeWidth,
        points: [coords],
      });
      return;
    }

    if (activeTool === 'crop') {
      setCropBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    setCurrentAnnotation({
      id: crypto.randomUUID(),
      type: activeTool,
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      color: selectedColor,
      strokeWidth,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'crop') {
      setCropBox({
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        width: Math.abs(coords.x - startPos.x),
        height: Math.abs(coords.y - startPos.y),
      });
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      setCurrentAnnotation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...(prev.points || []), coords],
        };
      });
      return;
    }

    setCurrentAnnotation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        width: coords.x - startPos.x,
        height: coords.y - startPos.y,
      };
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPos(null);

    if (activeTool === 'crop') {
      return;
    }

    if (currentAnnotation) {
      setRedoStack([]);
      setAnnotations((prev) => [...prev, currentAnnotation]);
      setCurrentAnnotation(null);
    }
  };

  const handleApplyCrop = () => {
    if (!cropBox || !canvasRef.current || !loadedImage) return;
    if (cropBox.width < 10 || cropBox.height < 10) return;

    const sourceCanvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropBox.width;
    croppedCanvas.height = cropBox.height;
    const cCtx = croppedCanvas.getContext('2d');
    if (!cCtx) return;

    cCtx.drawImage(
      sourceCanvas,
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height,
      0,
      0,
      cropBox.width,
      cropBox.height
    );

    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.src = croppedDataUrl;
    newImg.onload = () => {
      setLoadedImage(newImg);
      setAnnotations([]);
      setRedoStack([]);
      setStepCount(1);
      setCropBox(null);
      setActiveTool('arrow');
    };
  };

  const handleUndo = () => {
    if (annotations.length === 0) return;
    const last = annotations[annotations.length - 1];
    setRedoStack((prev) => [...prev, [last]]);
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const item = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setAnnotations((prev) => [...prev, ...item]);
  };

  const handleClear = () => {
    if (annotations.length > 0) {
      setRedoStack((prev) => [...prev, annotations]);
      setAnnotations([]);
      setStepCount(1);
    }
  };

  const getExportDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  const tools: { id: EditorTool; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'select', label: 'Pointer', icon: MousePointer },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'step', label: 'Step', icon: ListOrdered },
    { id: 'blur', label: 'Pixelate', icon: EyeOff },
    { id: 'rect', label: 'Box', icon: Square },
    { id: 'ellipse', label: 'Circle', icon: CircleIcon },
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'brush', label: 'Pen', icon: PenTool },
    { id: 'highlighter', label: 'Highlight', icon: Highlighter },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'crop', label: 'Crop', icon: Crop },
  ];

  if (!imageSrc) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--md-sys-color-on-surface-muted)',
          backgroundColor: 'var(--md-sys-color-background)',
          gap: '16px',
        }}
      >
        <PenTool size={44} color="var(--md-sys-color-outline-variant)" />
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
          No Image Loaded in Editor
        </div>
        <p style={{ fontSize: '13px', maxWidth: '400px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
          Capture a screenshot from the Capture Hub or drag and drop any image to start annotating.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {tools.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: isActive ? 'var(--md-sys-color-primary-container)' : 'transparent',
                  color: isActive ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface-variant)',
                  border: '1px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12.5px',
                }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: selectedColor === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>Width:</span>
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
                padding: '4px 6px',
                fontSize: '12px',
              }}
            >
              <option value={2}>2 px</option>
              <option value={4}>4 px</option>
              <option value={6}>6 px</option>
              <option value={10}>10 px</option>
            </select>
          </div>

          {activeTool === 'text' && (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Text label..."
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
                padding: '4px 8px',
                fontSize: '12px',
                width: '120px',
              }}
            />
          )}

          {cropBox && (
            <button
              onClick={handleApplyCrop}
              style={{
                backgroundColor: 'var(--md-sys-color-success)',
                color: '#003915',
                fontWeight: 600,
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              Apply Crop
            </button>
          )}

          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--md-sys-color-outline-variant)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleUndo}
              disabled={annotations.length === 0}
              title="Undo"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-pill)',
                color: annotations.length > 0 ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-muted)',
              }}
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-pill)',
                color: redoStack.length > 0 ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-muted)',
              }}
            >
              <Redo2 size={16} />
            </button>
            <button
              onClick={handleClear}
              disabled={annotations.length === 0}
              title="Clear All Annotations"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-pill)',
                color: annotations.length > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface-muted)',
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--md-sys-color-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            maxWidth: `${100 * zoomLevel}%`,
            maxHeight: `${100 * zoomLevel}%`,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            cursor: activeTool === 'select' ? 'default' : 'crosshair',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 10px',
          }}
        >
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
            style={{ padding: '4px', color: 'var(--md-sys-color-on-surface-variant)' }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', minWidth: '36px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
            style={{ padding: '4px', color: 'var(--md-sys-color-on-surface-variant)' }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            style={{ padding: '4px', color: 'var(--md-sys-color-on-surface-variant)' }}
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--md-sys-color-surface)',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
          {loadedImage ? `${loadedImage.naturalWidth} x ${loadedImage.naturalHeight} px` : ''}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onRunOcr(getExportDataUrl())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <FileText size={14} color="var(--md-sys-color-primary)" />
            <span>Extract OCR</span>
          </button>

          <button
            onClick={() => onCopyClipboard(getExportDataUrl())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Clipboard size={14} color="var(--md-sys-color-primary)" />
            <span>Copy</span>
          </button>

          <button
            onClick={() => onUpload(getExportDataUrl())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <UploadCloud size={14} color="var(--md-sys-color-success)" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => onSave(getExportDataUrl(), filePath)}
            style={{
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
            <Save size={14} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

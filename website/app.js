let currentTool = 'arrow';
let isDrawing = false;
let startX = 0;
let startY = 0;
let stepCounter = 1;
const annotations = [];

const canvas = document.getElementById('interactiveCanvas');
const ctx = canvas.getContext('2d');

const defaultColor = '#8ab4f8';
const defaultStrokeWidth = 4;

function drawArrow(targetCtx, fromX, fromY, toX, toY, color, strokeWidth) {
  const headlen = Math.max(16, strokeWidth * 3.5);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  targetCtx.save();
  targetCtx.strokeStyle = color;
  targetCtx.fillStyle = color;
  targetCtx.lineWidth = strokeWidth;
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';

  targetCtx.beginPath();
  targetCtx.moveTo(fromX, fromY);
  targetCtx.lineTo(toX, toY);
  targetCtx.stroke();

  targetCtx.beginPath();
  targetCtx.moveTo(toX, toY);
  targetCtx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  targetCtx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.restore();
}

function drawStep(targetCtx, x, y, num, color, strokeWidth) {
  const radius = Math.max(16, strokeWidth * 4);
  targetCtx.save();
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.fillStyle = '#111318';
  targetCtx.font = `bold ${radius * 1.1}px sans-serif`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';
  targetCtx.fillText(String(num), x, y);
  targetCtx.restore();
}

function drawBlur(targetCtx, x, y, w, h) {
  const rx = Math.min(x, x + w);
  const ry = Math.min(y, y + h);
  const rw = Math.abs(w);
  const rh = Math.abs(h);

  if (rw > 2 && rh > 2) {
    const sampleSize = Math.max(8, Math.floor(rw / 16));
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.max(1, Math.floor(rw / sampleSize));
    tempCanvas.height = Math.max(1, Math.floor(rh / sampleSize));
    const tCtx = tempCanvas.getContext('2d');

    if (tCtx) {
      tCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, tempCanvas.width, tempCanvas.height);
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, rx, ry, rw, rh);
      targetCtx.imageSmoothingEnabled = true;
    }

    targetCtx.save();
    targetCtx.strokeStyle = 'rgba(138, 180, 248, 0.5)';
    targetCtx.lineWidth = 1;
    targetCtx.setLineDash([4, 4]);
    targetCtx.strokeRect(rx, ry, rw, rh);
    targetCtx.restore();
  }
}

function drawRect(targetCtx, x, y, w, h, color, strokeWidth) {
  targetCtx.save();
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = strokeWidth;
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';
  targetCtx.strokeRect(x, y, w, h);
  targetCtx.restore();
}

function drawHighlighter(targetCtx, fromX, fromY, toX, toY, strokeWidth) {
  targetCtx.save();
  targetCtx.globalAlpha = 0.35;
  targetCtx.lineWidth = strokeWidth * 4;
  targetCtx.strokeStyle = '#fdd663';
  targetCtx.lineCap = 'round';
  targetCtx.beginPath();
  targetCtx.moveTo(fromX, fromY);
  targetCtx.lineTo(toX, toY);
  targetCtx.stroke();
  targetCtx.restore();
}

function initDemoBackground() {
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 24;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const cardW = 540;
  const cardH = 220;
  const cardX = (canvas.width - cardW) / 2;
  const cardY = (canvas.height - cardH) / 2;

  ctx.fillStyle = '#141720';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1c202c';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 32, [8, 8, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cardX + 14, cardY + 16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(cardX + 26, cardY + 16, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(cardX + 38, cardY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillText('sharel-capture-preview.png — 1920x1080', cardX + 54, cardY + 20);

  ctx.fillStyle = '#818cf8';
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText('$ sharel capture region --upload', cardX + 24, cardY + 68);

  ctx.fillStyle = '#10b981';
  ctx.fillText('✓ Screen captured via Wayland (Niri / grim)', cardX + 24, cardY + 98);
  ctx.fillText('✓ Uploaded to custom S3 host in 140ms', cardX + 24, cardY + 124);

  ctx.fillStyle = '#f3f4f6';
  ctx.fillText('URL: https://i.example.com/sharel_2026.png (Copied)', cardX + 24, cardY + 154);

  drawAllAnnotations();
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-chip').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tool') === tool) {
      btn.classList.add('active');
    }
  });
}

function clearCanvas() {
  annotations.length = 0;
  stepCounter = 1;
  initDemoBackground();
}

function drawAllAnnotations() {
  for (const ann of annotations) {
    if (ann.type === 'arrow') {
      drawArrow(ctx, ann.fromX, ann.fromY, ann.toX, ann.toY, ann.color, ann.width);
    } else if (ann.type === 'rect') {
      drawRect(ctx, ann.x, ann.y, ann.w, ann.h, ann.color, ann.width);
    } else if (ann.type === 'step') {
      drawStep(ctx, ann.x, ann.y, ann.num, ann.color, ann.width);
    } else if (ann.type === 'blur') {
      drawBlur(ctx, ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === 'highlighter') {
      drawHighlighter(ctx, ann.fromX, ann.fromY, ann.toX, ann.toY, ann.width);
    }
  }
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  startX = (e.clientX - rect.left) * (canvas.width / rect.width);
  startY = (e.clientY - rect.top) * (canvas.height / rect.height);
  isDrawing = true;

  if (currentTool === 'step') {
    annotations.push({
      type: 'step',
      x: startX,
      y: startY,
      num: stepCounter++,
      color: defaultColor,
      width: defaultStrokeWidth,
    });
    isDrawing = false;
    initDemoBackground();
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

  initDemoBackground();

  if (currentTool === 'arrow') {
    drawArrow(ctx, startX, startY, currentX, currentY, defaultColor, defaultStrokeWidth);
  } else if (currentTool === 'rect') {
    drawRect(ctx, startX, startY, currentX - startX, currentY - startY, defaultColor, defaultStrokeWidth);
  } else if (currentTool === 'blur') {
    drawBlur(ctx, startX, startY, currentX - startX, currentY - startY);
  } else if (currentTool === 'highlighter') {
    drawHighlighter(ctx, startX, startY, currentX, currentY, defaultStrokeWidth);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (!isDrawing) return;
  isDrawing = false;
  const rect = canvas.getBoundingClientRect();
  const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const endY = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (currentTool === 'arrow') {
    annotations.push({
      type: 'arrow',
      fromX: startX,
      fromY: startY,
      toX: endX,
      toY: endY,
      color: defaultColor,
      width: defaultStrokeWidth,
    });
  } else if (currentTool === 'rect') {
    annotations.push({
      type: 'rect',
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX),
      h: Math.abs(endY - startY),
      color: defaultColor,
      width: defaultStrokeWidth,
    });
  } else if (currentTool === 'blur') {
    annotations.push({
      type: 'blur',
      x: startX,
      y: startY,
      w: endX - startX,
      h: endY - startY,
    });
  } else if (currentTool === 'highlighter') {
    annotations.push({
      type: 'highlighter',
      fromX: startX,
      fromY: startY,
      toX: endX,
      toY: endY,
      color: defaultColor,
      width: defaultStrokeWidth,
    });
  }

  initDemoBackground();
});

function copyInstallCmd() {
  const text = 'curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash';
  navigator.clipboard.writeText(text).then(() => {
    const copyText = document.getElementById('copyText');
    if (copyText) {
      copyText.innerText = 'Copied!';
      setTimeout(() => (copyText.innerText = 'Copy'), 2000);
    }
  });
}

initDemoBackground();

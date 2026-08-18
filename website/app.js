let currentTool = 'arrow';
let isDrawing = false;
let startX = 0;
let startY = 0;
let stepCounter = 1;
const annotations = [];

const canvas = document.getElementById('interactiveCanvas');
const ctx = canvas.getContext('2d');

function initDemoBackground() {
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e2025';
  ctx.lineWidth = 1;
  const gridSize = 32;
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

  ctx.fillStyle = '#191c20';
  ctx.fillRect(180, 70, 600, 250);

  ctx.fillStyle = '#282a30';
  ctx.fillRect(180, 70, 600, 36);

  ctx.fillStyle = '#e2e2e9';
  ctx.font = '600 13px Google Sans, Inter, sans-serif';
  ctx.fillText('ShareL Demonstration - System Terminal', 200, 93);

  ctx.fillStyle = '#a8c7fa';
  ctx.font = '500 13px "Roboto Mono", monospace';
  ctx.fillText('$ sharel --capture region --upload', 200, 140);

  ctx.fillStyle = '#6dd58c';
  ctx.fillText('Capturing Wayland region via XDG portal...', 200, 170);
  ctx.fillText('Optimal GIF generated with palettegen: 1.2 MB', 200, 200);

  ctx.fillStyle = '#fdd663';
  ctx.fillText('Direct URL: https://i.freeimage.host/sharel-demo.gif', 200, 230);

  drawAllAnnotations();
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach((btn) => {
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
    ctx.save();
    ctx.strokeStyle = ann.color || '#a8c7fa';
    ctx.fillStyle = ann.color || '#a8c7fa';
    ctx.lineWidth = ann.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (ann.type === 'arrow') {
      const dx = ann.toX - ann.fromX;
      const dy = ann.toY - ann.fromY;
      const angle = Math.atan2(dy, dx);
      const headlen = 14;

      ctx.beginPath();
      ctx.moveTo(ann.fromX, ann.fromY);
      ctx.lineTo(ann.toX, ann.toY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ann.toX, ann.toY);
      ctx.lineTo(
        ann.toX - headlen * Math.cos(angle - Math.PI / 6),
        ann.toY - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ann.toX - headlen * Math.cos(angle + Math.PI / 6),
        ann.toY - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (ann.type === 'rect') {
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === 'step') {
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#042f66';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ann.num), ann.x, ann.y);
    } else if (ann.type === 'blur') {
      const sampleSize = 10;
      const tCanvas = document.createElement('canvas');
      tCanvas.width = Math.max(1, Math.floor(Math.abs(ann.w) / sampleSize));
      tCanvas.height = Math.max(1, Math.floor(Math.abs(ann.h) / sampleSize));
      const tCtx = tCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(canvas, ann.x, ann.y, ann.w, ann.h, 0, 0, tCanvas.width, tCanvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tCanvas, 0, 0, tCanvas.width, tCanvas.height, ann.x, ann.y, ann.w, ann.h);
        ctx.imageSmoothingEnabled = true;
      }
      ctx.strokeStyle = 'rgba(168, 199, 250, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
    } else if (ann.type === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(ann.fromX, ann.fromY);
      ctx.lineTo(ann.toX, ann.toY);
      ctx.stroke();
    }

    ctx.restore();
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
      color: '#a8c7fa',
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

  ctx.save();
  ctx.strokeStyle = '#a8c7fa';
  ctx.lineWidth = 3;

  if (currentTool === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  } else if (currentTool === 'rect') {
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
  } else if (currentTool === 'blur') {
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
  } else if (currentTool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  }

  ctx.restore();
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
      color: '#a8c7fa',
      width: 3,
    });
  } else if (currentTool === 'rect') {
    annotations.push({
      type: 'rect',
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX),
      h: Math.abs(endY - startY),
      color: '#a8c7fa',
      width: 3,
    });
  } else if (currentTool === 'blur') {
    annotations.push({
      type: 'blur',
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX),
      h: Math.abs(endY - startY),
    });
  } else if (currentTool === 'highlighter') {
    annotations.push({
      type: 'highlighter',
      fromX: startX,
      fromY: startY,
      toX: endX,
      toY: endY,
      color: '#fdd663',
    });
  }

  initDemoBackground();
});

function copyInstallCmd() {
  const text = 'curl -sSL https://raw.githubusercontent.com/44tl/ShareL/main/install.sh | bash';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyHeroBtn');
    if (btn) {
      btn.innerText = 'Copied!';
      setTimeout(() => (btn.innerText = 'Copy'), 2000);
    }
  });
}

function testSxcuDemo() {
  const out = document.getElementById('sxcuOutput');
  const url = document.getElementById('sxcuUrl').value;
  const method = document.getElementById('sxcuMethod').value;
  const pattern = document.getElementById('sxcuPattern').value;

  out.style.display = 'block';
  out.innerHTML = `Sending ${method} request to ${url}...\nHTTP 200 OK (240ms)\nResponse: {"status_code":200,"image":{"url":"https://i.freeimage.host/81a9f02.png"}}\nExtracted URL (${pattern}): https://i.freeimage.host/81a9f02.png\nCopied to clipboard!`;
}

initDemoBackground();

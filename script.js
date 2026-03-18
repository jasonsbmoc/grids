// Each entry is the paper base color. Grid color is derived as base at ~94% luminance factor over white.
const PALETTE = [
  '#FAF8F3', // warm parchment (default)
  '#F8F4EC', // aged cream
  '#F5F1E8', // linen
  '#F3F0E8', // warm sand
  '#F1F0EC', // cool white
  '#EDF0EC', // sage mist
  '#ECF0F4', // morning fog
  '#EEEcF5', // lavender paper
  '#F5ECEC', // blush
  '#F2F0EA', // warm grey
];

function gridColorFromBg(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 0.94;
  const rOut = Math.round(r * factor);
  const gOut = Math.round(g * factor);
  const bOut = Math.round(b * factor);
  return '#' + [rOut, gOut, bOut].map(v => v.toString(16).padStart(2, '0')).join('');
}

let BG_COLOR   = PALETTE[0];
let GRID_COLOR = gridColorFromBg(BG_COLOR);

// Build swatches
const swatchRow = document.getElementById('swatch-row');
PALETTE.forEach((color, i) => {
  const sw = document.createElement('button');
  sw.className = 'swatch' + (i === 0 ? ' active' : '');
  sw.style.background = color;
  sw.dataset.index = i;
  sw.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    BG_COLOR   = color;
    GRID_COLOR = gridColorFromBg(color);
    updatePreview();
  });
  swatchRow.appendChild(sw);
});

const RATIOS = {
  '16:9': { w: 16, h: 9,  exportW: 1920, exportH: 1080 },
  '1:1':  { w: 1,  h: 1,  exportW: 1080, exportH: 1080 },
  '4:5':  { w: 4,  h: 5,  exportW: 1080, exportH: 1350 },
  '9:16': { w: 9,  h: 16, exportW: 1080, exportH: 1920 }
};

const DENSITY_MIN = 1;
const DENSITY_MAX = 20;

let state = { ratio: '16:9', style: 'line', density: 5 };

const canvas = document.getElementById('preview-canvas');
const ctx    = canvas.getContext('2d');

function getPreviewDims(ratio) {
  const r = RATIOS[ratio];
  const padding  = 64;  // 2rem each side
  const controlsH = 220; // approx height of controls + gaps
  const maxH = Math.min(window.innerHeight - controlsH, 520);
  const maxW = window.innerWidth - padding;
  const fromH = { w: Math.round(maxH * r.w / r.h), h: maxH };
  const fromW = { w: maxW, h: Math.round(maxW * r.h / r.w) };
  if (fromH.w <= maxW) return fromH;
  return fromW;
}

function computeGrid(canvasW, canvasH, density) {
  const baseCount  = Math.max(2, 3 + (density - 1));
  const shortSide  = Math.min(canvasW, canvasH);
  const approxCell = shortSide / baseCount;
  const cols  = Math.max(1, Math.round(canvasW / approxCell));
  const rows  = Math.max(1, Math.round(canvasH / approxCell));
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;
  return { cellW, cellH, cols, rows };
}

function drawGrid(c, ctx2, bgColor, gridColor, gridStyle, density) {
  ctx2.clearRect(0, 0, c.width, c.height);
  ctx2.fillStyle = bgColor;
  ctx2.fillRect(0, 0, c.width, c.height);

  const { cellW, cellH, cols, rows } = computeGrid(c.width, c.height, density);
  ctx2.strokeStyle = gridColor;
  ctx2.fillStyle   = gridColor;

  const isLarge = c.width > 800;
  const lw = isLarge ? 1.5 : 0.85;
  const shortCell = Math.min(cellW, cellH);

  if (gridStyle === 'line') {
    ctx2.lineWidth = lw;
    ctx2.beginPath();
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cellW) + 0.5;
      ctx2.moveTo(x, 0); ctx2.lineTo(x, c.height);
    }
    for (let j = 1; j < rows; j++) {
      const y = Math.round(j * cellH) + 0.5;
      ctx2.moveTo(0, y); ctx2.lineTo(c.width, y);
    }
    ctx2.stroke();

  } else if (gridStyle === 'gap') {
    const gap = shortCell * 0.12;
    ctx2.lineWidth = lw;
    ctx2.beginPath();
    for (let j = 1; j < rows; j++) {
      const y = Math.round(j * cellH) + 0.5;
      for (let i = 0; i < cols; i++) {
        const x1 = Math.round(i * cellW) + gap;
        const x2 = Math.round((i + 1) * cellW) - gap;
        ctx2.moveTo(x1, y); ctx2.lineTo(x2, y);
      }
    }
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cellW) + 0.5;
      for (let j = 0; j < rows; j++) {
        const y1 = Math.round(j * cellH) + gap;
        const y2 = Math.round((j + 1) * cellH) - gap;
        ctx2.moveTo(x, y1); ctx2.lineTo(x, y2);
      }
    }
    ctx2.stroke();

  } else if (gridStyle === 'crosshair') {
    const arm = shortCell * 0.12;
    ctx2.lineWidth = lw;
    ctx2.beginPath();
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        const x = i * cellW, y = j * cellH;
        ctx2.moveTo(x - arm, y); ctx2.lineTo(x + arm, y);
        ctx2.moveTo(x, y - arm); ctx2.lineTo(x, y + arm);
      }
    }
    ctx2.stroke();

  } else if (gridStyle === 'dot') {
    const dotR = Math.max(1.2, shortCell * 0.07);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        ctx2.beginPath();
        ctx2.arc(i * cellW, j * cellH, dotR, 0, Math.PI * 2);
        ctx2.fill();
      }
    }

  } else if (gridStyle === 'square') {
    const s = Math.max(2, shortCell * 0.11);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        ctx2.fillRect(i * cellW - s / 2, j * cellH - s / 2, s, s);
      }
    }

  } else if (gridStyle === 'diamond') {
    const s = Math.max(2, shortCell * 0.11);
    const hr = s / Math.SQRT2;
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        const x = i * cellW, y = j * cellH;
        ctx2.beginPath();
        ctx2.moveTo(x,      y - hr);
        ctx2.lineTo(x + hr, y     );
        ctx2.lineTo(x,      y + hr);
        ctx2.lineTo(x - hr, y     );
        ctx2.closePath();
        ctx2.fill();
      }
    }
  }
}

function buildSVG() {
  const r = RATIOS[state.ratio];
  const W = r.exportW;
  const H = r.exportH;
  const { cellW, cellH, cols, rows } = computeGrid(W, H, state.density);
  const shortCell = Math.min(cellW, cellH);
  let els = '';

  if (state.style === 'line') {
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cellW);
      els += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
    }
    for (let j = 1; j < rows; j++) {
      const y = Math.round(j * cellH);
      els += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
    }
  } else if (state.style === 'gap') {
    const gap = shortCell * 0.12;
    for (let j = 1; j < rows; j++) {
      const y = Math.round(j * cellH);
      for (let i = 0; i < cols; i++) {
        const x1 = (Math.round(i * cellW) + gap).toFixed(2);
        const x2 = (Math.round((i + 1) * cellW) - gap).toFixed(2);
        els += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
      }
    }
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cellW);
      for (let j = 0; j < rows; j++) {
        const y1 = (Math.round(j * cellH) + gap).toFixed(2);
        const y2 = (Math.round((j + 1) * cellH) - gap).toFixed(2);
        els += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
      }
    }
  } else if (state.style === 'crosshair') {
    const arm = shortCell * 0.12;
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        els += `<line x1="${(i*cellW-arm).toFixed(2)}" y1="${(j*cellH).toFixed(2)}" x2="${(i*cellW+arm).toFixed(2)}" y2="${(j*cellH).toFixed(2)}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
        els += `<line x1="${(i*cellW).toFixed(2)}" y1="${(j*cellH-arm).toFixed(2)}" x2="${(i*cellW).toFixed(2)}" y2="${(j*cellH+arm).toFixed(2)}" stroke="${GRID_COLOR}" stroke-width="1.5"/>`;
      }
    }
  } else if (state.style === 'dot') {
    const dotR = Math.max(4, shortCell * 0.07);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        els += `<circle cx="${Math.round(i*cellW)}" cy="${Math.round(j*cellH)}" r="${dotR.toFixed(2)}" fill="${GRID_COLOR}"/>`;
      }
    }
  } else if (state.style === 'square') {
    const s = Math.max(6, shortCell * 0.11);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        els += `<rect x="${(i*cellW-s/2).toFixed(2)}" y="${(j*cellH-s/2).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="${GRID_COLOR}"/>`;
      }
    }
  } else if (state.style === 'diamond') {
    const s = Math.max(6, shortCell * 0.11);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        const x  = (i * cellW).toFixed(2);
        const y  = (j * cellH).toFixed(2);
        const xn = (i * cellW - s / Math.SQRT2).toFixed(2);
        const xp = (i * cellW + s / Math.SQRT2).toFixed(2);
        const yn = (j * cellH - s / Math.SQRT2).toFixed(2);
        const yp = (j * cellH + s / Math.SQRT2).toFixed(2);
        els += `<polygon points="${x},${yn} ${xp},${y} ${x},${yp} ${xn},${y}" fill="${GRID_COLOR}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG_COLOR}"/>
  ${els}
</svg>`;
}

function updatePreview() {
  const dims = getPreviewDims(state.ratio);
  canvas.width  = dims.w;
  canvas.height = dims.h;
  canvas.style.width  = dims.w + 'px';
  canvas.style.height = dims.h + 'px';
  drawGrid(canvas, ctx, BG_COLOR, GRID_COLOR, state.style, state.density);
}

// Sliding pill toggle
function initPill(groupId) {
  const bar  = document.getElementById(groupId);
  const pill = document.createElement('div');
  pill.className = 'toggle-pill';
  bar.insertBefore(pill, bar.firstChild);
  movePill(bar, pill);
}

function movePill(bar, pill) {
  const active = bar.querySelector('.toggle-item.active');
  if (!active) return;
  pill.style.width     = active.offsetWidth + 'px';
  pill.style.height    = active.offsetHeight + 'px';
  pill.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setActiveToggle(groupId, value, attr) {
  const bar  = document.getElementById(groupId);
  const pill = bar.querySelector('.toggle-pill');
  bar.querySelectorAll('.toggle-item').forEach(el => {
    el.classList.toggle('active', el.dataset[attr] === value);
  });
  movePill(bar, pill);
}

window.addEventListener('load', () => {
  initPill('ratio-toggle');
  initPill('style-toggle');
});

document.getElementById('ratio-toggle').addEventListener('click', e => {
  const item = e.target.closest('.toggle-item');
  if (!item) return;
  state.ratio = item.dataset.ratio;
  setActiveToggle('ratio-toggle', state.ratio, 'ratio');
  updatePreview();
});

document.getElementById('style-toggle').addEventListener('click', e => {
  const item = e.target.closest('.toggle-item');
  if (!item) return;
  state.style = item.dataset.style;
  setActiveToggle('style-toggle', state.style, 'style');
  updatePreview();
});

document.getElementById('btn-plus').addEventListener('click', () => {
  if (state.density < DENSITY_MAX) { state.density++; updatePreview(); }
});
document.getElementById('btn-minus').addEventListener('click', () => {
  if (state.density > DENSITY_MIN) { state.density--; updatePreview(); }
});

document.getElementById('btn-download').addEventListener('click', () => {
  const r   = RATIOS[state.ratio];
  const off = document.createElement('canvas');
  off.width  = r.exportW;
  off.height = r.exportH;
  drawGrid(off, off.getContext('2d'), BG_COLOR, GRID_COLOR, state.style, state.density);
  const link = document.createElement('a');
  link.download = 'grid-' + state.ratio + '-' + state.style + '-d' + state.density + '.jpg';
  link.href = off.toDataURL('image/jpeg', 0.95);
  link.click();
});

document.getElementById('btn-copy-svg').addEventListener('click', () => {
  const btn = document.getElementById('btn-copy-svg');
  navigator.clipboard.writeText(buildSVG()).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('feedback');
    setTimeout(() => { btn.textContent = 'Copy SVG'; btn.classList.remove('feedback'); }, 1800);
  }).catch(() => {
    btn.textContent = 'Failed';
    btn.classList.add('feedback');
    setTimeout(() => { btn.textContent = 'Copy SVG'; btn.classList.remove('feedback'); }, 1800);
  });
});

window.addEventListener('resize', updatePreview);
updatePreview();

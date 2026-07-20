'use strict';

/* ============ Config ============ */
const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  B5: { w: 176, h: 250 },
  Letter: { w: 215.9, h: 279.4 }
};

const THEME_KEY = 'zhitie-theme';
const $ = (id) => document.getElementById(id);

/* ============ Theme ============ */
function applyTheme(pref) {
  const root = document.documentElement;
  const dark = pref === 'dark' ||
    (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-pref', pref);
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
  document.querySelectorAll('[data-theme-set]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeSet === saved);
    btn.addEventListener('click', () => {
      const m = btn.dataset.themeSet;
      localStorage.setItem(THEME_KEY, m);
      applyTheme(m);
      document.querySelectorAll('[data-theme-set]').forEach(b =>
        b.classList.toggle('active', b === btn));
    });
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem(THEME_KEY) === 'auto') applyTheme('auto');
  });
}

/* ============ Tabs ============ */
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-body').forEach(b => {
        b.hidden = b.dataset.panel !== target;
      });
    });
  });
}

/* ============ Parse input ============ */
function parseChars(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '(') {
      const end = text.indexOf(')', i);
      if (end !== -1 && result.length > 0) {
        result[result.length - 1].pinyin = text.slice(i + 1, end).trim();
        i = end + 1;
        continue;
      }
    }
    if (ch === ')' || /\s/.test(ch)) { i++; continue; }
    result.push({ char: ch, pinyin: '' });
    i++;
  }
  return result;
}

/* ============ Grid SVG ============ */
function gridSvg(type, lineStyle, lineWidth, lineColor) {
  const dash =
    lineStyle === 'dashed' ? '4 3' :
    lineStyle === 'dotted' ? '0.4 2.5' :
    '';
  const dashAttr = dash ? `stroke-dasharray="${dash}"` : '';
  const lw = lineWidth;
  const c = lineColor;
  const line = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${lw}" ${dashAttr} stroke-linecap="butt"/>`;

  let inner = '';
  switch (type) {
    case 'tian':
    case 'pinyin':
      inner = line(50, 0, 50, 100) + line(0, 50, 100, 50);
      break;
    case 'mi':
      inner =
        line(50, 0, 50, 100) + line(0, 50, 100, 50) +
        line(0, 0, 100, 100) + line(100, 0, 0, 100);
      break;
    case 'jiu':
      inner =
        line(33.333, 0, 33.333, 100) + line(66.666, 0, 66.666, 100) +
        line(0, 33.333, 100, 33.333) + line(0, 66.666, 100, 66.666);
      break;
    case 'hui':
      inner = `<rect x="25" y="25" width="50" height="50" fill="none" stroke="${c}" stroke-width="${lw}" ${dashAttr}/>`;
      break;
    case 'fourline':
      inner = line(0, 33.333, 100, 33.333) + line(0, 66.666, 100, 66.666);
      break;
    case 'blank':
    default:
      inner = '';
  }
  return `<svg class="grid-lines" viewBox="0 0 100 100" preserveAspectRatio="none" shape-rendering="crispEdges">${inner}</svg>`;
}

/* ============ Read config ============ */
function readConfig() {
  return {
    text: $('text').value,
    repeat: parseInt($('repeat').value, 10) || 1,
    charMode: $('charMode').value,
    fontFamily: $('fontFamily').value,
    gridType: $('gridType').value,
    lineStyle: $('lineStyle').value,
    lineWidth: parseFloat($('lineWidth').value) || 0.6,
    lineColor: $('lineColor').value,
    borderColor: $('borderColor').value,
    paper: $('paper').value,
    orientation: $('orientation').value,
    marginTop: parseFloat($('marginTop').value) || 0,
    marginBottom: parseFloat($('marginBottom').value) || 0,
    marginLeft: parseFloat($('marginLeft').value) || 0,
    marginRight: parseFloat($('marginRight').value) || 0,
    cellSize: parseFloat($('cellSize').value) || 14,
    perRow: parseInt($('perRow').value, 10) || 0,
    showPageHeader: $('showPageHeader').checked,
    showPageFooter: $('showPageFooter').checked,
    headerLeft: $('headerLeft').value,
    headerCenter: $('headerCenter').value,
    headerRight: $('headerRight').value,
    footerLeft: $('footerLeft').value,
    footerCenter: $('footerCenter').value,
    footerRight: $('footerRight').value,
    pageNumberFmt: $('pageNumberFmt').value,
    pageNumberPos: $('pageNumberPos').value,
    hfHeight: parseFloat($('hfHeight').value) || 10,
    sheetHeader: $('sheetHeader').checked,
    headerTitle: $('headerTitle').value,
    headerSubtitle: $('headerSubtitle').value,
    showMeta: $('showMeta').checked,
    headerHeight: parseFloat($('headerHeight').value) || 32
  };
}

function getPaperDims(cfg) {
  const base = PAPER_SIZES[cfg.paper];
  return cfg.orientation === 'landscape'
    ? { w: base.h, h: base.w }
    : { w: base.w, h: base.h };
}

/* ============ Cell sizing ============ */
function getCellDims(cfg, contentW) {
  const cellH = cfg.gridType === 'fourline' ? cfg.cellSize * 0.45 : cfg.cellSize;
  let perRow;
  if (cfg.perRow > 0) {
    perRow = cfg.perRow;
  } else {
    perRow = Math.max(1, Math.floor(contentW / cfg.cellSize));
  }
  // exact horizontal fit
  const cellW = contentW / perRow;
  return { cellW, cellH, perRow };
}

/* ============ Cell ============ */
function createCell(cfg, data, cellW, cellH) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (cfg.gridType === 'pinyin') cell.classList.add('pinyin-cell');
  cell.style.width = cellW + 'mm';
  cell.style.height = cellH + 'mm';
  cell.style.border = `${cfg.lineWidth * 0.8}pt solid ${cfg.borderColor}`;

  if (cfg.gridType !== 'blank') {
    cell.insertAdjacentHTML('beforeend', gridSvg(cfg.gridType, cfg.lineStyle, cfg.lineWidth, cfg.lineColor));
  }

  if (cfg.gridType === 'pinyin' && data.pinyin) {
    const py = document.createElement('div');
    py.className = 'pinyin';
    py.textContent = data.pinyin;
    py.style.fontFamily = cfg.fontFamily;
    py.style.fontSize = (cellH * 0.22) + 'mm';
    py.style.lineHeight = '1';
    cell.appendChild(py);
  }

  let mode = cfg.charMode;
  if (mode === 'mix') {
    const phase = data.modeIndex % 3;
    mode = ['outline', 'ghost', 'none'][phase];
  }
  if (data.char && mode !== 'none') {
    const ch = document.createElement('div');
    ch.className = 'char';
    ch.textContent = data.char;
    ch.style.fontFamily = cfg.fontFamily;
    let fontSize;
    if (cfg.gridType === 'fourline') fontSize = cellH * 0.7;
    else if (cfg.gridType === 'pinyin') fontSize = cellH * 0.6;
    else fontSize = cellH * 0.72;
    ch.style.fontSize = fontSize + 'mm';
    if (mode === 'outline') ch.style.color = 'rgba(0,0,0,0.18)';
    else if (mode === 'ghost') ch.style.color = 'rgba(0,0,0,0.5)';
    cell.appendChild(ch);
  }
  return cell;
}

/* ============ Helpers for teach mode ============ */
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
function formatPageNumber(fmt, num, total) {
  switch (fmt) {
    case 'num': return String(num);
    case 'numOfTotal': return `${num} / ${total}`;
    case 'cn': return `第 ${num} 页`;
    case 'dash': return `- ${num} -`;
    case 'p': return `P. ${num}`;
    default: return '';
  }
}

/* ============ Page ============ */
function createPage(cfg, dims, pageNum, totalPages) {
  const page = document.createElement('div');
  page.className = 'sheet';
  page.style.width = dims.w + 'mm';
  page.style.height = dims.h + 'mm';
  page.style.setProperty('--m-top', cfg.marginTop + 'mm');
  page.style.setProperty('--m-right', cfg.marginRight + 'mm');
  page.style.setProperty('--m-bottom', cfg.marginBottom + 'mm');
  page.style.setProperty('--m-left', cfg.marginLeft + 'mm');

  let topPad = cfg.marginTop;
  let botPad = cfg.marginBottom;
  if (cfg.showPageHeader) topPad += cfg.hfHeight;
  if (cfg.showPageFooter) botPad += cfg.hfHeight;
  page.style.setProperty('--hf-h', cfg.hfHeight + 'mm');
  page.style.padding = `${topPad}mm ${cfg.marginRight}mm ${botPad}mm ${cfg.marginLeft}mm`;

  if (cfg.showPageHeader) {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML =
      `<span class="hl">${escapeHtml(cfg.headerLeft)}</span>` +
      `<span class="hc">${escapeHtml(cfg.headerCenter)}</span>` +
      `<span class="hr">${escapeHtml(cfg.headerRight)}</span>`;
    page.appendChild(header);
  }

  if (cfg.showPageFooter) {
    const footer = document.createElement('div');
    footer.className = 'page-footer';
    const pn = formatPageNumber(cfg.pageNumberFmt, pageNum, totalPages);
    const slots = {
      left: cfg.footerLeft || '',
      center: cfg.footerCenter || '',
      right: cfg.footerRight || ''
    };
    if (pn) {
      const key = cfg.pageNumberPos === 'bl' ? 'left'
                : cfg.pageNumberPos === 'bc' ? 'center'
                : 'right';
      slots[key] = pn;
    }
    footer.innerHTML =
      `<span class="fl">${escapeHtml(slots.left)}</span>` +
      `<span class="fc">${escapeHtml(slots.center)}</span>` +
      `<span class="fr">${escapeHtml(slots.right)}</span>`;
    page.appendChild(footer);
  }

  if (cfg.sheetHeader) {
    const sh = document.createElement('div');
    sh.className = 'sheet-header';
    sh.style.height = cfg.headerHeight + 'mm';
    sh.innerHTML =
      `<div class="sh-title">${escapeHtml(cfg.headerTitle)}</div>` +
      (cfg.headerSubtitle ? `<div class="sh-subtitle">${escapeHtml(cfg.headerSubtitle)}</div>` : '');
    if (cfg.showMeta) {
      sh.innerHTML +=
        `<div class="sheet-meta">` +
          `<div class="meta-item"><span class="meta-label">姓名：</span><span class="meta-line"></span></div>` +
          `<div class="meta-item"><span class="meta-label">班级：</span><span class="meta-line"></span></div>` +
          `<div class="meta-item"><span class="meta-label">日期：</span><span class="meta-line"></span></div>` +
        `</div>`;
    }
    page.appendChild(sh);
  }

  const content = document.createElement('div');
  content.className = 'page-content';
  page.appendChild(content);
  return page;
}

/* ============ Render ============ */
function render() {
  const cfg = readConfig();
  setupPrintCss(cfg);

  const pagesEl = $('pages');
  pagesEl.innerHTML = '';

  const chars = parseChars(cfg.text);
  const expanded = [];
  for (const c of chars) {
    for (let i = 0; i < cfg.repeat; i++) {
      expanded.push({ ...c, modeIndex: i });
    }
  }

  const dims = getPaperDims(cfg);
  const contentW = dims.w - cfg.marginLeft - cfg.marginRight;
  let contentH = dims.h - cfg.marginTop - cfg.marginBottom;
  if (cfg.showPageHeader) contentH -= cfg.hfHeight;
  if (cfg.showPageFooter) contentH -= cfg.hfHeight;
  if (cfg.sheetHeader) contentH -= cfg.headerHeight;

  const { cellW, cellH, perRow } = getCellDims(cfg, contentW);
  const rowsPerPage = Math.max(1, Math.floor(contentH / cellH));
  const cellsPerPage = perRow * rowsPerPage;
  const pageCount = Math.max(1, Math.ceil(expanded.length / cellsPerPage));

  const emptyCell = { char: '', pinyin: '', modeIndex: 0 };

  for (let p = 0; p < pageCount; p++) {
    const page = createPage(cfg, dims, p + 1, pageCount);
    const slice = expanded.slice(p * cellsPerPage, (p + 1) * cellsPerPage);

    for (let r = 0; r < rowsPerPage; r++) {
      const row = document.createElement('div');
      row.className = 'grid-row';
      row.style.height = cellH + 'mm';
      for (let c = 0; c < perRow; c++) {
        const idx = r * perRow + c;
        const cd = slice[idx] || emptyCell;
        row.appendChild(createCell(cfg, cd, cellW, cellH));
      }
      page.querySelector('.page-content').appendChild(row);
    }
    pagesEl.appendChild(page);
  }

  fitPreview();
}

/* ============ Fit preview to viewport ============ */
const MM_TO_PX = 96 / 25.4;
const PREVIEW_GAP_PX = 28;
const PREVIEW_PADDING = 80;

function fitPreview() {
  const preview = $('preview');
  const stage = $('preview-stage');
  const pages = $('pages');
  if (!stage || !pages) return;

  const sheets = pages.querySelectorAll('.sheet');
  if (sheets.length === 0) {
    pages.style.transform = '';
    stage.style.width = '';
    stage.style.height = '';
    return;
  }

  const cfg = readConfig();
  const dims = getPaperDims(cfg);
  const sheetWPx = dims.w * MM_TO_PX;
  const sheetHPx = dims.h * MM_TO_PX;

  const naturalW = sheetWPx;
  const naturalH = sheets.length * sheetHPx + (sheets.length - 1) * PREVIEW_GAP_PX;

  const previewRect = preview.getBoundingClientRect();
  const availW = Math.max(0, previewRect.width - PREVIEW_PADDING);
  const availH = Math.max(0, previewRect.height - PREVIEW_PADDING);

  const scaleX = availW / naturalW;
  const scaleY = availH / naturalH;
  const scale = Math.max(0.1, Math.min(scaleX, scaleY, 1));

  pages.style.transform = `scale(${scale})`;
  stage.style.width = (naturalW * scale) + 'px';
  stage.style.height = (naturalH * scale) + 'px';
}

/* ============ Print CSS ============ */
function setupPrintCss(cfg) {
  let style = document.getElementById('page-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'page-style';
    document.head.appendChild(style);
  }
  const orient = cfg.orientation === 'landscape' ? ' landscape' : '';
  style.textContent = `@page { size: ${cfg.paper}${orient}; margin: 0; }`;
}

/* ============ Print ============ */
function doPrint() {
  render();
  setTimeout(() => window.print(), 50);
}

/* ============ Reset ============ */
const DEFAULTS = {
  text: '天地玄黄宇宙洪荒',
  repeat: 6,
  charMode: 'ghost',
  fontFamily: 'LXGW WenKai',
  gridType: 'tian',
  lineStyle: 'dashed',
  lineWidth: 0.6,
  lineColor: '#cccccc',
  borderColor: '#888888',
  paper: 'A4',
  orientation: 'portrait',
  marginTop: 15, marginBottom: 15, marginLeft: 15, marginRight: 15,
  cellSize: 14,
  perRow: 0,
  showPageHeader: false,
  showPageFooter: false,
  headerLeft: '', headerCenter: '', headerRight: '',
  footerLeft: '', footerCenter: '', footerRight: '',
  pageNumberFmt: 'none',
  pageNumberPos: 'br',
  hfHeight: 10,
  sheetHeader: false,
  headerTitle: '田字格字帖生成器',
  headerSubtitle: '',
  showMeta: true,
  headerHeight: 32
};
function reset() {
  for (const k in DEFAULTS) {
    const el = $(k);
    if (el) {
      if (el.type === 'checkbox') el.checked = !!DEFAULTS[k];
      else el.value = DEFAULTS[k];
    }
  }
  document.querySelector('.page-header-options').classList.toggle('active', $('showPageHeader').checked);
  document.querySelector('.page-footer-options').classList.toggle('active', $('showPageFooter').checked);
  document.querySelector('.header-options').classList.toggle('active', $('sheetHeader').checked);
  render();
}

/* ============ Init ============ */
let renderTimer = null;
function debouncedRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 80);
}
function init() {
  initTheme();
  initTabs();

  const ids = ['text','repeat','charMode','fontFamily','gridType','lineStyle','lineWidth',
    'lineColor','borderColor','paper','orientation','marginTop','marginBottom','marginLeft',
    'marginRight','cellSize','perRow',
    'showPageHeader','showPageFooter','headerLeft','headerCenter','headerRight',
    'footerLeft','footerCenter','footerRight','pageNumberFmt','pageNumberPos','hfHeight',
    'sheetHeader','headerTitle','headerSubtitle','showMeta','headerHeight'];
  ids.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', debouncedRender);
      el.addEventListener('change', debouncedRender);
    }
  });

  $('showPageHeader').addEventListener('change', () => {
    document.querySelector('.page-header-options').classList.toggle('active', $('showPageHeader').checked);
  });
  $('showPageFooter').addEventListener('change', () => {
    document.querySelector('.page-footer-options').classList.toggle('active', $('showPageFooter').checked);
  });
  $('sheetHeader').addEventListener('change', () => {
    document.querySelector('.header-options').classList.toggle('active', $('sheetHeader').checked);
  });

  $('renderBtn').addEventListener('click', render);
  $('printBtn').addEventListener('click', doPrint);
  $('resetBtn').addEventListener('click', reset);
  window.addEventListener('resize', fitPreview);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => fitPreview());
    ro.observe($('preview'));
  }
  render();
}
document.addEventListener('DOMContentLoaded', init);

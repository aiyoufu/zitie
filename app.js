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

/* ============ Stroke order data (hanzi-writer-data) ============ */
/**
 * 优先本地 vendor（不依赖外网 CDN），失败再试镜像。
 * 成功结果才写入 localStorage；失败不缓存，避免永久回退。
 */
const STROKE_FETCH_MS = 8000;
const STROKE_LS_PREFIX = 'zhitie-stroke-v2:';
const strokeCache = Object.create(null); // char -> data | null
const strokeInflight = Object.create(null);

function isCjkChar(ch) {
  if (!ch) return false;
  const cp = ch.codePointAt(0);
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

/** 与 index.html 同目录下的本地笔顺数据 */
function getLocalStrokeBases() {
  const bases = [];
  try {
    bases.push(new URL('vendor/hanzi-writer-data/', window.location.href).href);
  } catch (_) {
    bases.push('vendor/hanzi-writer-data/');
  }
  return bases;
}

function getRemoteStrokeBases() {
  return [
    'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/',
    'https://fastly.jsdelivr.net/npm/hanzi-writer-data@2.0.1/',
    'https://gcore.jsdelivr.net/npm/hanzi-writer-data@2.0.1/',
    'https://unpkg.com/hanzi-writer-data@2.0.1/'
  ];
}

function readStrokeLocal(char) {
  try {
    const raw = localStorage.getItem(STROKE_LS_PREFIX + char);
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.strokes) && data.strokes.length) return data;
  } catch (_) { /* ignore */ }
  return undefined;
}

function writeStrokeLocal(char, data) {
  // 仅缓存成功数据；失败不写，允许下次重试
  if (!data || !data.strokes || !data.strokes.length) return;
  try {
    localStorage.setItem(STROKE_LS_PREFIX + char, JSON.stringify({ strokes: data.strokes }));
  } catch (_) { /* quota / private mode */ }
}

function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal, cache: 'force-cache' })
    .finally(() => clearTimeout(timer));
}

async function fetchStrokeFromBase(base, char, ms) {
  // 中文文件名：同时尝试百分号编码与原始字符
  const names = [encodeURIComponent(char) + '.json', char + '.json'];
  let lastErr = null;
  for (const name of names) {
    const url = base.endsWith('/') ? base + name : base + '/' + name;
    try {
      const res = await fetchWithTimeout(url, ms);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (data && Array.isArray(data.strokes) && data.strokes.length) return data;
      lastErr = new Error('invalid payload');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('fetch failed');
}

async function fetchStrokeJson(char) {
  const localMs = 3000;
  const remoteMs = STROKE_FETCH_MS;
  let lastErr = null;

  // 1) 本地 vendor（离线可用）
  for (const base of getLocalStrokeBases()) {
    try {
      return await fetchStrokeFromBase(base, char, localMs);
    } catch (e) {
      lastErr = e;
    }
  }

  // 2) 远程镜像兜底
  for (const base of getRemoteStrokeBases()) {
    try {
      return await fetchStrokeFromBase(base, char, remoteMs);
    } catch (e) {
      lastErr = e;
    }
  }

  if (lastErr) console.warn('[笔顺] 加载失败:', char, lastErr);
  return null;
}

async function loadStrokeData(char) {
  if (!char || !isCjkChar(char)) return null;
  if (Object.prototype.hasOwnProperty.call(strokeCache, char)) {
    return strokeCache[char];
  }
  const cached = readStrokeLocal(char);
  if (cached !== undefined) {
    strokeCache[char] = cached;
    return cached;
  }
  if (strokeInflight[char]) return strokeInflight[char];

  strokeInflight[char] = (async () => {
    const data = await fetchStrokeJson(char);
    strokeCache[char] = data;
    if (data) writeStrokeLocal(char, data);
    delete strokeInflight[char];
    return data;
  })();

  return strokeInflight[char];
}

async function loadStrokeDataForChars(chars) {
  const unique = [...new Set(chars.map(c => c.char).filter(isCjkChar))];
  if (!unique.length) return { ok: 0, fail: 0 };
  const results = await Promise.all(unique.map(ch => loadStrokeData(ch)));
  let ok = 0;
  let fail = 0;
  results.forEach(d => { if (d && d.strokes && d.strokes.length) ok++; else fail++; });
  return { ok, fail };
}

function setStrokeStatus(msg, isError) {
  const el = $('strokeStatus');
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('is-error');
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.classList.toggle('is-error', !!isError);
}

/**
 * 规范 CSS font-family，并补全跨平台回退（尤其 macOS 无 Windows 字体名时）。
 * 任意模式切换字体时都应明显变化。
 */
function cssFontFamily(value) {
  const raw = String(value || '').trim();
  if (!raw) return '"Kaiti SC", KaiTi, STKaiti, serif';

  // 预设：选项 value → 完整跨平台栈
  const PRESETS = {
    'LXGW WenKai': '"LXGW WenKai", "Kaiti SC", KaiTi, STKaiti, serif',
    'KaiTi': '"Kaiti SC", KaiTi, STKaiti, "BiauKai", serif',
    'STKaiti, KaiTi': 'STKaiti, "Kaiti SC", KaiTi, serif',
    'KaiTi_GB2312, KaiTi': 'KaiTi_GB2312, "Kaiti SC", KaiTi, STKaiti, serif',
    'SimSun, Songti': '"Songti SC", SimSun, STSong, Songti, serif',
    'NSimSun, SimSun': 'NSimSun, "Songti SC", SimSun, serif',
    'STSong, SimSun': 'STSong, "Songti SC", SimSun, serif',
    'FangSong, STFangsong': 'STFangsong, FangSong, "Songti SC", serif',
    'STFangsong, FangSong': 'STFangsong, FangSong, "Songti SC", serif',
    'STXingkai, KaiTi': 'STXingkai, "Kaiti SC", KaiTi, serif',
    'Xingkai SC, STXingkai': '"Xingkai SC", STXingkai, "Kaiti SC", serif',
    'STCaoshu, KaiTi': 'STCaoshu, "Kaiti SC", KaiTi, serif',
    'STLiti, LiSu': 'STLiti, LiSu, "Kaiti SC", serif',
    'LiSu, STLiti': 'LiSu, STLiti, serif',
    'STXinwei, SimSun': 'STXinwei, "Songti SC", SimSun, serif',
    'Microsoft YaHei': '"Microsoft YaHei", "PingFang SC", "Heiti SC", sans-serif',
    'SimHei, Microsoft YaHei': '"Heiti SC", SimHei, "PingFang SC", "Microsoft YaHei", sans-serif',
    'PingFang SC, Microsoft YaHei': '"PingFang SC", "Heiti SC", "Microsoft YaHei", sans-serif',
    'STHeiti, SimHei': 'STHeiti, "Heiti SC", SimHei, "PingFang SC", sans-serif',
    'STCaiyun, SimSun': 'STCaiyun, "Songti SC", SimSun, serif',
    'FZYaoTi, SimSun': 'FZYaoTi, "PingFang SC", sans-serif',
    'YouYuan, FangSong': 'YouYuan, "PingFang SC", sans-serif'
  };
  if (PRESETS[raw]) return PRESETS[raw];

  // 通用：给带空格的名字加引号
  return raw
    .split(',')
    .map(part => {
      let name = part.trim();
      if (!name) return '';
      if (
        (name.startsWith('"') && name.endsWith('"')) ||
        (name.startsWith("'") && name.endsWith("'"))
      ) {
        return name;
      }
      if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(name)) {
        return name;
      }
      if (/[^a-zA-Z0-9_-]/.test(name)) {
        return `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      }
      return name;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * 笔顺格：只画一层——前 N 笔的笔顺路径（无字体叠层，故无重影）。
 * solid=true 为范字（深）；false 为逐笔（略浅）。
 * 范字与逐笔同一套笔顺数据，样式一致且每一格清晰。
 */
function createStrokeSvgEl(strokes, visibleCount, solid) {
  if (!strokes || !strokes.length || visibleCount <= 0) return null;
  const n = Math.min(visibleCount, strokes.length);
  const fill = solid ? 'rgba(20,18,15,0.94)' : 'rgba(28,27,23,0.55)';
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', solid ? 'char-stroke is-solid' : 'char-stroke is-trace');
  svg.setAttribute('viewBox', '0 0 1024 1024');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', 'translate(0, 900) scale(1, -1)');
  for (let i = 0; i < n; i++) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', strokes[i]);
    p.setAttribute('fill', fill);
    g.appendChild(p);
  }
  svg.appendChild(g);
  return svg;
}

/**
 * 笔顺拆分展开：
 * 范字(全笔路径·深) → 第1…n 笔(路径累加·浅，单层无重影) → 空写
 * 说明：笔顺模式统一用标准笔顺字形，保证范字与逐笔一致、且每笔清晰。
 */
function expandStrokeSequence(charItem, repeat, strokeData) {
  const out = [];
  const strokes = strokeData && strokeData.strokes;
  const ch = charItem.char;
  const py = charItem.pinyin || '';

  if (!strokes || !strokes.length) {
    out.push({ char: ch, pinyin: py, cellKind: 'text', modeIndex: 0, forceMode: 'ghost' });
    for (let i = 0; i < repeat; i++) {
      out.push({ char: '', pinyin: '', cellKind: 'text', modeIndex: i, forceMode: 'none' });
    }
    return out;
  }

  // 范字：全笔路径（与逐笔同一套字形，仅更深）
  out.push({
    char: ch,
    pinyin: py,
    cellKind: 'stroke',
    strokes,
    visibleCount: strokes.length,
    strokeSolid: true,
    modeIndex: 0
  });

  // 逐笔：1…n 笔路径累加（单层）
  for (let v = 1; v <= strokes.length; v++) {
    out.push({
      char: ch,
      pinyin: '',
      cellKind: 'stroke',
      strokes,
      visibleCount: v,
      strokeSolid: false,
      modeIndex: v
    });
  }

  for (let i = 0; i < repeat; i++) {
    out.push({
      char: '',
      pinyin: '',
      cellKind: 'text',
      forceMode: 'none',
      modeIndex: i
    });
  }
  return out;
}

function updateStrokeModeUi() {
  const stroke = $('charMode') && $('charMode').value === 'stroke';
  const opts = $('strokeOptions');
  const label = $('repeatLabel');
  if (opts) opts.hidden = !stroke;
  if (label) label.textContent = stroke ? '空写格数' : '练习格数';
}

/**
 * 每个字独占整行（共用配置）：将各组单元格右补空格，
 * 使长度成为 perRow 的整数倍，下一字从新行开头开始。
 */
function padGroupsToOwnRows(groups, perRow, emptyCell) {
  if (!perRow || perRow < 1) return groups.flat();
  const out = [];
  for (const group of groups) {
    if (!group.length) continue;
    out.push(...group);
    const rem = group.length % perRow;
    if (rem !== 0) {
      const pad = perRow - rem;
      for (let i = 0; i < pad; i++) out.push({ ...emptyCell });
    }
  }
  return out;
}

/* ============ Grid SVG ============ */
/**
 * 辅助线 SVG。viewBox 为 0..100，线宽必须按格子物理尺寸换算：
 * 旧实现把 0.6 直接当用户单位 ≈ 0.08mm，屏幕靠抗锯齿能看见，打印会整根「消失」。
 */
function gridSvg(type, lineStyle, lineWidth, lineColor, cellW, cellH) {
  const refMm = Math.max(8, Math.min(cellW || 14, cellH || 14));
  // 目标物理线宽 ≥ 0.28mm，再映射到 viewBox 用户单位
  const strokeMm = Math.max(0.28, (lineWidth || 0.6) * 0.4);
  const lw = (strokeMm / refMm) * 100;
  const dash =
    lineStyle === 'dashed' ? `${(lw * 4).toFixed(2)} ${(lw * 3).toFixed(2)}` :
    lineStyle === 'dotted' ? `${Math.max(0.4, lw * 0.45).toFixed(2)} ${(lw * 2.4).toFixed(2)}` :
    '';
  const dashAttr = dash ? `stroke-dasharray="${dash}"` : '';
  const sw = lw.toFixed(3);
  // stroke 用 currentColor，颜色走 CSS（含打印加深）
  const line = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${sw}" ${dashAttr} stroke-linecap="butt"/>`;

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
      inner = `<rect x="25" y="25" width="50" height="50" fill="none" stroke="currentColor" stroke-width="${sw}" ${dashAttr}/>`;
      break;
    case 'fourline':
      inner = line(0, 33.333, 100, 33.333) + line(0, 66.666, 100, 66.666);
      break;
    case 'blank':
    default:
      inner = '';
  }
  return (
    `<svg class="grid-lines" viewBox="0 0 100 100" preserveAspectRatio="none" ` +
    `shape-rendering="geometricPrecision" aria-hidden="true">` +
    `${inner}</svg>`
  );
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
    // 共用配置；兼容旧 id strokeOwnRow
    ownRow: !!(
      ($('ownRow') && $('ownRow').checked) ||
      ($('strokeOwnRow') && $('strokeOwnRow').checked)
    ),
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
    pageHeaderHeight: parseFloat($('pageHeaderHeight') && $('pageHeaderHeight').value) || 10,
    pageFooterHeight: parseFloat($('pageFooterHeight') && $('pageFooterHeight').value) || 10,
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
/**
 * 格子边框用「右+下」单线，首行补上、首列补左，避免相邻格子双边框叠成粗细不一。
 */
function createCell(cfg, data, cellW, cellH, pos = {}) {
  const { isFirstCol = false, isFirstRow = false } = pos;
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (cfg.gridType === 'pinyin') cell.classList.add('pinyin-cell');
  if (isFirstCol) cell.classList.add('is-first-col');
  if (isFirstRow) cell.classList.add('is-first-row');
  cell.style.width = cellW + 'mm';
  cell.style.height = cellH + 'mm';

  // 边框：用 CSS 变量，打印时可由 @media print 加深；下限加到约 0.25mm 避免打印机丢线
  const bwMm = Math.max(0.25, (cfg.lineWidth * 0.8) * 0.3528);
  const bc = cfg.borderColor || '#888888';
  // 田/米字辅助线默认更浅，突出笔顺墨迹
  const gc = cfg.lineColor || '#e0e0e0';
  cell.style.setProperty('--cell-border-c', bc);
  cell.style.setProperty('--cell-grid-c', gc);
  cell.style.setProperty('--cell-border-w', bwMm + 'mm');
  cell.style.border = '0';
  cell.style.borderRight = `${bwMm}mm solid var(--cell-border-c)`;
  cell.style.borderBottom = `${bwMm}mm solid var(--cell-border-c)`;
  if (isFirstCol) cell.style.borderLeft = `${bwMm}mm solid var(--cell-border-c)`;
  if (isFirstRow) cell.style.borderTop = `${bwMm}mm solid var(--cell-border-c)`;

  if (cfg.gridType !== 'blank') {
    cell.insertAdjacentHTML(
      'beforeend',
      gridSvg(cfg.gridType, cfg.lineStyle, cfg.lineWidth, gc, cellW, cellH)
    );
  }

  const fontCss = cssFontFamily(cfg.fontFamily);

  if (cfg.gridType === 'pinyin' && data.pinyin) {
    const py = document.createElement('div');
    py.className = 'pinyin';
    py.textContent = data.pinyin;
    py.style.fontFamily = fontCss;
    py.style.fontSize = (cellH * 0.22) + 'mm';
    py.style.lineHeight = '1';
    cell.appendChild(py);
  }

  // 笔顺格：单层笔顺路径（范字深 / 逐笔浅），无叠字、无 mask
  if (data.cellKind === 'stroke' && data.strokes && data.visibleCount > 0) {
    const svg = createStrokeSvgEl(data.strokes, data.visibleCount, !!data.strokeSolid);
    if (svg) cell.appendChild(svg);
    return cell;
  }

  let mode = data.forceMode != null ? data.forceMode : cfg.charMode;
  if (mode === 'mix') {
    const phase = data.modeIndex % 3;
    mode = ['outline', 'ghost', 'none'][phase];
  } else if (mode === 'stroke') {
    // 无笔顺数据时的文本回退：按临摹显示
    mode = 'ghost';
  }
  if (data.char && mode !== 'none') {
    const ch = document.createElement('div');
    ch.className = 'char';
    ch.textContent = data.char;
    // 直接写 style 属性，避免被其它规则覆盖
    ch.style.setProperty('font-family', fontCss);
    let fontSize;
    if (cfg.gridType === 'fourline') fontSize = cellH * 0.7;
    else if (cfg.gridType === 'pinyin') fontSize = cellH * 0.6;
    else fontSize = cellH * 0.72;
    ch.style.fontSize = fontSize + 'mm';
    if (mode === 'solid') ch.style.color = 'rgba(20,18,15,0.96)';
    else if (mode === 'outline') ch.style.color = 'rgba(0,0,0,0.18)';
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

  const headerH = cfg.pageHeaderHeight || 10;
  const footerH = cfg.pageFooterHeight || 10;
  let topPad = cfg.marginTop;
  let botPad = cfg.marginBottom;
  if (cfg.showPageHeader) topPad += headerH;
  if (cfg.showPageFooter) botPad += footerH;
  page.style.setProperty('--hf-h-header', headerH + 'mm');
  page.style.setProperty('--hf-h-footer', footerH + 'mm');
  page.style.padding = `${topPad}mm ${cfg.marginRight}mm ${botPad}mm ${cfg.marginLeft}mm`;

  if (cfg.showPageHeader) {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.style.height = headerH + 'mm';
    header.innerHTML =
      `<span class="hl">${escapeHtml(cfg.headerLeft)}</span>` +
      `<span class="hc">${escapeHtml(cfg.headerCenter)}</span>` +
      `<span class="hr">${escapeHtml(cfg.headerRight)}</span>`;
    page.appendChild(header);
  }

  if (cfg.showPageFooter) {
    const footer = document.createElement('div');
    footer.className = 'page-footer';
    footer.style.height = footerH + 'mm';
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
let renderGen = 0;

async function render() {
  const gen = ++renderGen;
  const cfg = readConfig();
  setupPrintCss(cfg);
  updateStrokeModeUi();

  const pagesEl = $('pages');
  const chars = parseChars(cfg.text);
  const isStroke = cfg.charMode === 'stroke';
  const repeat = Math.max(1, parseInt(cfg.repeat, 10) || 1);

  // 笔顺模式需先拉数据；其它模式可立即展开
  let strokeStats = { ok: 0, fail: 0 };
  if (isStroke && chars.length) {
    pagesEl.setAttribute('aria-busy', 'true');
    setStrokeStatus('正在加载笔顺数据…', false);
    strokeStats = await loadStrokeDataForChars(chars);
    if (gen !== renderGen) return; // 已有更新的渲染请求
  } else {
    setStrokeStatus('', false);
  }

  const emptyCell = { char: '', pinyin: '', modeIndex: 0, cellKind: 'text' };
  /** @type {Array<Array<object>>} 按字分组，供「每个字独占一行」补齐行尾 */
  const charGroups = [];

  if (isStroke) {
    for (const c of chars) {
      const data = Object.prototype.hasOwnProperty.call(strokeCache, c.char)
        ? strokeCache[c.char]
        : null;
      charGroups.push(expandStrokeSequence(c, repeat, data));
    }
  } else {
    for (const c of chars) {
      const group = [];
      for (let i = 0; i < repeat; i++) {
        group.push({ ...c, modeIndex: i, cellKind: 'text' });
      }
      charGroups.push(group);
    }
  }

  let expanded = charGroups.flat();

  if (gen !== renderGen) return;

  // 等字体栈中第一个可用字体就绪，再画 DOM / canvas
  const fontCss = cssFontFamily(cfg.fontFamily);
  if (document.fonts && document.fonts.load) {
    try {
      // 对栈中每个候选都尝试 load，谁可用谁生效
      const families = fontCss.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      await Promise.all(
        families.slice(0, 4).map(f =>
          document.fonts.load(`400 72px "${f}"`).catch(() => null)
        )
      );
      await document.fonts.ready;
    } catch (_) { /* ignore */ }
  }
  if (gen !== renderGen) return;

  pagesEl.innerHTML = '';
  pagesEl.removeAttribute('aria-busy');
  // 全局继承所选字体（任意模式一致）
  pagesEl.style.fontFamily = fontCss;

  const dims = getPaperDims(cfg);
  const contentW = dims.w - cfg.marginLeft - cfg.marginRight;
  let contentH = dims.h - cfg.marginTop - cfg.marginBottom;
  if (cfg.showPageHeader) contentH -= (cfg.pageHeaderHeight || 10);
  if (cfg.showPageFooter) contentH -= (cfg.pageFooterHeight || 10);
  if (cfg.sheetHeader) contentH -= cfg.headerHeight;

  const { cellW, cellH, perRow } = getCellDims(cfg, contentW);

  // 共用：每个字独占一行（行尾补空格，下一字从新行起）
  if (cfg.ownRow && charGroups.length) {
    expanded = padGroupsToOwnRows(charGroups, perRow, emptyCell);
  }

  if (isStroke && chars.length) {
    if (strokeStats.ok === 0) {
      setStrokeStatus(
        '笔顺数据加载失败。请用本地服务打开本页（不要直接双击 html），并确认存在 vendor/hanzi-writer-data/ 目录。',
        true
      );
    } else if (strokeStats.fail > 0) {
      setStrokeStatus(`已加载 ${strokeStats.ok} 字笔顺，${strokeStats.fail} 字无数据已回退。`, true);
    } else {
      setStrokeStatus(`笔顺拆分已生效：共 ${expanded.length} 格`, false);
    }
  }

  const rowsPerPage = Math.max(1, Math.floor(contentH / cellH));
  const cellsPerPage = perRow * rowsPerPage;
  const pageCount = Math.max(1, Math.ceil(Math.max(expanded.length, 1) / cellsPerPage));

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
        row.appendChild(createCell(cfg, cd, cellW, cellH, {
          isFirstCol: c === 0,
          isFirstRow: r === 0
        }));
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
/** 打印过程中禁止 fitPreview，避免把 scale 写回 inline 导致打印空白 */
let isPrinting = false;

function clearPreviewScale() {
  const stage = $('preview-stage');
  const pages = $('pages');
  if (pages) {
    pages.style.transform = 'none';
  }
  if (stage) {
    stage.style.width = '';
    stage.style.height = '';
  }
}

function fitPreview() {
  if (isPrinting) return;

  const preview = $('preview');
  const stage = $('preview-stage');
  const pages = $('pages');
  if (!stage || !pages || !preview) return;

  const sheets = pages.querySelectorAll('.sheet');
  if (sheets.length === 0) {
    clearPreviewScale();
    return;
  }

  const cfg = readConfig();
  const dims = getPaperDims(cfg);
  const sheetWPx = dims.w * MM_TO_PX;
  const sheetHPx = dims.h * MM_TO_PX;

  const naturalW = sheetWPx;
  const naturalH = sheets.length * sheetHPx + (sheets.length - 1) * PREVIEW_GAP_PX;

  const previewRect = preview.getBoundingClientRect();
  // 打印对话框打开时 rect 可能为 0，禁止据此写入极小 scale
  if (previewRect.width < 40 || previewRect.height < 40) return;

  const availW = Math.max(0, previewRect.width - PREVIEW_PADDING);
  const availH = Math.max(0, previewRect.height - PREVIEW_PADDING);
  if (availW < 20 || availH < 20) return;

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
function beginPrintLayout() {
  isPrinting = true;
  document.body.classList.add('is-printing');
  // 去掉预览缩放，让打印引擎按真实 mm 尺寸排版
  clearPreviewScale();
}

function endPrintLayout() {
  isPrinting = false;
  document.body.classList.remove('is-printing');
  // 下一帧再恢复预览缩放，避免和打印重排打架
  requestAnimationFrame(() => fitPreview());
}

async function doPrint() {
  await render();
  beginPrintLayout();
  // 等一帧让浏览器应用「无缩放」布局再调起打印
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        endPrintLayout();
        console.warn('[print]', e);
      }
    }, 50);
  });
}

/* ============ Reset ============ */
const DEFAULTS = {
  text: '天地玄黄宇宙洪荒',
  repeat: 1,
  charMode: 'stroke',
  ownRow: true,
  fontFamily: 'LXGW WenKai',
  gridType: 'tian',
  lineStyle: 'dashed',
  lineWidth: 0.6,
  lineColor: '#e0e0e0',
  borderColor: '#999999',
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
  pageHeaderHeight: 10,
  pageFooterHeight: 10,
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
  updateStrokeModeUi();
  render();
}

/* ============ Init ============ */
let renderTimer = null;
function debouncedRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 80);
}
function clearLegacyStrokeFailCache() {
  // v1 曾把失败写成 'null'，会导致永远回退；启动时清掉
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('zhitie-stroke-v1:')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch (_) { /* ignore */ }
}

/* ============ Help tip adaptive position ============ */
function positionHelpTip(tip) {
  const pop = tip.querySelector('.help-tip-pop');
  if (!pop) return;

  // 与侧栏 .tab-body 左右 padding 一致（22px）
  const SIDE_PAD = 22;
  const gap = 8;
  const edgePad = 8;
  const icon = tip.getBoundingClientRect();
  const controls = document.getElementById('controls');
  const panel = controls ? controls.getBoundingClientRect() : null;

  tip.classList.add('is-open');
  // 宽度限制在侧栏内容区（左右各 22px）内再测量
  const contentLeft = panel ? panel.left + SIDE_PAD : edgePad;
  const contentRight = panel ? panel.right - SIDE_PAD : window.innerWidth - edgePad;
  const contentW = Math.max(120, contentRight - contentLeft);
  pop.style.maxWidth = contentW + 'px';
  pop.style.left = contentLeft + 'px';
  pop.style.top = '0px';
  pop.style.visibility = 'hidden';
  pop.style.opacity = '0';

  const popW = pop.offsetWidth;
  const popH = pop.offsetHeight;
  const vh = window.innerHeight;

  const spaceAbove = icon.top - edgePad;
  const spaceBelow = vh - icon.bottom - edgePad;
  let place = 'top';
  let top;
  if (spaceAbove >= popH + gap || spaceAbove >= spaceBelow) {
    place = 'top';
    top = icon.top - gap - popH;
  } else {
    place = 'bottom';
    top = icon.bottom + gap;
  }

  // 相对问号水平居中，但左右不超出侧栏内容区（与表单左右对齐）
  let left = icon.left + icon.width / 2 - popW / 2;
  left = Math.max(contentLeft, Math.min(left, contentRight - popW));
  top = Math.max(edgePad, Math.min(top, vh - popH - edgePad));

  pop.dataset.place = place;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  const arrowLeft = Math.max(12, Math.min(popW - 12, icon.left + icon.width / 2 - left));
  pop.style.setProperty('--arrow-left', arrowLeft + 'px');

  pop.style.visibility = '';
  pop.style.opacity = '';
}

function hideHelpTip(tip) {
  tip.classList.remove('is-open');
  const pop = tip.querySelector('.help-tip-pop');
  if (!pop) return;
  pop.style.left = '';
  pop.style.top = '';
  pop.style.visibility = '';
  pop.style.opacity = '';
}

function initHelpTips() {
  document.querySelectorAll('.help-tip').forEach(tip => {
    const show = () => positionHelpTip(tip);
    const hide = () => hideHelpTip(tip);
    tip.addEventListener('mouseenter', show);
    tip.addEventListener('focus', show);
    tip.addEventListener('mouseleave', hide);
    tip.addEventListener('blur', hide);
  });

  const repositionOpen = () => {
    document.querySelectorAll('.help-tip.is-open').forEach(positionHelpTip);
  };
  document.querySelectorAll('.tab-body').forEach(tb => {
    tb.addEventListener('scroll', repositionOpen, { passive: true });
  });
  window.addEventListener('resize', () => {
    document.querySelectorAll('.help-tip.is-open').forEach(hideHelpTip);
  });
}

/* ============ Custom select (替换系统下拉，对齐侧栏样式与宽度) ============ */
function closeAllCustomSelects(except) {
  document.querySelectorAll('.custom-select.is-open').forEach(wrap => {
    if (except && wrap === except) return;
    wrap.classList.remove('is-open');
  });
}

function positionCustomSelectPanel(wrap) {
  const btn = wrap.querySelector('.custom-select-trigger');
  const panel = wrap.querySelector('.custom-select-panel');
  if (!btn || !panel) return;
  const r = btn.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  panel.style.left = r.left + 'px';
  panel.style.width = r.width + 'px';
  panel.style.top = (r.bottom + gap) + 'px';
  // 先显示再量高度，必要时翻到上方
  requestAnimationFrame(() => {
    const pr = panel.getBoundingClientRect();
    if (pr.bottom > window.innerHeight - pad && r.top > pr.height + gap + pad) {
      panel.style.top = (r.top - pr.height - gap) + 'px';
    } else {
      // 仍可能超底：限制 max-height
      const spaceBelow = window.innerHeight - r.bottom - gap - pad;
      const spaceAbove = r.top - gap - pad;
      if (spaceBelow < 120 && spaceAbove > spaceBelow) {
        panel.style.top = Math.max(pad, r.top - Math.min(pr.height, spaceAbove) - gap) + 'px';
        panel.style.maxHeight = Math.max(100, spaceAbove) + 'px';
      } else {
        panel.style.maxHeight = Math.max(100, spaceBelow) + 'px';
      }
    }
  });
}

function initCustomSelects() {
  document.querySelectorAll('.field select').forEach(select => {
    if (select.dataset.customSelect === '1') return;
    select.dataset.customSelect = '1';
    select.classList.add('native-select-sr');
    select.tabIndex = -1;

    const wrap = document.createElement('div');
    wrap.className = 'custom-select';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-select-trigger';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.className = 'custom-select-label';
    btn.appendChild(label);

    const panel = document.createElement('div');
    panel.className = 'custom-select-panel';
    panel.setAttribute('role', 'listbox');

    wrap.appendChild(btn);
    wrap.appendChild(panel);

    function syncLabel() {
      const opt = select.options[select.selectedIndex];
      label.textContent = opt ? opt.textContent : '';
      panel.querySelectorAll('.custom-select-option').forEach(el => {
        const on = el.dataset.value === select.value;
        el.classList.toggle('is-selected', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function buildPanel() {
      panel.innerHTML = '';
      Array.from(select.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const g = document.createElement('div');
          g.className = 'custom-select-group';
          g.textContent = child.label || '';
          panel.appendChild(g);
          Array.from(child.children).forEach(opt => addOption(opt));
        } else if (child.tagName === 'OPTION') {
          addOption(child);
        }
      });
      syncLabel();
    }

    function addOption(opt) {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.setAttribute('role', 'option');
      el.dataset.value = opt.value;
      el.textContent = opt.textContent;
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (select.value !== opt.value) {
          select.value = opt.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncLabel();
        close();
      });
      panel.appendChild(el);
    }

    function open() {
      closeAllCustomSelects(wrap);
      buildPanel();
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      positionCustomSelectPanel(wrap);
      const sel = panel.querySelector('.custom-select-option.is-selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function close() {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (wrap.classList.contains('is-open')) close();
      else open();
    });

    select.addEventListener('change', syncLabel);
    buildPanel();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select')) closeAllCustomSelects();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllCustomSelects();
  });
  window.addEventListener('resize', () => closeAllCustomSelects());
  document.querySelectorAll('.tab-body').forEach(tb => {
    tb.addEventListener('scroll', () => closeAllCustomSelects(), { passive: true });
  });
}

function init() {
  initTheme();
  initTabs();
  clearLegacyStrokeFailCache();
  updateStrokeModeUi();
  initHelpTips();
  initCustomSelects();

  const ids = ['text','repeat','charMode','ownRow','fontFamily','gridType','lineStyle','lineWidth',
    'lineColor','borderColor','paper','orientation','marginTop','marginBottom','marginLeft',
    'marginRight','cellSize','perRow',
    'showPageHeader','showPageFooter','headerLeft','headerCenter','headerRight',
    'footerLeft','footerCenter','footerRight','pageNumberFmt','pageNumberPos',
    'pageHeaderHeight','pageFooterHeight',
    'sheetHeader','headerTitle','headerSubtitle','showMeta','headerHeight'];
  ids.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', debouncedRender);
      el.addEventListener('change', debouncedRender);
    }
  });

  $('charMode').addEventListener('change', updateStrokeModeUi);

  $('showPageHeader').addEventListener('change', () => {
    document.querySelector('.page-header-options').classList.toggle('active', $('showPageHeader').checked);
  });
  $('showPageFooter').addEventListener('change', () => {
    document.querySelector('.page-footer-options').classList.toggle('active', $('showPageFooter').checked);
  });
  $('sheetHeader').addEventListener('change', () => {
    document.querySelector('.header-options').classList.toggle('active', $('sheetHeader').checked);
  });

  $('renderBtn').addEventListener('click', () => { render(); });
  $('printBtn').addEventListener('click', doPrint);
  $('resetBtn').addEventListener('click', reset);
  window.addEventListener('resize', fitPreview);
  // 打印前后强制去掉/恢复预览缩放（比只靠 CSS 更稳）
  window.addEventListener('beforeprint', beginPrintLayout);
  window.addEventListener('afterprint', endPrintLayout);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => fitPreview());
    ro.observe($('preview'));
  }
  render();
}
document.addEventListener('DOMContentLoaded', init);

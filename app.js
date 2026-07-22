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
const THEME_ICONS = {
  light: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  dark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/></svg>`,
  auto: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`
};

function applyTheme(pref) {
  const root = document.documentElement;
  const dark = pref === 'dark' ||
    (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-pref', pref);
}

function updateThemeUI(saved) {
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeSet === saved);
  });
  const iconEl = $('mobileThemeIcon');
  if (iconEl && THEME_ICONS[saved]) {
    iconEl.innerHTML = THEME_ICONS[saved];
  }
}

function closeMobileThemeDropdown() {
  const dropdown = $('mobileThemeDropdown');
  const menu = $('mobileThemeMenu');
  const btn = $('mobileThemeBtn');
  if (dropdown) dropdown.classList.remove('active');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
  updateThemeUI(saved);

  document.querySelectorAll('[data-theme-set]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.themeSet;
      localStorage.setItem(THEME_KEY, m);
      applyTheme(m);
      updateThemeUI(m);
      closeMobileThemeDropdown();
    });
  });

  const mobileThemeBtn = $('mobileThemeBtn');
  const mobileThemeDropdown = $('mobileThemeDropdown');
  const mobileThemeMenu = $('mobileThemeMenu');

  if (mobileThemeBtn && mobileThemeDropdown && mobileThemeMenu) {
    mobileThemeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !mobileThemeMenu.hidden;
      if (isOpen) {
        closeMobileThemeDropdown();
      } else {
        mobileThemeDropdown.classList.add('active');
        mobileThemeMenu.hidden = false;
        mobileThemeBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (e) => {
      if (!mobileThemeDropdown.contains(e.target)) {
        closeMobileThemeDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileThemeDropdown();
    });
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    const saved = localStorage.getItem(THEME_KEY) || 'auto';
    if (saved === 'auto') applyTheme('auto');
  };
  if (mq.addEventListener) {
    mq.addEventListener('change', handleSystemThemeChange);
  } else if (mq.addListener) {
    mq.addListener(handleSystemThemeChange);
  }
}

/* ============ Tabs & Mobile Swipe ============ */
const TAB_NAMES = ['content', 'grid', 'page'];

function switchTab(targetName, direction) {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-body');

  let currentTarget = null;
  tabs.forEach(t => {
    const isTarget = t.dataset.tab === targetName;
    t.classList.toggle('active', isTarget);
    if (isTarget) currentTarget = t;
  });

  panels.forEach(b => {
    const isTarget = b.dataset.panel === targetName;
    const wasHidden = b.hidden;
    b.hidden = !isTarget;

    if (isTarget && wasHidden) {
      b.classList.remove('slide-from-right', 'slide-from-left');
      void b.offsetWidth;
      if (direction === 'next') {
        b.classList.add('slide-from-right');
      } else if (direction === 'prev') {
        b.classList.add('slide-from-left');
      }
      const onAnimEnd = () => {
        b.classList.remove('slide-from-right', 'slide-from-left');
        b.removeEventListener('animationend', onAnimEnd);
      };
      b.addEventListener('animationend', onAnimEnd);
    }
  });

  if (currentTarget && currentTarget.scrollIntoView) {
    currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      const activeTab = document.querySelector('.tab.active');
      const activeName = activeTab ? activeTab.dataset.tab : TAB_NAMES[0];
      const currentIndex = TAB_NAMES.indexOf(activeName);
      const targetIndex = TAB_NAMES.indexOf(target);
      const direction = targetIndex > currentIndex ? 'next' : (targetIndex < currentIndex ? 'prev' : null);
      switchTab(target, direction);
    });
  });

  initSwipeTabs();
}

const SWIPE_GUIDE_KEY = 'zhitie_swipe_guide_shown_v2';
let swipeGuideTimer = null;

function dismissSwipeGuide() {
  const guideEl = document.getElementById('swipeGuideHint');
  if (guideEl) guideEl.hidden = true;
  if (swipeGuideTimer) {
    clearTimeout(swipeGuideTimer);
    swipeGuideTimer = null;
  }
  try {
    localStorage.setItem(SWIPE_GUIDE_KEY, 'true');
  } catch (err) {}
}

function checkAndShowSwipeGuide() {
  try {
    if (localStorage.getItem(SWIPE_GUIDE_KEY)) return;
  } catch (err) {}

  const guideEl = document.getElementById('swipeGuideHint');
  if (!guideEl) return;

  guideEl.hidden = false;

  const closeBtn = document.getElementById('closeSwipeGuideBtn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dismissSwipeGuide();
    };
  }

  if (swipeGuideTimer) clearTimeout(swipeGuideTimer);
  swipeGuideTimer = setTimeout(() => {
    dismissSwipeGuide();
  }, 6000);
}

function initSwipeTabs() {
  const controls = document.getElementById('controls');
  if (!controls) return;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isSwiping = false;

  controls.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;

    const target = e.target;
    if (target) {
      const tagName = target.tagName.toUpperCase();
      const inputType = target.type ? target.type.toLowerCase() : '';
      if (
        tagName === 'TEXTAREA' ||
        (tagName === 'INPUT' && (inputType === 'range' || inputType === 'color' || inputType === 'number')) ||
        target.closest('.custom-select-options')
      ) {
        return;
      }
    }

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
    isSwiping = true;
  }, { passive: true });

  controls.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
  }, { passive: true });

  controls.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = Date.now() - startTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isHorizontal = absX > absY * 1.3;
    const isFarEnough = absX >= 40 || (absX >= 25 && (absX / deltaTime) > 0.25);

    if (isHorizontal && isFarEnough && deltaTime < 600) {
      dismissSwipeGuide();
      const activeTab = document.querySelector('.tab.active');
      const activeName = activeTab ? activeTab.dataset.tab : TAB_NAMES[0];
      const currentIndex = TAB_NAMES.indexOf(activeName);

      if (currentIndex !== -1) {
        if (deltaX < 0) {
          // Swipe Left -> Next Tab
          if (currentIndex < TAB_NAMES.length - 1) {
            switchTab(TAB_NAMES[currentIndex + 1], 'next');
          }
        } else {
          // Swipe Right -> Prev Tab
          if (currentIndex > 0) {
            switchTab(TAB_NAMES[currentIndex - 1], 'prev');
          }
        }
      }
    }
  }, { passive: true });
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
        result[result.length - 1].pinyinManual = true;
        i = end + 1;
        continue;
      }
    }
    if (ch === ')' || /\s/.test(ch)) { i++; continue; }
    result.push({ char: ch, pinyin: '', pinyinManual: false });
    i++;
  }
  return result;
}

/* ============ Pinyin (auto + overrides) ============ */
const PINYIN_OVERRIDE_KEY = 'zhitie-pinyin-overrides';
/** @type {Record<string, string>} 用户校对的拼音，优先于自动注音 */
let pinyinOverrides = Object.create(null);

function loadPinyinOverrides() {
  try {
    const raw = localStorage.getItem(PINYIN_OVERRIDE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    pinyinOverrides = Object.create(null);
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(k => {
        if (typeof obj[k] === 'string' && obj[k].trim()) {
          pinyinOverrides[k] = obj[k].trim();
        }
      });
    }
  } catch (_) {
    pinyinOverrides = Object.create(null);
  }
}

function savePinyinOverrides() {
  try {
    localStorage.setItem(PINYIN_OVERRIDE_KEY, JSON.stringify(pinyinOverrides));
  } catch (_) { /* ignore */ }
}

function getPinyinApi() {
  return (typeof window !== 'undefined' && window.pinyinPro) ? window.pinyinPro : null;
}

/** 自动注音（单字）；toneType: symbol | none */
function autoPinyin(ch, toneType) {
  if (!ch || !isCjkChar(ch)) return '';
  const api = getPinyinApi();
  if (!api || typeof api.pinyin !== 'function') return '';
  try {
    const r = api.pinyin(ch, {
      toneType: toneType === 'none' ? 'none' : 'symbol',
      type: 'string',
      nonZh: 'removed'
    });
    return (r && r !== ch) ? String(r).trim() : '';
  } catch (_) {
    return '';
  }
}

/** 某字全部读音（校对面板用） */
function listPolyphones(ch, toneType) {
  const api = getPinyinApi();
  if (!api || typeof api.polyphonic !== 'function') {
    const one = autoPinyin(ch, toneType);
    return one ? [one] : [];
  }
  try {
    const r = api.polyphonic(ch, {
      toneType: toneType === 'none' ? 'none' : 'symbol',
      type: 'array'
    });
    // polyphonic 返回 [ ['háng','xíng'] ] 或类似
    const list = Array.isArray(r) && r.length
      ? (Array.isArray(r[0]) ? r[0] : r)
      : [];
    const uniq = [];
    list.forEach(p => {
      const s = String(p || '').trim();
      if (s && !uniq.includes(s)) uniq.push(s);
    });
    if (!uniq.length) {
      const one = autoPinyin(ch, toneType);
      if (one) uniq.push(one);
    }
    return uniq;
  } catch (_) {
    const one = autoPinyin(ch, toneType);
    return one ? [one] : [];
  }
}

/**
 * 解析后的字列表补全拼音。
 * 优先级：关显示 → 空；留空样式 → 空；手动 (py) → 校对覆盖 → 自动
 */
function annotateChars(chars, cfg) {
  const show = !!cfg.showPinyin;
  const style = cfg.pinyinStyle || 'symbol';
  return chars.map(c => {
    if (!show || style === 'blank') {
      return { ...c, pinyin: '' };
    }
    if (c.pinyinManual && c.pinyin) {
      return { ...c, pinyin: c.pinyin };
    }
    if (pinyinOverrides[c.char]) {
      return { ...c, pinyin: pinyinOverrides[c.char] };
    }
    return { ...c, pinyin: autoPinyin(c.char, style) };
  });
}

/**
 * 四线三格 = 纯拼音纸，与「显示拼音/注音」无关，禁用注音相关控件。
 * 其它格子类型：显示拼音开关正常可用。
 */
function updatePinyinOptionsUi() {
  const showEl = $('showPinyin');
  const opts = $('pinyinOptions');
  const label = $('showPinyinLabel');
  const hint = $('pinyinGridHint');
  const row = showEl && showEl.closest('.own-row-field');
  const gridType = $('gridType') && $('gridType').value;
  const isFourline = gridType === 'fourline';

  if (showEl) {
    showEl.disabled = isFourline;
  }
  if (row) {
    row.classList.toggle('is-disabled', isFourline);
    row.title = isFourline
      ? '四线三格用于练写拼音，不注音；空白四线即为练习纸'
      : '';
  }
  if (hint) {
    hint.hidden = !isFourline;
  }

  if (isFourline) {
    if (opts) opts.hidden = true;
    if (label) label.textContent = '不适用';
    return;
  }

  const on = showEl && showEl.checked;
  if (opts) opts.hidden = !on;
  if (label) label.textContent = on ? '开启' : '关闭';
}

/** 拼音校对面板：默认只看多音字，避免上百字刷屏 */
let pinyinReviewFilter = 'poly'; // poly | edited | all
let pinyinReviewQuery = '';

function initPinyinReviewUi() {
  document.querySelectorAll('[data-py-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      pinyinReviewFilter = btn.dataset.pyFilter || 'poly';
      document.querySelectorAll('[data-py-filter]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const search = $('pinyinReviewSearch');
      if (search) {
        search.hidden = pinyinReviewFilter !== 'all';
        if (pinyinReviewFilter !== 'all') {
          search.value = '';
          pinyinReviewQuery = '';
        }
      }
      // 强制按当前输入重绘列表
      const list = $('pinyinReviewList');
      if (list) delete list.dataset.sig;
      debouncedRender();
    });
  });
  const search = $('pinyinReviewSearch');
  if (search) {
    search.addEventListener('input', () => {
      pinyinReviewQuery = (search.value || '').trim().toLowerCase();
      const list = $('pinyinReviewList');
      if (list) delete list.dataset.sig;
      debouncedRender();
    });
  }
}

/**
 * 构建单条校对行
 * @param {{ char: string, pinyin?: string, pinyinManual?: boolean }} c
 * @param {string} style
 */
function buildPinyinReviewRow(c, style) {
  const ch = c.char;
  const readings = listPolyphones(ch, style);
  let current = '';
  if (c.pinyinManual && c.pinyin) current = c.pinyin;
  else if (pinyinOverrides[ch]) current = pinyinOverrides[ch];
  else current = readings[0] || autoPinyin(ch, style);

  const isPoly = readings.length > 1;
  const isEdited = !!pinyinOverrides[ch];

  const row = document.createElement('div');
  row.className = 'pinyin-review-row' + (isPoly ? ' is-poly' : '');
  row.dataset.char = ch;

  const charEl = document.createElement('span');
  charEl.className = 'pinyin-review-char';
  charEl.textContent = ch;

  const main = document.createElement('div');
  main.className = 'pinyin-review-main';

  // 多音字：优先芯片点选；单音/已改：紧凑输入
  if (!c.pinyinManual && isPoly) {
    const chips = document.createElement('div');
    chips.className = 'pinyin-review-chips';
    readings.forEach(r => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pinyin-chip' + (r === current ? ' is-active' : '');
      btn.textContent = r;
      btn.addEventListener('click', () => {
        pinyinOverrides[ch] = r;
        savePinyinOverrides();
        chips.querySelectorAll('.pinyin-chip').forEach(b => {
          b.classList.toggle('is-active', b.textContent === r);
        });
        const inp = row.querySelector('.pinyin-review-input');
        if (inp) inp.value = r;
        debouncedRender();
      });
      chips.appendChild(btn);
    });
    main.appendChild(chips);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pinyin-review-input';
  input.value = current;
  input.setAttribute('aria-label', `「${ch}」的拼音`);
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = isPoly ? '或手改' : '';
  if (c.pinyinManual) {
    input.title = '文本中已手动标注，修改请改练习字里的 (拼音)';
    input.disabled = true;
  } else {
    input.addEventListener('change', () => {
      const v = input.value.trim();
      if (v) pinyinOverrides[ch] = v;
      else delete pinyinOverrides[ch];
      savePinyinOverrides();
      debouncedRender();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  }
  main.appendChild(input);

  row.appendChild(charEl);
  row.appendChild(main);

  if (isEdited && !c.pinyinManual) {
    row.classList.add('is-edited');
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'pinyin-review-reset';
    clearBtn.title = '恢复自动注音';
    clearBtn.setAttribute('aria-label', `恢复「${ch}」自动注音`);
    clearBtn.textContent = '↺';
    clearBtn.addEventListener('click', () => {
      delete pinyinOverrides[ch];
      savePinyinOverrides();
      debouncedRender();
    });
    row.appendChild(clearBtn);
  }

  return { row, readings, current, isPoly, isEdited };
}

/**
 * 根据当前输入刷新「拼音校对」列表（去重保序）
 * 默认只展示多音字；「全部」支持搜索，避免上百字刷屏。
 */
function refreshPinyinReview(chars, cfg) {
  const wrap = $('pinyinReview');
  const list = $('pinyinReviewList');
  const meta = $('pinyinReviewMeta');
  const empty = $('pinyinReviewEmpty');
  const search = $('pinyinReviewSearch');
  if (!wrap || !list) return;

  // 正在编辑校对输入时不要重绘，避免抢走焦点
  const active = document.activeElement;
  if (active && list.contains(active) && active.classList.contains('pinyin-review-input')) {
    return;
  }
  if (active && active.id === 'pinyinReviewSearch') {
    // 允许搜索时继续刷新列表，但不清搜索框
  }

  if (!cfg.showPinyin || cfg.pinyinStyle === 'blank') {
    wrap.hidden = true;
    list.innerHTML = '';
    if (empty) empty.hidden = true;
    return;
  }

  const seen = new Set();
  const unique = [];
  for (const c of chars) {
    if (!c.char || !isCjkChar(c.char) || seen.has(c.char)) continue;
    seen.add(c.char);
    unique.push(c);
  }

  if (!unique.length) {
    wrap.hidden = true;
    list.innerHTML = '';
    if (empty) empty.hidden = true;
    return;
  }

  wrap.hidden = false;
  const style = cfg.pinyinStyle || 'symbol';

  // 统计多音 / 已改
  const items = unique.map(c => {
    const readings = listPolyphones(c.char, style);
    return {
      c,
      readings,
      isPoly: readings.length > 1,
      isEdited: !!pinyinOverrides[c.char],
      isManual: !!c.pinyinManual
    };
  });
  const polyCount = items.filter(i => i.isPoly).length;
  const editedCount = items.filter(i => i.isEdited).length;

  if (meta) {
    meta.textContent = `${unique.length} 字` +
      (polyCount ? ` · ${polyCount} 多音` : ' · 无多音') +
      (editedCount ? ` · ${editedCount} 已改` : '');
  }

  if (search) {
    search.hidden = pinyinReviewFilter !== 'all';
  }

  let filtered = items;
  if (pinyinReviewFilter === 'poly') {
    filtered = items.filter(i => i.isPoly);
  } else if (pinyinReviewFilter === 'edited') {
    filtered = items.filter(i => i.isEdited || i.isManual);
  }
  if (pinyinReviewFilter === 'all' && pinyinReviewQuery) {
    const q = pinyinReviewQuery;
    filtered = filtered.filter(i => {
      const ch = i.c.char;
      const py = (pinyinOverrides[ch] || i.readings[0] || autoPinyin(ch, style) || '').toLowerCase();
      return ch.includes(q) || py.includes(q);
    });
  }

  // 字集 + 筛选 + 搜索 签名，未变则只同步值
  const signature = [
    pinyinReviewFilter,
    pinyinReviewQuery,
    unique.map(c => c.char + (c.pinyinManual ? ':m' : '') + (pinyinOverrides[c.char] || '')).join('|')
  ].join('::');

  if (list.dataset.sig === signature) {
    // 列表结构未变，跳过重绘
    if (empty) {
      empty.hidden = filtered.length > 0;
    }
    return;
  }
  list.dataset.sig = signature;
  list.innerHTML = '';

  if (!filtered.length) {
    if (empty) {
      empty.hidden = false;
      if (pinyinReviewFilter === 'poly') {
        empty.textContent = polyCount === 0
          ? `共 ${unique.length} 字，均已自动注音，暂无多音字需校对`
          : '没有匹配的多音字';
      } else if (pinyinReviewFilter === 'edited') {
        empty.textContent = '还没有手动改过的读音';
      } else if (pinyinReviewQuery) {
        empty.textContent = '没有匹配的字';
      } else {
        empty.textContent = '暂无内容';
      }
    }
    return;
  }
  if (empty) empty.hidden = true;

  // 「全部」过多时提示用搜索，仍渲染但限制在可滚动区域
  filtered.forEach(item => {
    const { row } = buildPinyinReviewRow(item.c, style);
    list.appendChild(row);
  });
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
    // 四线三格强制不注音（与开关状态解耦，避免组合语义混乱）
    showPinyin: !!(
      $('showPinyin') &&
      $('showPinyin').checked &&
      $('gridType') &&
      $('gridType').value !== 'fourline'
    ),
    pinyinStyle: ($('pinyinStyle') && $('pinyinStyle').value) || 'symbol',
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
    headerHeight: parseFloat($('headerHeight').value) || 32,
    bgType: ($('bgType') && $('bgType').value) || 'none',
    bgOpacity: parseInt($('bgOpacity') && $('bgOpacity').value, 10) || 100,
    bgFit: ($('bgFit') && $('bgFit').value) || 'cover',
    bgEdgeOnly: !!( !$('bgEdgeOnly') || $('bgEdgeOnly').checked )
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
  // 拼音田字格：固定上四线 + 下田字双区，总高约 1.42 倍（与是否印拼音无关）
  // 四线三格：较扁，专练拼音书写
  let cellH;
  if (cfg.gridType === 'fourline') cellH = cfg.cellSize * 0.45;
  else if (cfg.gridType === 'pinyin') cellH = cfg.cellSize * 1.42;
  else cellH = cfg.cellSize;
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
  // 拼音田字格：固定双区版式；「显示拼音」只决定上半是否印读音
  const isPinyinGrid = cfg.gridType === 'pinyin';
  const isFourline = cfg.gridType === 'fourline';
  if (isPinyinGrid) cell.classList.add('pinyin-cell');
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

  const fontCss = cssFontFamily(cfg.fontFamily);
  // 四线三格不注音；其它格由 showPinyin 控制是否印读音
  const showPyText = !!(cfg.showPinyin && data.pinyin && !isFourline);

  // —— 拼音田字格：上四线 + 下田字（版式固定；关显示拼音则上半空白供默写）——
  if (isPinyinGrid) {
    const pyZone = document.createElement('div');
    pyZone.className = 'pinyin-zone';
    pyZone.insertAdjacentHTML(
      'beforeend',
      gridSvg('fourline', cfg.lineStyle, cfg.lineWidth, gc, cellW, cellH * 0.34)
    );
    if (showPyText) {
      const py = document.createElement('div');
      py.className = 'pinyin';
      py.textContent = data.pinyin;
      py.style.fontFamily = fontCss;
      // 相对拼音区高度定字号，落在四线格中格附近
      py.style.fontSize = Math.min(cellW * 0.28, cellH * 0.14) + 'mm';
      py.style.lineHeight = '1';
      pyZone.appendChild(py);
    }
    cell.appendChild(pyZone);

    const hzZone = document.createElement('div');
    hzZone.className = 'hanzi-zone';
    hzZone.insertAdjacentHTML(
      'beforeend',
      gridSvg('tian', cfg.lineStyle, cfg.lineWidth, gc, cellW, cellH * 0.66)
    );
    appendCharContent(hzZone, cfg, data, cellW, cellH * 0.66, fontCss, true);
    cell.appendChild(hzZone);
    return cell;
  }

  // —— 四线三格：纯拼音书写纸（空白四线；不叠注音）——
  if (isFourline) {
    cell.insertAdjacentHTML(
      'beforeend',
      gridSvg('fourline', cfg.lineStyle, cfg.lineWidth, gc, cellW, cellH)
    );
    // 四线格以练写拼音为主：不画汉字笔顺/字模，保持空白练习纸
    // 若输入的是拼音字母本身，可用描红/临摹等模式时再显示（仅非 stroke 的文本）
    if (data.char && cfg.charMode !== 'stroke' && cfg.charMode !== 'none') {
      appendCharContent(cell, cfg, data, cellW, cellH, fontCss, false);
    }
    return cell;
  }

  // —— 其它格子：整格辅助线 + 可选顶部叠字拼音 ——
  if (cfg.gridType !== 'blank') {
    cell.insertAdjacentHTML(
      'beforeend',
      gridSvg(cfg.gridType, cfg.lineStyle, cfg.lineWidth, gc, cellW, cellH)
    );
  }

  if (showPyText) {
    const py = document.createElement('div');
    py.className = 'pinyin pinyin-overlay';
    py.textContent = data.pinyin;
    py.style.fontFamily = fontCss;
    py.style.fontSize = (cellH * 0.18) + 'mm';
    py.style.lineHeight = '1';
    cell.appendChild(py);
    cell.classList.add('has-pinyin-overlay');
  }

  appendCharContent(cell, cfg, data, cellW, cellH, fontCss, false);
  return cell;
}

/**
 * 向容器写入汉字内容（笔顺 SVG 或文字字模）
 * @param {HTMLElement} host
 * @param {boolean} inPinyinGrid 是否在拼音田字的下半区
 */
function appendCharContent(host, cfg, data, cellW, cellH, fontCss, inPinyinGrid) {
  // 笔顺格：单层笔顺路径（范字深 / 逐笔浅），无叠字、无 mask
  if (data.cellKind === 'stroke' && data.strokes && data.visibleCount > 0) {
    const svg = createStrokeSvgEl(data.strokes, data.visibleCount, !!data.strokeSolid);
    if (svg) host.appendChild(svg);
    return;
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
    ch.style.setProperty('font-family', fontCss);
    let fontSize;
    if (cfg.gridType === 'fourline') fontSize = cellH * 0.7;
    else if (inPinyinGrid) fontSize = cellH * 0.72;
    else if (cfg.showPinyin && data.pinyin) fontSize = cellH * 0.58;
    else fontSize = cellH * 0.72;
    ch.style.fontSize = fontSize + 'mm';
    if (mode === 'solid') ch.style.color = 'rgba(20,18,15,0.96)';
    else if (mode === 'outline') ch.style.color = 'rgba(0,0,0,0.18)';
    else if (mode === 'ghost') ch.style.color = 'rgba(0,0,0,0.5)';
    host.appendChild(ch);
  }
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

/* ============ Sheet background ============ */
const BG_CUSTOM_KEY = 'zhitie-bg-custom-v1';
const BG_PRESETS = {
  landscape: 'assets/backgrounds/landscape-spring.svg',
  bamboo: 'assets/backgrounds/ink-bamboo.svg',
  cloud: 'assets/backgrounds/cloud-simple.svg'
};
/** @type {string} data URL of uploaded image */
let customBgDataUrl = '';

function loadCustomBg() {
  try {
    customBgDataUrl = localStorage.getItem(BG_CUSTOM_KEY) || '';
  } catch (_) {
    customBgDataUrl = '';
  }
}

function saveCustomBg(dataUrl) {
  customBgDataUrl = dataUrl || '';
  try {
    if (customBgDataUrl) localStorage.setItem(BG_CUSTOM_KEY, customBgDataUrl);
    else localStorage.removeItem(BG_CUSTOM_KEY);
  } catch (e) {
    console.warn('[背景] 本地存储失败（图片可能过大）', e);
    return false;
  }
  return true;
}

function resolveBgUrl(cfg) {
  if (!cfg || !cfg.bgType || cfg.bgType === 'none') return '';
  if (cfg.bgType === 'custom') return customBgDataUrl || '';
  return BG_PRESETS[cfg.bgType] || '';
}

function updateBgOptionsUi() {
  const type = ($('bgType') && $('bgType').value) || 'none';
  const opts = $('bgOptions');
  const customRow = $('bgCustomRow');
  const clearBtn = $('bgClearCustom');
  const status = $('bgCustomStatus');
  const edgeLabel = $('bgEdgeOnlyLabel');
  const opLabel = $('bgOpacityLabel');
  const op = $('bgOpacity');

  if (opts) opts.hidden = type === 'none';
  if (customRow) customRow.hidden = type !== 'custom';

  if (status) {
    if (type === 'custom' && customBgDataUrl) {
      status.hidden = false;
      status.textContent = '已加载自定义图片（保存在本机）';
      status.classList.remove('is-error');
    } else if (type === 'custom' && !customBgDataUrl) {
      status.hidden = false;
      status.textContent = '请选择一张图片（建议浅色装饰、横竖接近 A4）';
      status.classList.remove('is-error');
    } else {
      status.hidden = true;
    }
  }
  if (clearBtn) clearBtn.hidden = !(type === 'custom' && customBgDataUrl);
  if (edgeLabel && $('bgEdgeOnly')) {
    edgeLabel.textContent = $('bgEdgeOnly').checked ? '开启' : '关闭';
  }
  if (opLabel && op) {
    opLabel.textContent = (parseInt(op.value, 10) || 100) + '%';
  }
}

function initBgControls() {
  loadCustomBg();
  updateBgOptionsUi();

  if ($('bgType')) {
    $('bgType').addEventListener('change', () => {
      updateBgOptionsUi();
      debouncedRender();
    });
  }
  if ($('bgOpacity')) {
    $('bgOpacity').addEventListener('input', () => {
      updateBgOptionsUi();
      debouncedRender();
    });
  }
  if ($('bgFit')) {
    $('bgFit').addEventListener('change', debouncedRender);
  }
  if ($('bgEdgeOnly')) {
    $('bgEdgeOnly').addEventListener('change', () => {
      updateBgOptionsUi();
      debouncedRender();
    });
  }
  if ($('bgClearCustom')) {
    $('bgClearCustom').addEventListener('click', () => {
      saveCustomBg('');
      if ($('bgFile')) $('bgFile').value = '';
      updateBgOptionsUi();
      debouncedRender();
    });
  }
  if ($('bgFile')) {
    $('bgFile').addEventListener('change', () => {
      const file = $('bgFile').files && $('bgFile').files[0];
      const status = $('bgCustomStatus');
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        if (status) {
          status.hidden = false;
          status.textContent = '请选择图片文件';
          status.classList.add('is-error');
        }
        return;
      }
      // 限制约 2.5MB 原文件，避免 localStorage 爆掉
      if (file.size > 2.5 * 1024 * 1024) {
        if (status) {
          status.hidden = false;
          status.textContent = '图片过大（请小于 2.5MB），可先压缩再上传';
          status.classList.add('is-error');
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        // 再压缩到合理 dataURL 体积（约 1.2MB 字符）
        compressImageDataUrl(dataUrl, 1600, 0.82).then(out => {
          const ok = saveCustomBg(out);
          if (status) {
            status.hidden = false;
            if (ok) {
              status.textContent = '已加载自定义图片（保存在本机）';
              status.classList.remove('is-error');
            } else {
              status.textContent = '保存失败：浏览器存储空间不足，请换更小的图';
              status.classList.add('is-error');
            }
          }
          updateBgOptionsUi();
          debouncedRender();
        }).catch(() => {
          const ok = saveCustomBg(dataUrl);
          if (status) {
            status.hidden = false;
            status.textContent = ok ? '已加载自定义图片' : '保存失败，请换更小的图';
            status.classList.toggle('is-error', !ok);
          }
          updateBgOptionsUi();
          debouncedRender();
        });
      };
      reader.onerror = () => {
        if (status) {
          status.hidden = false;
          status.textContent = '读取图片失败';
          status.classList.add('is-error');
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * 将 dataURL 缩放到 maxEdge，输出 jpeg/png dataURL
 */
function compressImageDataUrl(dataUrl, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error('bad image'));
        return;
      }
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('no ctx'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('load fail'));
    img.src = dataUrl;
  });
}

function applySheetBackground(page, cfg) {
  const url = resolveBgUrl(cfg);
  if (!url) return;
  page.classList.add('has-bg');
  // 边缘装饰默认清晰不透明；允许略调淡
  const opacity = Math.max(0.4, Math.min(1, (cfg.bgOpacity != null ? cfg.bgOpacity : 100) / 100));
  const fit = cfg.bgFit === 'contain' ? 'contain' : 'cover';
  const edgeOnly = cfg.bgEdgeOnly !== false;

  if (edgeOnly) {
    page.classList.add('has-bg-edge-only');
  }

  const bg = document.createElement('div');
  bg.className = 'sheet-bg' + (edgeOnly ? ' is-edge-only' : '');
  bg.setAttribute('aria-hidden', 'true');
  bg.style.backgroundImage = `url(${JSON.stringify(url)})`;
  bg.style.backgroundSize = fit;
  // 靠上对齐，减少大片草地被裁到纸面中下部
  bg.style.backgroundPosition = fit === 'contain' ? 'center center' : 'center top';
  bg.style.backgroundRepeat = 'no-repeat';
  bg.style.opacity = String(opacity);
  bg.style.filter = 'none';
  page.appendChild(bg);
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

  // 背景层（绝对定位，在内容之下）
  applySheetBackground(page, cfg);

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
  updateBgOptionsUi();

  const pagesEl = $('pages');
  updatePinyinOptionsUi();
  const rawChars = parseChars(cfg.text);
  // 校对面板用「含手动标记」的原始解析结果
  refreshPinyinReview(rawChars, cfg);
  const chars = annotateChars(rawChars, cfg);
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
  // 背景只做纸张边缘装饰，不占用排版高度（避免切换背景后底部空出半页风景）

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

/* ============ Mobile Drawer ============ */
function closeMobileDrawer() {
  const controls = $('controls');
  const backdrop = $('drawer-backdrop');
  if (controls) controls.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

function openMobileDrawer() {
  const controls = $('controls');
  const backdrop = $('drawer-backdrop');
  if (controls) controls.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  checkAndShowSwipeGuide();
}

function initDrawer() {
  const toggleBtn = $('toggleDrawerBtn');
  const closeBtn = $('closeDrawerBtn');
  const backdrop = $('drawer-backdrop');
  const mobilePrintBtn = $('mobilePrintBtn');
  const mobilePreviewBtn = $('mobilePreviewBtn');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const controls = $('controls');
      if (controls && controls.classList.contains('open')) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  const mobileCloseBtn = $('mobileCloseBtn');

  if (closeBtn) closeBtn.addEventListener('click', closeMobileDrawer);
  if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileDrawer);
  if (backdrop) backdrop.addEventListener('click', closeMobileDrawer);
  if (mobilePreviewBtn) {
    mobilePreviewBtn.addEventListener('click', () => {
      closeMobileDrawer();
      fitPreview();
    });
  }

  if (mobilePrintBtn) {
    mobilePrintBtn.addEventListener('click', () => {
      closeMobileDrawer();
      doPrint();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileDrawer();
  });
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

  // 确保存放页面的绝对定位容器具备正确的原始几何尺寸
  pages.style.width = naturalW + 'px';
  pages.style.height = naturalH + 'px';

  const previewRect = preview.getBoundingClientRect();
  // 打印对话框打开时 rect 可能为 0，禁止据此写入极小 scale
  if (previewRect.width < 40 || previewRect.height < 40) return;
  const isMobile = window.innerWidth < 768;

  let scale;
  if (isMobile) {
    // 移动端优先自适应屏宽 (留出左右舒适间距 32px)，纵向支持自由滚动
    const availW = Math.max(0, previewRect.width - 32);
    const scaleX = availW / naturalW;
    scale = Math.max(0.1, Math.min(scaleX, 1));
  } else {
    // 桌面端同时计算宽高
    const availW = Math.max(0, previewRect.width - PREVIEW_PADDING);
    const availH = Math.max(0, previewRect.height - PREVIEW_PADDING);
    const scaleX = availW / naturalW;
    const scaleY = availH / naturalH;
    scale = Math.max(0.1, Math.min(scaleX, scaleY, 1));
  }

  pages.style.transform = `scale(${scale})`;
  stage.style.width = Math.round(naturalW * scale) + 'px';
  stage.style.height = Math.round(naturalH * scale) + 'px';
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
  showPinyin: true,
  pinyinStyle: 'symbol',
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
  headerTitle: '字帖',
  headerSubtitle: '',
  showMeta: true,
  headerHeight: 32,
  bgType: 'none',
  bgOpacity: 100,
  bgFit: 'cover',
  bgEdgeOnly: true
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
  if ($('ownRowLabel') && $('ownRow')) $('ownRowLabel').textContent = $('ownRow').checked ? '开启' : '关闭';
  updateStrokeModeUi();
  updatePinyinOptionsUi();
  updateBgOptionsUi();
  // 重置不清除拼音校对 / 自定义背景缓存，避免误伤
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
    const btn = wrap.querySelector('.custom-select-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    // 面板可能已 portal 到 body
    const panel = wrap.__panel || wrap.querySelector('.custom-select-panel');
    if (panel) panel.style.display = 'none';
  });
}

function positionCustomSelectPanel(wrap) {
  const btn = wrap.querySelector('.custom-select-trigger');
  const panel = wrap.querySelector('.custom-select-panel');
  if (!btn || !panel) return;

  // 挂到 body，保证 fixed 相对视口（避免祖先 transform/will-change/overflow 干扰）
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }

  const r = btn.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const width = r.width;
  let left = r.left;
  // 防止贴出右边界
  left = Math.min(left, window.innerWidth - width - pad);
  left = Math.max(pad, left);

  panel.style.position = 'fixed';
  panel.style.left = left + 'px';
  panel.style.width = width + 'px';
  panel.style.right = 'auto';
  panel.style.zIndex = '5000';

  const spaceBelow = window.innerHeight - r.bottom - gap - pad;
  const spaceAbove = r.top - gap - pad;
  const preferBelow = spaceBelow >= 120 || spaceBelow >= spaceAbove;

  if (preferBelow) {
    panel.style.top = (r.bottom + gap) + 'px';
    panel.style.bottom = 'auto';
    panel.style.maxHeight = Math.max(100, spaceBelow) + 'px';
  } else {
    panel.style.maxHeight = Math.max(100, spaceAbove) + 'px';
    // 先设 top，量高后再贴到按钮上方
    panel.style.top = pad + 'px';
    panel.style.bottom = 'auto';
  }

  // 打开后再量真实高度，向上展开时贴齐按钮
  requestAnimationFrame(() => {
    if (!wrap.classList.contains('is-open')) return;
    const br = btn.getBoundingClientRect();
    const ph = panel.offsetHeight;
    if (!preferBelow) {
      panel.style.top = Math.max(pad, br.top - ph - gap) + 'px';
    } else {
      panel.style.top = (br.bottom + gap) + 'px';
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
    wrap.__panel = panel;

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
      panel.style.display = 'block';
      positionCustomSelectPanel(wrap);
      // 只在面板内部滚动到选中项，禁止 scrollIntoView 带动侧栏滚动（会错位）
      const sel = panel.querySelector('.custom-select-option.is-selected');
      if (sel) {
        const top = sel.offsetTop - (panel.clientHeight / 2) + (sel.offsetHeight / 2);
        panel.scrollTop = Math.max(0, top);
      }
    }

    function close() {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      panel.style.display = 'none';
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
  loadPinyinOverrides();
  updateStrokeModeUi();
  updatePinyinOptionsUi();
  initPinyinReviewUi();
  initBgControls();
  initHelpTips();
  initCustomSelects();
  initDrawer();

  const ids = ['text','repeat','charMode','ownRow','showPinyin','pinyinStyle','fontFamily','gridType','lineStyle','lineWidth',
    'lineColor','borderColor','paper','orientation','marginTop','marginBottom','marginLeft',
    'marginRight','cellSize','perRow',
    'showPageHeader','showPageFooter','headerLeft','headerCenter','headerRight',
    'footerLeft','footerCenter','footerRight','pageNumberFmt','pageNumberPos',
    'pageHeaderHeight','pageFooterHeight',
    'sheetHeader','headerTitle','headerSubtitle','showMeta','headerHeight',
    'bgType','bgOpacity','bgFit','bgEdgeOnly'];
  ids.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', debouncedRender);
      el.addEventListener('change', debouncedRender);
    }
  });

  $('charMode').addEventListener('change', updateStrokeModeUi);
  if ($('showPinyin')) {
    $('showPinyin').addEventListener('change', updatePinyinOptionsUi);
  }
  if ($('gridType')) {
    $('gridType').addEventListener('change', updatePinyinOptionsUi);
  }

  $('showPageHeader').addEventListener('change', () => {
    document.querySelector('.page-header-options').classList.toggle('active', $('showPageHeader').checked);
  });
  $('showPageFooter').addEventListener('change', () => {
    document.querySelector('.page-footer-options').classList.toggle('active', $('showPageFooter').checked);
  });
  $('sheetHeader').addEventListener('change', () => {
    document.querySelector('.header-options').classList.toggle('active', $('sheetHeader').checked);
  });

  const updateOwnRowText = () => {
    const labelSpan = $('ownRowLabel');
    if (labelSpan && $('ownRow')) {
      labelSpan.textContent = $('ownRow').checked ? '开启' : '关闭';
    }
  };
  if ($('ownRow')) {
    $('ownRow').addEventListener('change', updateOwnRowText);
    updateOwnRowText();
  }

  $('renderBtn').addEventListener('click', () => { render(); });
  $('printBtn').addEventListener('click', doPrint);
  $('resetBtn').addEventListener('click', reset);
  window.addEventListener('resize', fitPreview);
  // 打印前后强制去掉/恢复预览缩放（比只靠 CSS 更稳）
  window.addEventListener('beforeprint', beginPrintLayout);
  window.addEventListener('afterprint', endPrintLayout);
  window.addEventListener('orientationchange', fitPreview);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => fitPreview());
    ro.observe($('preview'));
  }
  render();
}
document.addEventListener('DOMContentLoaded', init);


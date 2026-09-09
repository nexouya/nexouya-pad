/**
 * NEXOUYA PAD - Native Core Logic Engine
 * Clean Native File Explorer Saving + Real Search & Highlight + Dynamic Zoom
 */

// Global Application State
let state = {
  activeTabId: null,
  tabs: [],
  theme: localStorage.getItem('nexouya_theme') || 'theme-dark',
  wordWrap: localStorage.getItem('nexouya_wrap') !== 'false',
  lineNumbers: localStorage.getItem('nexouya_lines') !== 'false',
  tabSize: parseInt(localStorage.getItem('nexouya_indent') || '2', 10),
  isRTL: localStorage.getItem('nexouya_rtl') === 'true',
  zoomLevel: parseFloat(localStorage.getItem('nexouya_zoom') || '100') // 100% default
};

// Flag to prevent synthetic onChange events from dirtying fresh tabs
let isProgrammaticChange = false;

// Tauri 2 Native Invocation Helper
async function invokeTauri(cmd, args = {}) {
  try {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return await window.__TAURI__.core.invoke(cmd, args);
    }
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      return await window.__TAURI_INTERNALS__.invoke(cmd, args);
    }
  } catch (e) {
    console.error(`Tauri command [${cmd}] failed:`, e);
  }
  return null;
}

// Extension to CodeMirror Syntax Mapping
const EXT_MODE_MAP = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'javascript',
  jsx: 'javascript',
  tsx: 'javascript',
  json: 'javascript',
  py: 'python',
  rs: 'rust',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  html: 'htmlmixed',
  htm: 'htmlmixed',
  xml: 'xml',
  css: 'css',
  scss: 'css',
  sql: 'text/plain',
  env: 'text/plain',
  txt: 'text/plain',
  log: 'text/plain',
  toml: 'text/plain'
};

// DOM References
const tabsScroll = document.getElementById('tabsScroll');
const addTabBtn = document.getElementById('addTabBtn');
const statusFilePath = document.getElementById('statusFilePath');
const statusLanguage = document.getElementById('statusLanguage');
const statusCursor = document.getElementById('statusCursor');
const statusSelection = document.getElementById('statusSelection');
const statusSpaces = document.getElementById('statusSpaces');
const statusSize = document.getElementById('statusSize');
const statusZoom = document.getElementById('statusZoom');
const hugeFileNotice = document.getElementById('hugeFileNotice');
const wrapStatus = document.getElementById('wrapStatus');
const lineNumStatus = document.getElementById('lineNumStatus');
const rtlStatus = document.getElementById('rtlStatus');
const quickRTLLabel = document.getElementById('quickRTLLabel');

// Find and Replace Elements
const findBar = document.getElementById('findBar');
const findInput = document.getElementById('findInput');
const replaceInput = document.getElementById('replaceInput');
const findPrevBtn = document.getElementById('findPrevBtn');
const findNextBtn = document.getElementById('findNextBtn');
const replaceBtn = document.getElementById('replaceBtn');
const replaceAllBtn = document.getElementById('replaceAllBtn');
const findCloseBtn = document.getElementById('findCloseBtn');

// Quick Buttons
const quickNewBtn = document.getElementById('quickNewBtn');
const quickOpenBtn = document.getElementById('quickOpenBtn');
const quickSaveBtn = document.getElementById('quickSaveBtn');
const quickRTLBtn = document.getElementById('quickRTLBtn');

// Menus
const menuItems = [
  { btn: document.getElementById('menuFileBtn'), menu: document.getElementById('fileMenu') },
  { btn: document.getElementById('menuEditBtn'), menu: document.getElementById('editMenu') },
  { btn: document.getElementById('menuViewBtn'), menu: document.getElementById('viewMenu') },
  { btn: document.getElementById('menuSettingsBtn'), menu: document.getElementById('settingsMenu') }
];

let cmEditor = null;
let searchMarks = []; // Array of TextMarker instances
let searchMatches = []; // Match coordinates
let currentMatchIndex = -1;

// Initialize CodeMirror Editor Instance
function initEditor() {
  const mount = document.getElementById('codeMirrorMount');
  mount.innerHTML = '';

  const cmTheme = state.theme === 'theme-light' ? 'eclipse' : 'material-darker';

  cmEditor = CodeMirror(mount, {
    lineNumbers: state.lineNumbers,
    mode: 'javascript',
    theme: cmTheme,
    tabSize: state.tabSize,
    indentWithTabs: false,
    lineWrapping: state.wordWrap,
    viewportMargin: 30, // Virtual rendering
    extraKeys: {
      'Ctrl-S': () => saveFileHandler(),
      'Cmd-S': () => saveFileHandler(),
      'Ctrl-Shift-S': () => saveAsHandler(),
      'Cmd-Shift-S': () => saveAsHandler(),
      'Ctrl-O': () => openFileHandler(),
      'Cmd-O': () => openFileHandler(),
      'Ctrl-N': () => createNewTab(),
      'Cmd-N': () => createNewTab(),
      'Ctrl-W': () => { if (state.activeTabId) closeTab(state.activeTabId); },
      'Cmd-W': () => { if (state.activeTabId) closeTab(state.activeTabId); },
      'Ctrl-R': () => showFindBar(),
      'Cmd-R': () => showFindBar(),
      'Ctrl-F': () => showFindBar(),
      'Cmd-F': () => showFindBar(),
      'Ctrl-=': () => changeZoom(10),
      'Ctrl-+': () => changeZoom(10),
      'Ctrl--': () => changeZoom(-10),
      'Ctrl-0': () => resetZoom()
    }
  });

  // Track edits safely without false dirty events
  cmEditor.on('change', () => {
    if (isProgrammaticChange) return;

    const tab = getActiveTab();
    if (tab) {
      tab.content = cmEditor.getValue();
      if (!tab.isDirty) {
        tab.isDirty = true;
        renderTabs();
      }
      updateMetrics();
      scheduleSaveSession();
    }

    if (findBar.classList.contains('show')) {
      updateSearch();
    }
  });

  cmEditor.on('cursorActivity', () => {
    updateCursorInfo();
  });

  // Ctrl + Mouse Wheel Zoom
  cmEditor.getWrapperElement().addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        changeZoom(10);
      } else {
        changeZoom(-10);
      }
    }
  }, { passive: false });

  applyZoom();
}

// -----------------------------------------------------------------------------
// DYNAMIC ZOOM ENGINE
// -----------------------------------------------------------------------------
function changeZoom(delta) {
  let z = state.zoomLevel + delta;
  if (z < 60) z = 60;
  if (z > 250) z = 250;
  state.zoomLevel = z;
  applyZoom();
}

function resetZoom() {
  state.zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  if (!cmEditor) return;
  const baseSize = 13.5;
  const calculatedSize = (baseSize * (state.zoomLevel / 100)).toFixed(1);
  const wrapper = cmEditor.getWrapperElement();
  wrapper.style.fontSize = `${calculatedSize}px`;
  cmEditor.refresh();

  if (statusZoom) {
    statusZoom.textContent = `${Math.round(state.zoomLevel)}%`;
  }
  localStorage.setItem('nexouya_zoom', state.zoomLevel);
}

// -----------------------------------------------------------------------------
// TAB MANAGEMENT
// -----------------------------------------------------------------------------
function createNewTab(title = 'untitled.js', content = '', filePath = null) {
  const newTab = {
    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    title,
    content,
    filePath,
    isDirty: false
  };
  state.tabs.push(newTab);
  renderTabs();
  switchTab(newTab.id);
  scheduleSaveSession();
}

function switchTab(tabId) {
  const currentTab = getActiveTab();
  if (currentTab && cmEditor) {
    currentTab.content = cmEditor.getValue();
  }

  state.activeTabId = tabId;
  const targetTab = getActiveTab();
  if (!targetTab) return;

  if (cmEditor) {
    isProgrammaticChange = true;
    cmEditor.setValue(targetTab.content);
    cmEditor.clearHistory();
    isProgrammaticChange = false;

    applySyntaxMode(targetTab.title);
  }

  renderTabs();
  updateHeaderAndStatus();
  updateMetrics();
  scheduleSaveSession();
}

function closeTab(tabId, e) {
  if (e) e.stopPropagation();
  const index = state.tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const targetTab = state.tabs[index];
  if (targetTab.isDirty) {
    const ok = confirm(`Save changes to "${targetTab.title}" before closing?`);
    if (ok) {
      saveFileHandler().then(() => finalizeCloseTab(index, tabId));
      return;
    }
  }

  finalizeCloseTab(index, tabId);
}

function finalizeCloseTab(index, tabId) {
  state.tabs.splice(index, 1);
  if (state.tabs.length === 0) {
    createNewTab('untitled.txt', '');
  } else if (state.activeTabId === tabId) {
    const nextTab = state.tabs[Math.max(0, index - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
    scheduleSaveSession();
  }
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function renderTabs() {
  tabsScroll.innerHTML = '';
  state.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `tab-cell ${tab.id === state.activeTabId ? 'active' : ''}`;
    el.innerHTML = `
      ${tab.isDirty ? '<span class="dirty-indicator" title="Unsaved changes"></span>' : ''}
      <span>${escapeHtml(tab.title)}</span>
      <span class="tab-close-btn" title="Close Tab (Ctrl+W)">&times;</span>
    `;
    el.addEventListener('click', () => switchTab(tab.id));
    el.querySelector('.tab-close-btn').addEventListener('click', (e) => closeTab(tab.id, e));
    tabsScroll.appendChild(el);
  });
}

// -----------------------------------------------------------------------------
// SYNTAX COLORING & BADGE
// -----------------------------------------------------------------------------
function applySyntaxMode(filename) {
  if (!cmEditor) return;
  const ext = filename.split('.').pop().toLowerCase();
  const mode = EXT_MODE_MAP[ext] || 'text/plain';

  cmEditor.setOption('mode', mode);

  let langLabel = ext.toUpperCase();
  if (ext === 'js') langLabel = 'JAVASCRIPT';
  else if (ext === 'ts') langLabel = 'TYPESCRIPT';
  else if (ext === 'py') langLabel = 'PYTHON';
  else if (ext === 'rs') langLabel = 'RUST';
  else if (ext === 'md') langLabel = 'MARKDOWN';
  else if (ext === 'yml' || ext === 'yaml') langLabel = 'YAML';
  else if (ext === filename) langLabel = 'PLAINTEXT';

  statusLanguage.textContent = langLabel;
}

// -----------------------------------------------------------------------------
// STATUS & METRICS
// -----------------------------------------------------------------------------
function updateHeaderAndStatus() {
  const tab = getActiveTab();
  if (!tab) return;
  statusFilePath.textContent = tab.filePath || tab.title;
}

function updateCursorInfo() {
  if (!cmEditor) return;
  const cursor = cmEditor.getCursor();
  statusCursor.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;

  const selection = cmEditor.getSelection();
  if (selection.length > 0) {
    statusSelection.style.display = 'inline-flex';
    statusSelection.textContent = `${selection.length} selected`;
  } else {
    statusSelection.style.display = 'none';
  }
}

function updateMetrics() {
  if (!cmEditor) return;
  updateCursorInfo();

  const text = cmEditor.getValue();
  const bytes = new Blob([text]).size;
  statusSize.textContent = formatBytes(bytes);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// -----------------------------------------------------------------------------
// PURE NATIVE FILE EXPLORER DIALOGS (DIRECT THIS PC PICKER)
// -----------------------------------------------------------------------------
async function openFileHandler() {
  // Directly trigger Native OS Open Dialog via Rust (rfd)
  const res = await invokeTauri('open_file_dialog');
  if (res && !res.canceled && res.file_path) {
    await loadFileFromDisk(res.file_path);
  }
}

async function loadFileFromDisk(filePath) {
  const meta = await invokeTauri('inspect_file', { path: filePath });
  if (meta) {
    const fileName = filePath.split(/[/\\]/).pop();
    createNewTab(fileName, meta.preview, filePath);
    if (meta.is_huge) {
      hugeFileNotice.style.display = 'inline-flex';
      hugeFileNotice.title = 'File is > 50MB. Read-only mode activated to prevent accidental truncation.';
    } else {
      hugeFileNotice.style.display = 'none';
    }
  }
}

async function saveFileHandler() {
  const tab = getActiveTab();
  if (!tab) return;

  if (tab.filePath) {
    const ok = await invokeTauri('save_file_direct', { path: tab.filePath, contents: cmEditor.getValue() });
    if (ok !== null) {
      tab.isDirty = false;
      renderTabs();
    }
  } else {
    await saveAsHandler();
  }
}

async function saveAsHandler() {
  const tab = getActiveTab();
  const defaultName = tab ? tab.title : 'untitled.txt';

  // DIRECTLY Open Native Windows Explorer (This PC) Save As dialog!
  // No internal intermediate popup. User types any name and extension directly in This PC!
  const res = await invokeTauri('save_file_dialog', { defaultName });

  if (!res) {
    // Pure web fallback
    triggerDownload(defaultName, cmEditor.getValue());
    return;
  }

  if (res.canceled || !res.file_path) {
    // User pressed Cancel in This PC -> DO NOTHING (Do not download or overwrite)
    return;
  }

  const chosenPath = res.file_path;
  const newFileName = chosenPath.split(/[/\\]/).pop();

  await invokeTauri('save_file_direct', { path: chosenPath, contents: cmEditor.getValue() });

  if (tab) {
    tab.title = newFileName;
    tab.filePath = chosenPath;
    tab.isDirty = false;
    renderTabs();
    updateHeaderAndStatus();
    applySyntaxMode(newFileName);
  }
}

function triggerDownload(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Drag and Drop (Preserves full file path & multi-drop)
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', async e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    for (const file of e.dataTransfer.files) {
      if (file.path) {
        await loadFileFromDisk(file.path);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          createNewTab(file.name, ev.target.result, null);
        };
        reader.readAsText(file);
      }
    }
  }
});

// -----------------------------------------------------------------------------
// SEARCH & REPLACE WITH FULL HIGHLIGHTING, ENTER NAVIGATION & LIVE COUNTER
// -----------------------------------------------------------------------------
function showFindBar() {
  findBar.classList.add('show');
  findInput.focus();
  findInput.select();
  updateSearch();
}

function hideFindBar() {
  findBar.classList.remove('show');
  clearSearchHighlights();
  if (cmEditor) cmEditor.focus();
}

findCloseBtn.addEventListener('click', hideFindBar);

findInput.addEventListener('input', () => {
  updateSearch();
});

// Enter = Next Match, Shift+Enter = Previous Match
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      goToPreviousMatch();
    } else {
      goToNextMatch();
    }
  } else if (e.key === 'Escape') {
    hideFindBar();
  }
});

findNextBtn.addEventListener('click', goToNextMatch);
findPrevBtn.addEventListener('click', goToPreviousMatch);

function goToNextMatch() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  jumpToMatch(currentMatchIndex);
}

function goToPreviousMatch() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  jumpToMatch(currentMatchIndex);
}

function updateSearch() {
  if (!cmEditor) return;
  clearSearchHighlights();
  searchMatches = [];
  currentMatchIndex = -1;

  const query = findInput.value;
  if (!query) {
    updateFindLabel(0, 0);
    return;
  }

  const text = cmEditor.getValue();
  const regex = new RegExp(escapeRegex(query), 'gi');
  let match;

  // Search & add real highlight marks
  cmEditor.operation(() => {
    while ((match = regex.exec(text)) !== null) {
      const from = cmEditor.posFromIndex(match.index);
      const to = cmEditor.posFromIndex(match.index + query.length);
      searchMatches.push({ from, to });

      // Create CodeMirror Mark Text decoration
      const mark = cmEditor.markText(from, to, {
        className: 'cm-search-highlight'
      });
      searchMarks.push(mark);
    }
  });

  updateFindLabel(searchMatches.length, searchMatches.length > 0 ? 1 : 0);

  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    jumpToMatch(0);
  }
}

function jumpToMatch(index) {
  if (index < 0 || index >= searchMatches.length) return;
  const { from, to } = searchMatches[index];

  cmEditor.operation(() => {
    cmEditor.setSelection(from, to);
    cmEditor.scrollIntoView({ from, to }, 40);
  });

  updateFindLabel(searchMatches.length, index + 1);
}

function updateFindLabel(total, current) {
  let label = document.getElementById('searchCountBadge');
  if (!label) {
    label = document.createElement('span');
    label.id = 'searchCountBadge';
    label.className = 'search-counter-badge';
    findNextBtn.parentNode.insertBefore(label, findNextBtn);
  }
  if (total === 0) {
    label.textContent = findInput.value ? '0/0' : '';
  } else {
    label.textContent = `${current}/${total}`;
  }
}

function clearSearchHighlights() {
  searchMarks.forEach(m => m.clear());
  searchMarks = [];
  const label = document.getElementById('searchCountBadge');
  if (label) label.textContent = '';
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

replaceBtn.addEventListener('click', () => {
  if (!cmEditor || searchMatches.length === 0 || currentMatchIndex === -1) return;
  const replacement = replaceInput.value;
  const current = searchMatches[currentMatchIndex];
  if (current) {
    cmEditor.replaceRange(replacement, current.from, current.to);
    updateSearch();
  }
});

replaceAllBtn.addEventListener('click', () => {
  if (!cmEditor) return;
  const query = findInput.value;
  const replacement = replaceInput.value;
  if (!query) return;

  const text = cmEditor.getValue();
  const regex = new RegExp(escapeRegex(query), 'gi');
  const replaced = text.replace(regex, replacement);
  cmEditor.setValue(replaced);
  updateSearch();
});

// -----------------------------------------------------------------------------
// MENU & THEME MANAGEMENT
// -----------------------------------------------------------------------------
menuItems.forEach(({ btn, menu }) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuItems.forEach(m => { if (m.menu !== menu) m.menu.classList.remove('show'); });
    menu.classList.toggle('show');
  });
});

document.addEventListener('click', () => {
  menuItems.forEach(m => m.menu.classList.remove('show'));
});

// Themes
document.querySelectorAll('.theme-opt').forEach(item => {
  item.addEventListener('click', () => {
    const theme = item.getAttribute('data-theme');
    applyTheme(theme);
  });
});

function applyTheme(theme) {
  document.body.className = theme;
  state.theme = theme;
  localStorage.setItem('nexouya_theme', theme);

  if (cmEditor) {
    const cmTheme = theme === 'theme-light' ? 'eclipse' : 'material-darker';
    cmEditor.setOption('theme', cmTheme);
  }
}

// Indentation
document.querySelectorAll('.indent-opt').forEach(item => {
  item.addEventListener('click', () => {
    const indent = parseInt(item.getAttribute('data-indent'), 10);
    state.tabSize = indent;
    localStorage.setItem('nexouya_indent', indent);
    statusSpaces.textContent = `Spaces: ${indent}`;
    if (cmEditor) cmEditor.setOption('tabSize', indent);
  });
});

// View Toggles
document.getElementById('menuToggleWrap').addEventListener('click', () => {
  state.wordWrap = !state.wordWrap;
  localStorage.setItem('nexouya_wrap', state.wordWrap);
  wrapStatus.textContent = state.wordWrap ? 'ON' : 'OFF';
  if (cmEditor) cmEditor.setOption('lineWrapping', state.wordWrap);
});

document.getElementById('menuToggleLines').addEventListener('click', () => {
  state.lineNumbers = !state.lineNumbers;
  localStorage.setItem('nexouya_lines', state.lineNumbers);
  lineNumStatus.textContent = state.lineNumbers ? 'ON' : 'OFF';
  if (cmEditor) cmEditor.setOption('lineNumbers', state.lineNumbers);
});

// RTL / LTR Persian Toggle
function toggleRTL() {
  state.isRTL = !state.isRTL;
  localStorage.setItem('nexouya_rtl', state.isRTL);
  rtlStatus.textContent = state.isRTL ? 'ON' : 'OFF';
  quickRTLLabel.textContent = state.isRTL ? 'RTL' : 'LTR';
  if (cmEditor) {
    cmEditor.getWrapperElement().style.direction = state.isRTL ? 'rtl' : 'ltr';
    cmEditor.refresh();
  }
}

document.getElementById('menuToggleRTL').addEventListener('click', toggleRTL);
quickRTLBtn.addEventListener('click', toggleRTL);

// Action Bindings
document.getElementById('menuNew').addEventListener('click', () => createNewTab());
document.getElementById('menuOpen').addEventListener('click', openFileHandler);
document.getElementById('menuSave').addEventListener('click', saveFileHandler);
document.getElementById('menuSaveAs').addEventListener('click', saveAsHandler);
document.getElementById('menuCloseTab').addEventListener('click', () => {
  if (state.activeTabId) closeTab(state.activeTabId);
});
document.getElementById('menuUndo').addEventListener('click', () => cmEditor && cmEditor.undo());
document.getElementById('menuRedo').addEventListener('click', () => cmEditor && cmEditor.redo());
document.getElementById('menuFind').addEventListener('click', showFindBar);
document.getElementById('menuFormat').addEventListener('click', formatDocument);
document.getElementById('menuSelectAll').addEventListener('click', () => cmEditor && cmEditor.execCommand('selectAll'));

// Zoom Menu Triggers
document.getElementById('menuZoomIn')?.addEventListener('click', () => changeZoom(10));
document.getElementById('menuZoomOut')?.addEventListener('click', () => changeZoom(-10));
document.getElementById('menuZoomReset')?.addEventListener('click', resetZoom);

quickNewBtn.addEventListener('click', () => createNewTab());
quickOpenBtn.addEventListener('click', openFileHandler);
quickSaveBtn.addEventListener('click', saveFileHandler);
addTabBtn.addEventListener('click', () => createNewTab());

function formatDocument() {
  if (!cmEditor) return;
  const val = cmEditor.getValue();
  try {
    const obj = JSON.parse(val);
    cmEditor.setValue(JSON.stringify(obj, null, state.tabSize));
  } catch (err) {
    // Do not trim or corrupt normal non-JSON files!
  }
}

// Global Hotkeys
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideFindBar();
  }
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Debounced session saver to prevent lag on every keystroke
let sessionSaveTimer = null;
function scheduleSaveSession() {
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => {
    try {
      // Store lightweight metadata only (limit to max 50KB per tab to never breach localStorage limits!)
      const safeTabs = state.tabs.map(t => ({
        id: t.id,
        title: t.title,
        filePath: t.filePath,
        content: t.content.length > 80000 ? t.content.substring(0, 80000) : t.content,
        isDirty: t.isDirty
      }));

      localStorage.setItem('nexouya_state', JSON.stringify({
        tabs: safeTabs,
        activeTabId: state.activeTabId
      }));
    } catch (e) {
      console.warn('Session save warning:', e);
    }
  }, 1000); // Debounced by 1s
}

// Initial Boot Sequence
initEditor();
applyTheme(state.theme);
wrapStatus.textContent = state.wordWrap ? 'ON' : 'OFF';
lineNumStatus.textContent = state.lineNumbers ? 'ON' : 'OFF';
rtlStatus.textContent = state.isRTL ? 'ON' : 'OFF';
quickRTLLabel.textContent = state.isRTL ? 'RTL' : 'LTR';
statusSpaces.textContent = `Spaces: ${state.tabSize}`;
if (state.isRTL && cmEditor) {
  cmEditor.getWrapperElement().style.direction = 'rtl';
}

// Check startup file from Windows context menu (e.g. "Edit with NEXOUYA PAD <file>")
(async () => {
  const startupFile = await invokeTauri('get_startup_file');
  if (startupFile) {
    await loadFileFromDisk(startupFile);
  }
})();

// Restore Session or Create Initial Clean File
const saved = localStorage.getItem('nexouya_state');
if (saved) {
  try {
    const parsed = JSON.parse(saved);
    state.tabs = parsed.tabs || [];
    state.activeTabId = parsed.activeTabId || null;
  } catch (e) {
    console.error('State restore error:', e);
  }
}

if (!state.tabs || state.tabs.length === 0) {
  const initialCode = `// ====================================================
// NEXOUYA PAD - Native High-Performance Desktop Editor
// ====================================================

export const PAD_MANIFEST = {
  name: "NEXOUYA PAD",
  engine: "Tauri 2 + Rust Memory-Mapped File Core",
  targets: ["Windows (x86_64)", "Linux (Ubuntu/Debian, Arch, Fedora, KDE/Hyprland)"],
  features: [
    "Native Windows Explorer / Linux GTK file pickers",
    "Save to any format without forced extensions",
    "Memory-mapped zero-copy reader for multi-gigabyte files",
    "VS Code precision syntax highlighting",
    "Ctrl + Mouse Wheel dynamic zoom"
  ],
  version: "0.3.1"
};

console.log("Ready for production.");`;

  createNewTab('main.js', initialCode);
} else {
  renderTabs();
  switchTab(state.activeTabId || state.tabs[0].id);
}

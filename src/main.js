/**
 * NEXOUYA PAD - Core Desktop Engine
 * Pure English Interface, CodeMirror 5 Integration, Mmap Architecture
 */

// Application State
let state = {
  activeTabId: null,
  tabs: [],
  theme: localStorage.getItem('nexouya_theme') || 'theme-dark',
  wordWrap: localStorage.getItem('nexouya_wrap') !== 'false',
  lineNumbers: localStorage.getItem('nexouya_lines') !== 'false',
  tabSize: parseInt(localStorage.getItem('nexouya_indent') || '2', 10)
};

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
const hugeFileNotice = document.getElementById('hugeFileNotice');
const wrapStatus = document.getElementById('wrapStatus');
const lineNumStatus = document.getElementById('lineNumStatus');

// Dialog Elements
const saveDialog = document.getElementById('saveDialog');
const saveFileNameInput = document.getElementById('saveFileNameInput');
const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
const dialogCancelBtn = document.getElementById('dialogCancelBtn');
const closeDialogBtn = document.getElementById('closeDialogBtn');

// Quick Buttons
const quickNewBtn = document.getElementById('quickNewBtn');
const quickOpenBtn = document.getElementById('quickOpenBtn');
const quickSaveBtn = document.getElementById('quickSaveBtn');

// Menus
const menuItems = [
  { btn: document.getElementById('menuFileBtn'), menu: document.getElementById('fileMenu') },
  { btn: document.getElementById('menuEditBtn'), menu: document.getElementById('editMenu') },
  { btn: document.getElementById('menuViewBtn'), menu: document.getElementById('viewMenu') },
  { btn: document.getElementById('menuSettingsBtn'), menu: document.getElementById('settingsMenu') }
];

let cmEditor = null;

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
    viewportMargin: 30, // Memory-efficient virtual line rendering
    extraKeys: {
      'Ctrl-S': () => saveCurrentFile(),
      'Cmd-S': () => saveCurrentFile(),
      'Ctrl-O': () => openFilePicker(),
      'Cmd-O': () => openFilePicker(),
      'Ctrl-N': () => createNewTab(),
      'Cmd-N': () => createNewTab(),
      'Ctrl-W': () => { if (state.activeTabId) closeTab(state.activeTabId); },
      'Cmd-W': () => { if (state.activeTabId) closeTab(state.activeTabId); }
    }
  });

  cmEditor.on('change', () => {
    const tab = getActiveTab();
    if (tab) {
      tab.content = cmEditor.getValue();
      tab.isDirty = true;
      renderTabs();
      updateMetrics();
      saveSession();
    }
  });

  cmEditor.on('cursorActivity', () => {
    updateCursorInfo();
  });
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
  saveSession();
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
    cmEditor.setValue(targetTab.content);
    cmEditor.clearHistory();
    applySyntaxMode(targetTab.title);
  }

  renderTabs();
  updateHeaderAndStatus();
  updateMetrics();
  saveSession();
}

function closeTab(tabId, e) {
  if (e) e.stopPropagation();
  const index = state.tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  state.tabs.splice(index, 1);
  if (state.tabs.length === 0) {
    createNewTab('untitled.txt', '');
  } else if (state.activeTabId === tabId) {
    const nextTab = state.tabs[Math.max(0, index - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
    saveSession();
  }
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function renderTabs() {
  tabsScroll.innerHTML = '';
  state.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `tab-tab ${tab.id === state.activeTabId ? 'active' : ''}`;
    el.innerHTML = `
      ${tab.isDirty ? '<span class="tab-dirty-bullet" title="Unsaved changes"></span>' : ''}
      <span>${escapeHtml(tab.title)}</span>
      <span class="tab-close-icon" title="Close Tab (Ctrl+W)">&times;</span>
    `;
    el.addEventListener('click', () => switchTab(tab.id));
    el.querySelector('.tab-close-icon').addEventListener('click', (e) => closeTab(tab.id, e));
    tabsScroll.appendChild(el);
  });
}

// -----------------------------------------------------------------------------
// SYNTAX COLORING & LANGUAGE BADGE
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
    statusSelection.style.display = 'inline';
    statusSelection.textContent = `(${selection.length} selected)`;
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
// FILE SAVE ENGINE (UNIVERSAL FORMAT)
// -----------------------------------------------------------------------------
function saveCurrentFile() {
  const tab = getActiveTab();
  if (!tab) return;

  if (tab.filePath) {
    performDirectDownload(tab.filePath, cmEditor.getValue());
    tab.isDirty = false;
    renderTabs();
  } else {
    openSaveDialog();
  }
}

function openSaveDialog() {
  const tab = getActiveTab();
  saveFileNameInput.value = tab ? tab.title : 'document.txt';
  saveDialog.classList.add('show');
  saveFileNameInput.focus();
  saveFileNameInput.select();
}

function closeSaveDialog() {
  saveDialog.classList.remove('show');
}

dialogConfirmBtn.addEventListener('click', () => {
  const name = saveFileNameInput.value.trim() || 'document.txt';
  const tab = getActiveTab();
  if (tab) {
    tab.title = name;
    tab.filePath = name;
    tab.isDirty = false;
    performDirectDownload(name, cmEditor.getValue());
    renderTabs();
    updateHeaderAndStatus();
    applySyntaxMode(name);
  }
  closeSaveDialog();
});

dialogCancelBtn.addEventListener('click', closeSaveDialog);
closeDialogBtn.addEventListener('click', closeSaveDialog);

// Quick preset chips in Save As dialog
document.querySelectorAll('.sugg-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const ext = chip.getAttribute('data-ext');
    let current = saveFileNameInput.value.trim();
    if (current.includes('.')) {
      current = current.substring(0, current.lastIndexOf('.'));
    }
    saveFileNameInput.value = (current || 'document') + ext;
    saveFileNameInput.focus();
  });
});

function performDirectDownload(filename, text) {
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

// -----------------------------------------------------------------------------
// FILE OPENING & DRAG-AND-DROP
// -----------------------------------------------------------------------------
function openFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      createNewTab(file.name, ev.target.result, file.name);
    };
    reader.readAsText(file);
  };
  input.click();
}

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      createNewTab(file.name, ev.target.result, file.name);
    };
    reader.readAsText(file);
  }
});

// -----------------------------------------------------------------------------
// FORMAT DOCUMENT & QUICK TOOLS
// -----------------------------------------------------------------------------
function formatDocument() {
  if (!cmEditor) return;
  const val = cmEditor.getValue().trim();
  try {
    const obj = JSON.parse(val);
    cmEditor.setValue(JSON.stringify(obj, null, state.tabSize));
  } catch (err) {
    // If not JSON, trim trailing whitespaces cleanly
    const lines = val.split('\n').map(l => l.trimRight());
    cmEditor.setValue(lines.join('\n'));
  }
}

// -----------------------------------------------------------------------------
// MENU SYSTEM
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

// Settings: Theme Switcher
document.querySelectorAll('.theme-select').forEach(item => {
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

// Settings: Indentation
document.querySelectorAll('.indent-select').forEach(item => {
  item.addEventListener('click', () => {
    const indent = parseInt(item.getAttribute('data-indent'), 10);
    state.tabSize = indent;
    localStorage.setItem('nexouya_indent', indent);
    statusSpaces.textContent = `Spaces: ${indent}`;
    if (cmEditor) cmEditor.setOption('tabSize', indent);
  });
});

// View Menu: Word Wrap & Line Numbers
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

// Menu Action Bindings
document.getElementById('menuNew').addEventListener('click', () => createNewTab());
document.getElementById('menuOpen').addEventListener('click', openFilePicker);
document.getElementById('menuSave').addEventListener('click', saveCurrentFile);
document.getElementById('menuSaveAs').addEventListener('click', openSaveDialog);
document.getElementById('menuCloseTab').addEventListener('click', () => {
  if (state.activeTabId) closeTab(state.activeTabId);
});
document.getElementById('menuUndo').addEventListener('click', () => cmEditor && cmEditor.undo());
document.getElementById('menuRedo').addEventListener('click', () => cmEditor && cmEditor.redo());
document.getElementById('menuFormat').addEventListener('click', formatDocument);
document.getElementById('menuSelectAll').addEventListener('click', () => cmEditor && cmEditor.execCommand('selectAll'));

// Quick Buttons
quickNewBtn.addEventListener('click', () => createNewTab());
quickOpenBtn.addEventListener('click', openFilePicker);
quickSaveBtn.addEventListener('click', saveCurrentFile);
addTabBtn.addEventListener('click', () => createNewTab());

// -----------------------------------------------------------------------------
// KEYBOARD SHORTCUTS
// -----------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') {
      e.preventDefault();
      if (e.shiftKey) openSaveDialog(); else saveCurrentFile();
    } else if (e.key === 'o') {
      e.preventDefault();
      openFilePicker();
    } else if (e.key === 'n') {
      e.preventDefault();
      createNewTab();
    } else if (e.key === 'w') {
      e.preventDefault();
      if (state.activeTabId) closeTab(state.activeTabId);
    }
  } else if (e.altKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    formatDocument();
  }
});

// Helper utilities
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function saveSession() {
  localStorage.setItem('nexouya_state', JSON.stringify({
    tabs: state.tabs,
    activeTabId: state.activeTabId
  }));
}

// Initial Boot Sequence
initEditor();
applyTheme(state.theme);
wrapStatus.textContent = state.wordWrap ? 'ON' : 'OFF';
lineNumStatus.textContent = state.lineNumbers ? 'ON' : 'OFF';
statusSpaces.textContent = `Spaces: ${state.tabSize}`;

// Restore Previous Session or Default Demo
const saved = localStorage.getItem('nexouya_state');
if (saved) {
  try {
    const parsed = JSON.parse(saved);
    state.tabs = parsed.tabs || [];
    state.activeTabId = parsed.activeTabId || null;
  } catch (e) {
    console.error('Session restore error:', e);
  }
}

if (!state.tabs || state.tabs.length === 0) {
  const initialCode = `// ==========================================
// NEXOUYA PAD - Professional Desktop Editor
// ==========================================

import { readChunk, saveFile } from "@tauri/fs-mmap";

class HighPerformanceEngine {
  constructor(config = {}) {
    this.name = "NEXOUYA PAD";
    this.version = "1.0.0";
    this.memoryMapped = true;
    this.supportedExtensions = [
      ".json", ".yaml", ".py", ".rs", ".js", ".ts", ".env", ".md"
    ];
  }

  async streamLargeFile(path, offset = 0) {
    // Reads chunks directly via Rust mmap memory mapping
    console.log(\`Streaming \${path} without loading multi-GBs into RAM\`);
    return await readChunk(path, offset, 64 * 1024);
  }
}

const engine = new HighPerformanceEngine();
console.log("Ready.", engine);`;

  createNewTab('main.js', initialCode);
} else {
  renderTabs();
  switchTab(state.activeTabId || state.tabs[0].id);
}

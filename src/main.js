/**
 * AetherPad - Core Architecture
 * Multi-tab, universal format, auto-save memory, glassmorphic themes
 */

// Fallback Tauri API Bridge if running in browser vs Tauri desktop
const isTauri = window.__TAURI_INTERNALS__ !== undefined;

let invokeTauri = async (cmd, args) => {
  if (isTauri && window.__TAURI__ && window.__TAURI__.core) {
    return await window.__TAURI__.core.invoke(cmd, args);
  }
  return null;
};

// Application State
let state = {
  activeTabId: null,
  tabs: [],
  theme: localStorage.getItem('aetherpad_theme') || 'theme-obsidian',
  direction: localStorage.getItem('aetherpad_dir') || 'ltr'
};

// DOM Elements
const tabStrip = document.getElementById('tabStrip');
const editor = document.getElementById('editorTextArea');
const lineGutter = document.getElementById('lineGutter');
const filePathDisplay = document.getElementById('filePathDisplay');
const formatBadge = document.getElementById('formatBadge');
const statsDisplay = document.getElementById('statsDisplay');
const sizeDisplay = document.getElementById('sizeDisplay');
const newTabBtn = document.getElementById('newTabBtn');
const openFileBtn = document.getElementById('openFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const saveAsBtn = document.getElementById('saveAsBtn');
const formatCodeBtn = document.getElementById('formatCodeBtn');
const directionToggleBtn = document.getElementById('directionToggleBtn');
const directionLabel = document.getElementById('directionLabel');
const themeBtn = document.getElementById('themeBtn');
const themeDropdown = document.getElementById('themeDropdown');
const saveAsModal = document.getElementById('saveAsModal');
const saveAsFileNameInput = document.getElementById('saveAsFileNameInput');
const cancelSaveAsBtn = document.getElementById('cancelSaveAsBtn');
const confirmSaveAsBtn = document.getElementById('confirmSaveAsBtn');

// Initialize Themes & Direction
document.body.className = state.theme;
applyDirection(state.direction);

// Restore Tabs or Create Default
const savedState = localStorage.getItem('aetherpad_state');
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    state.tabs = parsed.tabs || [];
    state.activeTabId = parsed.activeTabId || null;
  } catch (e) {
    console.error('Failed to parse saved state:', e);
  }
}

if (!state.tabs || state.tabs.length === 0) {
  createNewTab("Untitled.txt", "خوش آمدید به AetherPad!\n\nیک ویرایشگر متن مدرن، شیشه‌ای و سریع با معماری Tauri 2 و Rust.\n\nویژگی‌ها:\n• باز کردن و ذخیره هر نوع فرمت دلخواه (.json, .yaml, .py, .rs, .md, .env)\n• بدون باگ و کرش در فایل‌های سنگین\n• تغییر فوری قالب (دارک، نئون، روشن، اسلیت)\n• پشتیبانی کامل از متون فارسی و راست‌چین");
} else {
  renderTabs();
  switchTab(state.activeTabId || state.tabs[0].id);
}

// -----------------------------------------------------------------------------
// TAB MANAGEMENT
// -----------------------------------------------------------------------------
function createNewTab(title = "Untitled.txt", content = "", filePath = null) {
  const newTab = {
    id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title: title,
    content: content,
    filePath: filePath,
    isDirty: false
  };
  state.tabs.push(newTab);
  renderTabs();
  switchTab(newTab.id);
  saveSession();
}

function closeTab(tabId, e) {
  if (e) e.stopPropagation();
  const index = state.tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  state.tabs.splice(index, 1);
  if (state.tabs.length === 0) {
    createNewTab();
  } else if (state.activeTabId === tabId) {
    const nextTab = state.tabs[Math.max(0, index - 1)];
    switchTab(nextTab.id);
  } else {
    renderTabs();
    saveSession();
  }
}

function switchTab(tabId) {
  const currentTab = getActiveTab();
  if (currentTab) {
    currentTab.content = editor.value;
  }

  state.activeTabId = tabId;
  const targetTab = getActiveTab();
  if (!targetTab) return;

  editor.value = targetTab.content;
  renderTabs();
  updateEditorStats();
  updateGutter();
  updateHeaderAndBadges();
  saveSession();
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function renderTabs() {
  tabStrip.innerHTML = '';
  state.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
    el.innerHTML = `
      ${tab.isDirty ? '<span class="tab-dirty-indicator"></span>' : ''}
      <span>${escapeHtml(tab.title)}</span>
      <span class="tab-close" title="بستن تب">×</span>
    `;
    el.addEventListener('click', () => switchTab(tab.id));
    el.querySelector('.tab-close').addEventListener('click', (e) => closeTab(tab.id, e));
    tabStrip.appendChild(el);
  });
}

function updateHeaderAndBadges() {
  const tab = getActiveTab();
  if (!tab) return;

  filePathDisplay.textContent = tab.filePath || tab.title;

  // Deduce extension
  const fileName = tab.filePath || tab.title;
  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop().toUpperCase() : 'TEXT';
  formatBadge.textContent = ext;
}

// -----------------------------------------------------------------------------
// GUTTER & STATS ENGINE
// -----------------------------------------------------------------------------
function updateGutter() {
  const text = editor.value;
  const lineCount = (text.match(/\n/g) || []).length + 1;

  let gutterHtml = '';
  for (let i = 1; i <= lineCount; i++) {
    gutterHtml += i + '<br>';
  }
  lineGutter.innerHTML = gutterHtml;
}

function updateEditorStats() {
  const text = editor.value;
  const lines = (text.match(/\n/g) || []).length + 1;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const bytes = new Blob([text]).size;

  // Calculate cursor position
  const selStart = editor.selectionStart;
  const currentLine = (text.substring(0, selStart).match(/\n/g) || []).length + 1;
  const lastLineBreak = text.lastIndexOf('\n', selStart - 1);
  const currentCol = selStart - lastLineBreak;

  statsDisplay.textContent = `سطر ${currentLine}، ستون ${currentCol} • ${words} کلمه`;
  sizeDisplay.textContent = formatBytes(bytes);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' بایت';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' کیلوبایت';
  return (bytes / (1024 * 1024)).toFixed(2) + ' مگابایت';
}

// Sync Editor Scroll with Gutter
editor.addEventListener('scroll', () => {
  lineGutter.scrollTop = editor.scrollTop;
});

editor.addEventListener('input', () => {
  const tab = getActiveTab();
  if (tab) {
    tab.content = editor.value;
    tab.isDirty = true;
    renderTabs();
    saveSession();
  }
  updateGutter();
  updateEditorStats();
});

editor.addEventListener('keyup', updateEditorStats);
editor.addEventListener('click', updateEditorStats);

// -----------------------------------------------------------------------------
// FILE SYSTEM ACTIONS (SAVE ANY FORMAT / OPEN / DROP)
// -----------------------------------------------------------------------------
async function openFile() {
  // Try Tauri dialog plugin if present, else standard web input
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      createNewTab(file.name, event.target.result, file.name);
    };
    reader.readAsText(file);
  };
  input.click();
}

async function saveFile() {
  const tab = getActiveTab();
  if (!tab) return;

  if (tab.filePath) {
    downloadFile(tab.filePath, editor.value);
    tab.isDirty = false;
    renderTabs();
  } else {
    promptSaveAs();
  }
}

function promptSaveAs() {
  const tab = getActiveTab();
  saveAsFileNameInput.value = tab ? tab.title : 'document.txt';
  saveAsModal.classList.add('show');
  saveAsFileNameInput.focus();
}

confirmSaveAsBtn.addEventListener('click', () => {
  const fileName = saveAsFileNameInput.value.trim() || 'document.txt';
  const tab = getActiveTab();
  if (tab) {
    tab.title = fileName;
    tab.filePath = fileName;
    tab.isDirty = false;
    downloadFile(fileName, editor.value);
    renderTabs();
    updateHeaderAndBadges();
  }
  saveAsModal.classList.remove('show');
});

cancelSaveAsBtn.addEventListener('click', () => {
  saveAsModal.classList.remove('show');
});

function downloadFile(filename, text) {
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

// Drag and drop files directly onto editor
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
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
// CODE UTILS (FORMAT JSON & TEXT)
// -----------------------------------------------------------------------------
formatCodeBtn.addEventListener('click', () => {
  try {
    const val = editor.value.trim();
    const obj = JSON.parse(val);
    editor.value = JSON.stringify(obj, null, 2);
    updateGutter();
    updateEditorStats();
  } catch (err) {
    // If not JSON, normalize indentation
    const lines = editor.value.split('\n').map(l => l.trimRight());
    editor.value = lines.join('\n');
  }
});

// -----------------------------------------------------------------------------
// THEMES & RTL CONTROLS
// -----------------------------------------------------------------------------
themeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
  themeDropdown.classList.remove('show');
});

document.querySelectorAll('.theme-opt').forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    const chosenTheme = opt.getAttribute('data-theme');
    document.body.className = chosenTheme;
    state.theme = chosenTheme;
    localStorage.setItem('aetherpad_theme', chosenTheme);
    themeDropdown.classList.remove('show');
  });
});

directionToggleBtn.addEventListener('click', () => {
  const nextDir = state.direction === 'ltr' ? 'rtl' : 'ltr';
  applyDirection(nextDir);
});

function applyDirection(dir) {
  state.direction = dir;
  editor.style.direction = dir;
  directionLabel.textContent = dir.toUpperCase();
  localStorage.setItem('aetherpad_dir', dir);
}

// -----------------------------------------------------------------------------
// KEYBOARD SHORTCUTS
// -----------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') {
      e.preventDefault();
      saveFile();
    } else if (e.key === 'o') {
      e.preventDefault();
      openFile();
    } else if (e.key === 'n') {
      e.preventDefault();
      createNewTab();
    } else if (e.key === 'w') {
      e.preventDefault();
      if (state.activeTabId) closeTab(state.activeTabId);
    }
  }
});

// Helper
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function saveSession() {
  localStorage.setItem('aetherpad_state', JSON.stringify({
    tabs: state.tabs,
    activeTabId: state.activeTabId
  }));
}

// Wire Action Buttons
newTabBtn.addEventListener('click', () => createNewTab());
openFileBtn.addEventListener('click', openFile);
saveFileBtn.addEventListener('click', saveFile);
saveAsBtn.addEventListener('click', promptSaveAs);

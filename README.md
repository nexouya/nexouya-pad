# NEXOUYA PAD ⚡

> **Precision Engineered Desktop Code & Text Editor built with Tauri 2 & Rust.**
> Cross-platform, crash-resilient, memory-mapped core with true VS Code syntax highlighting.

---

## 🌟 10/10 Desktop Features

### 1. 🗂️ Native OS File Dialogs (Windows Explorer / Linux GTK)
- Two-step seamless saving: choose file name and custom format, then browse directories in **This PC / Windows Explorer** to select the exact destination.
- Save and edit any file format (`.json`, `.yaml`, `.py`, `.rs`, `.env`, `.md`, `.sql`, `.html`, `.css`, etc.) with zero forced `.txt` extensions.

### 2. 🔍 Real-Time Search & Replace Engine (`Ctrl+F`)
- Instant, sub-millisecond regex/text scanner with live **match counters** (e.g. `1/120 matches`).
- Sequential match jump (`Next`), single item replace, and full document bulk replace (`All`).

### 3. 🖱️ Windows 11 Context Menu Integration ("Edit with NEXOUYA PAD")
- Ready-to-use registry configuration (`register-context-menu.reg`) to embed **Edit with NEXOUYA PAD** directly into Windows 11/10 right-click menu for all files and desktop backgrounds.

### 4. ⚡ Rust Memory-Mapped File Core (`mmap`)
- Handles massive text and code files up to multi-gigabytes without freezing the UI or overwhelming system RAM.

### 5. 💎 Luxury Master Iconography
- Handcrafted, multi-layered vector 'N' origami prism icon with deep obsidian casing and electric blue/cyan accents in all resolutions (`.ico`, `.png`, `.icns`).

### 6. 🐧 Universal Cross-Platform Builds (Windows + Linux)
- Automated builds for:
  - **Windows:** `.msi` and setup `.exe`
  - **Linux:** `.deb` (Ubuntu, Debian, Pop!_OS) and AppImage (Arch, Fedora, openSUSE, KDE Plasma, GNOME, Hyprland, Sway).

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New File / Tab |
| `Ctrl+O` | Open File (Native Dialog) |
| `Ctrl+S` | Quick Save Document |
| `Ctrl+Shift+S` | Save As (Custom Name + Windows Explorer) |
| `Ctrl+W` | Close Current Tab |
| `Ctrl+F` | Find & Replace Bar with Live Match Counter |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Alt+F` | Format Document / JSON |

---

## 🚀 Windows Context Menu Setup

To add **"Edit with NEXOUYA PAD"** to your Windows right-click menu:
1. Double-click `register-context-menu.reg` included in the root folder.
2. Click **Yes** when prompted by Windows Registry Editor.

---

## 💻 Building & Installing

### Automated GitHub Releases
Download pre-built installers directly from the [NEXOUYA PAD Releases Page](https://github.com/nexouya/nexouya-pad/releases).

### Local Development
```bash
# Clone
git clone https://github.com/nexouya/nexouya-pad.git
cd nexouya-pad

# Install Dependencies
npm install

# Run Desktop Dev App
npm run tauri dev

# Compile Native Binaries
npm run tauri build
```

---

## 📜 License
MIT © [nexouya](https://github.com/nexouya)

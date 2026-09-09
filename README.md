# NEXOUYA PAD ⚡

> **Precision Engineered Desktop Code & Text Editor built with Tauri 2 & Rust.**
> Cross-platform, crash-resilient, memory-mapped core with true VS Code syntax highlighting.

---

## 🌟 10/10 Desktop Features

### 1. 🗂️ Native OS File Dialogs (Windows & Linux)
- Full integration with **Windows Explorer** and **Linux GTK File Chooser**.
- Browse directories visually, pick folders, and save with **any custom extension** (`.json`, `.yaml`, `.py`, `.rs`, `.env`, `.md`, `.sql`, etc.) without Windows forcing `.txt` extensions.

### 2. ⚡ Rust Memory-Mapped File Core (`mmap`)
- Opens files of any size (from kilobytes to **multi-gigabytes**) instantaneously.
- Zero UI freezing: reads streamed chunks directly from the disk cache with minimal RAM footprint.

### 3. 🎨 Precision Engineered UI (Zero AI-Cliché / No AI-Soup)
- Clean, native desktop feel inspired by Windows 11 and professional developer tooling.
- **Dark Studio (Default)**, **Clean Paper (Light Mode)**, and **Obsidian Deep (High Contrast)** themes.
- Dedicated **Find & Replace bar (`Ctrl+F`)** with instant regex/text replacement.
- Integrated Persian / RTL mode toggle with a single click or hotkey.

### 4. 🐧 True Multi-Platform Builds (Windows + Universal Linux)
- Pre-compiled packages for:
  - **Windows:** `.msi` and setup `.exe`
  - **Linux:** `.deb` (Ubuntu/Debian), AppImage (Arch, Fedora, OpenSUSE, KDE Plasma, GNOME, Hyprland, Sway)

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New File / Tab |
| `Ctrl+O` | Open File (Native Dialog) |
| `Ctrl+S` | Save Document |
| `Ctrl+Shift+S` | Save As (Native Explorer / File Chooser) |
| `Ctrl+W` | Close Current Tab |
| `Ctrl+F` | Find & Replace Bar |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Alt+F` | Format Document / JSON |

---

## 🚀 Building & Installing

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

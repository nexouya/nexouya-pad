# NEXOUYA PAD ⚡

> **Precision Engineered Desktop Code & Text Editor built with Tauri 2 & Rust.**
> Cross-platform, crash-resilient, memory-mapped core with real VS Code-level syntax highlighting.

---

## 🌟 What Makes NEXOUYA PAD Special

### 1. 🗂️ Pure Native Explorer / GTK Saving (Zero Internal Popups)
- **Direct Save As (`Ctrl+Shift+S`)**: Directly opens **This PC / Windows Explorer** directory browser. Select any folder and type any file name and extension (`.json`, `.yaml`, `.py`, `.rs`, `.env`, `.md`, `.html`, `.css`, etc.) without Windows forcing `.txt`.
- Canceling the dialog cleanly does nothing — zero phantom downloads.
- When renaming or changing format, syntax highlighting immediately updates.

### 2. 🔍 Real Search & Highlight Engine (`Ctrl+R` / `Ctrl+F`)
- Instant, sub-millisecond scanner that highlights **all matches simultaneously** with real editor marker highlights.
- **Match Counter**: Real-time position tracking (e.g. `1/120`).
- **Full Navigation**: Press `Enter` for next match, `Shift+Enter` for previous match.
- **Replace Options**: Selective single-match replace or full-document bulk `Replace All`.

### 3. 🔎 Dynamic Editor Zoom (`Ctrl + Mouse Wheel`)
- Zoom in and out smoothly using **`Ctrl + Mouse Wheel`** or keyboard shortcuts (`Ctrl++`, `Ctrl+-`, `Ctrl+0`).
- Zoom percentage indicator in status bar (`100%`).

### 4. 🛡️ Safe High-Capacity File Loading (No Accidental Truncation)
- Files under 50MB are fully loaded for seamless editing.
- Heavy files (>50MB) are loaded with an ultra-fast 1MB preview stream via Rust `mmap` and marked **Read-Only** to guarantee your multi-gigabyte files are never accidentally overwritten or truncated!

### 5. 🖱️ Windows 11 Context Menu Integration ("Edit with NEXOUYA PAD")
- Ready-to-use registry configuration (`register-context-menu.reg`) to embed **Edit with NEXOUYA PAD** directly into Windows 11/10 right-click menu for any file or desktop background.
- Fully wired to Rust startup args — right-clicking and selecting NEXOUYA PAD opens the clicked file directly into a new tab!

### 6. 🐧 Universal Cross-Platform Builds (Windows + Linux)
- Automated release matrix for:
  - **Windows:** `.msi` and setup `.exe`
  - **Linux:** `.deb` (Ubuntu, Debian, Pop!_OS) and AppImage (Arch, Fedora, openSUSE, KDE Plasma, GNOME, Hyprland, Sway).

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New File / Tab |
| `Ctrl+O` | Open File in This PC |
| `Ctrl+S` | Quick Save Document |
| `Ctrl+Shift+S` | Save As (Direct This PC File Explorer) |
| `Ctrl+W` | Close Tab (with unsaved changes prompt) |
| `Ctrl+R` / `Ctrl+F` | Find & Replace Bar |
| `Enter` / `Shift+Enter` | Next / Previous Match |
| `Ctrl + Wheel` | Dynamic Zoom In / Out |
| `Ctrl+0` | Reset Zoom to 100% |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Alt+F` | Format Document / JSON |

---

## 🚀 Windows Context Menu Setup

To add **"Edit with NEXOUYA PAD"** to your Windows right-click menu:
1. Double-click `register-context-menu.reg` in the app directory.
2. Click **Yes** when prompted by Windows Registry Editor.

---

## 💻 Local Development

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

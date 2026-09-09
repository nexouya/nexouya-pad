# AetherPad 🌌

> **Luxury, ultra-fast & crash-resilient glassmorphic Notepad built with Tauri 2 & Rust.**

AetherPad is designed to solve the frustrations of the default Windows Notepad: crashes on large files, annoying forced `.txt` extensions, lack of syntax clarity, and zero tab restoration.

---

## ✨ Highlights & Capabilities

- 💎 **Luxury Glassmorphic UI:** Smooth backdrop-filter blur with 4 distinct crafted themes:
  - *Obsidian Gold* (Dark Luxury)
  - *Cyberpunk Neon* (Dark High-Contrast)
  - *Nord Frost* (Cool Slate)
  - *Clean Alabaster* (Editorial Light)
- 🚀 **Save & Open Any Format:** No forced `.txt` extensions. Effortlessly create and save `.yaml`, `.json`, `.env`, `.py`, `.rs`, `.md`, `.sql`, etc.
- ⚡ **Crash-Resilient Local Memory:** Automatic state retention. If closed or interrupted, tabs and unsaved changes are preserved.
- 🌍 **Bilingual & RTL Aware:** Instant toggle between LTR and Persian/Arabic RTL.
- 📊 **Real-time Metrics:** Line counter, column position, word count, character count, and file size footprint.
- 🧹 **Quick JSON & Indentation Formatter:** Format messy payloads with a single shortcut.
- 📂 **Drag & Drop:** Drop any file directly into the workspace to open instantly.

---

## 🛠️ Tech Stack

- **Core / Backend:** [Tauri 2](https://v2.tauri.app/) + [Rust](https://www.rust-lang.org/)
- **Frontend / UI:** Vanilla JS + Glassmorphism CSS (Zero framework bloat, sub-30ms startup)
- **CI / CD:** GitHub Actions automated Windows installer & binary builder

---

## 💻 Development & Building

```bash
# Clone the repository
git clone https://github.com/nexouya/aetherpad.git
cd aetherpad

# Install dependencies
npm install

# Run in Development mode
npm run tauri dev

# Build Windows Release (.msi / .exe)
npm run tauri build
```

---

## 📜 License
MIT © [nexouya](https://github.com/nexouya)

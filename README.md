# NEXOUYA PAD ⚡

> **Professional, high-performance desktop text and code editor built with Tauri 2 & Rust.**

NEXOUYA PAD solves the notorious flaws of Windows Notepad: crashes and freezes on large files, forced `.txt` extensions, lack of true VS Code syntax highlighting, and lost state upon exit.

---

## 🚀 Key Advantages Over Standard Notepad

1. **Rust Memory-Mapped File Core (`mmap`):**
   - Handles multi-gigabyte or heavy text files without blowing up RAM.
   - Reads streamed chunks on demand instead of loading everything into memory at once.

2. **True VS Code Syntax Highlighting:**
   - Powered by real tokenizer grammar engines for **JavaScript**, **Python**, **Rust**, **YAML**, **Markdown**, **HTML/CSS**, **JSON**, and **ENV**.
   - Keywords, functions, strings, numbers, and comments are cleanly colored just like in VS Code.

3. **Universal Save Engine (No Forced `.txt`):**
   - Complete freedom to save and open files with any extension (`.yaml`, `.json`, `.env`, `.py`, `.rs`, `.sql`, `.toml`, etc.) without Windows forcing `.txt` on you.
   - Quick extension chip selectors in the Save As dialog.

4. **Engineered Desktop Design (Zero AI-Cliché / No AI-Soup):**
   - Clean native menu bar (`File`, `Edit`, `Settings`).
   - Settings dropdown with **VS Dark** and **VS Light** themes.
   - Bilingual support: One-click instant switch between **LTR** and **RTL (Persian/Arabic)**.

5. **Crash-Proof Local Tab Session:**
   - Multi-tab support.
   - All open tabs and unsaved changes survive sudden reboots and application restarts.

---

## 🛠️ Architecture

- **Backend:** [Tauri 2](https://v2.tauri.app/) + [Rust](https://www.rust-lang.org/) (`memmap2`, `serde`)
- **Frontend:** CodeMirror 5 Syntax Engine + Vanilla JS & CSS
- **CI / CD:** GitHub Actions automated Windows installer & binary builder

---

## 💻 Building & Running

```bash
# Clone the repository
git clone https://github.com/nexouya/nexouya-pad.git
cd nexouya-pad

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

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use memmap2::Mmap;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct FileMetadata {
    pub size_bytes: u64,
    pub is_huge: bool,
    pub preview: String,
}

/// Native Open File Dialog using OS-level File Dialog (Windows Explorer / Linux GTK)
#[tauri::command]
fn open_file_dialog() -> Result<Option<String>, String> {
    let file = FileDialog::new()
        .add_filter("All Files (*.*)", &["*"])
        .add_filter(
            "Text & Code Files",
            &[
                "txt", "md", "json", "yaml", "yml", "js", "ts", "py", "rs", "html", "css", "env",
                "sql", "xml", "toml", "log", "ini", "conf",
            ],
        )
        .pick_file();

    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

/// Native Save File Dialog (Always opens "This PC" / File Explorer directory picker)
#[tauri::command]
fn save_file_dialog(default_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = FileDialog::new()
        .add_filter("All Files (*.*)", &["*"])
        .add_filter(
            "Text & Code Files",
            &[
                "txt", "md", "json", "yaml", "yml", "js", "ts", "py", "rs", "html", "css", "env",
                "sql", "xml", "toml",
            ],
        );

    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    let file = dialog.save_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

/// High-speed Memory-Mapped inspection
#[tauri::command]
fn inspect_file(path: String) -> Result<FileMetadata, String> {
    let file = File::open(&path).map_err(|e| format!("Cannot open: {}", e))?;
    let meta = file.metadata().map_err(|e| format!("Metadata error: {}", e))?;
    let size = meta.len();

    // 10MB threshold for virtual mmap chunking vs direct load
    let is_huge = size > 10 * 1024 * 1024;

    let preview = if is_huge {
        let mmap = unsafe { Mmap::map(&file).map_err(|e| format!("Mmap error: {}", e))? };
        let preview_len = (256 * 1024).min(size as usize);
        String::from_utf8_lossy(&mmap[0..preview_len]).to_string()
    } else {
        fs::read_to_string(&path).unwrap_or_else(|_| "[Binary or Non-UTF8 Content]".into())
    };

    Ok(FileMetadata {
        size_bytes: size,
        is_huge,
        preview,
    })
}

/// Memory-Mapped sequential chunk reader for files up to multi-terabytes
#[tauri::command]
fn read_file_chunk(path: String, offset: u64, length: usize) -> Result<String, String> {
    let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let metadata = file.metadata().map_err(|e| format!("Failed to inspect file: {}", e))?;
    let file_len = metadata.len();

    if offset >= file_len {
        return Ok(String::new());
    }

    let mmap = unsafe { Mmap::map(&file).map_err(|e| format!("Memory mapping error: {}", e))? };
    let start = offset as usize;
    let end = (start + length).min(file_len as usize);

    let slice = &mmap[start..end];
    Ok(String::from_utf8_lossy(slice).to_string())
}

/// Save file directly to given filesystem path
#[tauri::command]
fn save_file_direct(path: String, contents: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut file = File::create(&path).map_err(|e| format!("Failed to write: {}", e))?;
    file.write_all(contents.as_bytes())
        .map_err(|e| format!("Write failed: {}", e))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_dialog,
            inspect_file,
            read_file_chunk,
            save_file_direct
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXOUYA PAD application");
}

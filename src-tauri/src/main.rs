// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use memmap2::Mmap;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileMetadata {
    pub size_bytes: u64,
    pub is_huge: bool,
    pub preview: String,
    pub is_readonly: bool,
    pub detected_line_ending: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NativeDialogResult {
    pub canceled: bool,
    pub file_path: Option<String>,
}

/// Retrieve startup cli argument (e.g. from Windows Context Menu "Edit with NEXOUYA PAD <file>")
#[tauri::command]
fn get_startup_file() -> Option<String> {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 {
        let candidate = &args[1];
        let p = Path::new(candidate);
        if p.is_file() {
            return Some(candidate.clone());
        }
    }
    None
}

/// Native Open File Dialog using OS-level File Dialog (Windows Explorer / Linux GTK)
#[tauri::command]
fn open_file_dialog() -> NativeDialogResult {
    let file = FileDialog::new()
        .add_filter("All Files (*.*)", &["*"])
        .add_filter(
            "Text & Code Files",
            &[
                "txt", "md", "json", "yaml", "yml", "js", "ts", "py", "rs", "html", "css", "env",
                "sql", "xml", "toml", "log", "ini", "conf", "sh", "bat", "cmd", "csv",
            ],
        )
        .pick_file();

    match file {
        Some(p) => NativeDialogResult {
            canceled: false,
            file_path: Some(p.to_string_lossy().to_string()),
        },
        None => NativeDialogResult {
            canceled: true,
            file_path: None,
        },
    }
}

/// Native Save File Dialog (Directly opens "This PC" / File Explorer directory picker with default name)
#[tauri::command]
fn save_file_dialog(default_name: Option<String>) -> NativeDialogResult {
    let mut dialog = FileDialog::new()
        .add_filter("All Files (*.*)", &["*"])
        .add_filter(
            "Text & Code Files",
            &[
                "txt", "md", "json", "yaml", "yml", "js", "ts", "py", "rs", "html", "css", "env",
                "sql", "xml", "toml",
            ],
        );

    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }

    match dialog.save_file() {
        Some(p) => NativeDialogResult {
            canceled: false,
            file_path: Some(p.to_string_lossy().to_string()),
        },
        None => NativeDialogResult {
            canceled: true,
            file_path: None,
        },
    }
}

/// High-speed inspection & full safe loader
#[tauri::command]
fn inspect_file(path: String) -> Result<FileMetadata, String> {
    let file = File::open(&path).map_err(|e| format!("Cannot open: {}", e))?;
    let meta = file.metadata().map_err(|e| format!("Metadata error: {}", e))?;
    let size = meta.len();
    let is_readonly = meta.permissions().readonly();

    // 50MB threshold: files up to 50MB can be edited safely in full
    // Files > 50MB are flagged as huge/read-only to prevent partial overwrite data loss!
    let is_huge = size > 50 * 1024 * 1024;

    let (preview, detected_line_ending) = if is_huge {
        let mmap = unsafe { Mmap::map(&file).map_err(|e| format!("Mmap error: {}", e))? };
        let preview_len = (1024 * 1024).min(size as usize); // 1MB preview for huge file
        let slice = &mmap[0..preview_len];
        let text = String::from_utf8_lossy(slice).to_string();
        let le = if text.contains("\r\n") { "CRLF" } else { "LF" };
        (text, le.to_string())
    } else {
        match fs::read(&path) {
            Ok(bytes) => {
                // Check if binary (null bytes in first 2048 bytes)
                let is_binary = bytes.iter().take(2048).any(|&b| b == 0);
                if is_binary {
                    return Err("Binary file detected. Opening raw binary is restricted to prevent file corruption.".into());
                }
                let text = String::from_utf8_lossy(&bytes).to_string();
                let le = if text.contains("\r\n") { "CRLF" } else { "LF" };
                (text, le.to_string())
            }
            Err(e) => return Err(format!("Read failed: {}", e)),
        }
    };

    Ok(FileMetadata {
        size_bytes: size,
        is_huge,
        preview,
        is_readonly: is_readonly || is_huge, // Mark huge files as read-only to prevent accidental truncation
        detected_line_ending,
    })
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
            get_startup_file,
            open_file_dialog,
            save_file_dialog,
            inspect_file,
            save_file_direct
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXOUYA PAD application");
}

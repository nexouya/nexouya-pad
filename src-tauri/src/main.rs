// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use memmap2::Mmap;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;

#[derive(Serialize, Deserialize)]
pub struct FileMetadata {
    pub size_bytes: u64,
    pub is_huge: bool,
    pub preview: String,
}

/// Fast file reading with Memory-Mapping (mmap).
/// For files of any size (even gigabytes/terabytes), it avoids reading
/// the whole file into RAM, enabling instant opening without UI freeze.
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

    // Read byte slice and losslessly decode UTF-8
    let slice = &mmap[start..end];
    Ok(String::from_utf8_lossy(slice).to_string())
}

#[tauri::command]
fn inspect_file(path: String) -> Result<FileMetadata, String> {
    let file = File::open(&path).map_err(|e| format!("Cannot open: {}", e))?;
    let meta = file.metadata().map_err(|e| format!("Metadata error: {}", e))?;
    let size = meta.len();

    // 10MB threshold for virtual chunking vs direct load
    let is_huge = size > 10 * 1024 * 1024;

    let preview = if is_huge {
        let mmap = unsafe { Mmap::map(&file).map_err(|e| format!("Mmap error: {}", e))? };
        let preview_len = (128 * 1024).min(size as usize);
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

#[tauri::command]
fn save_file_direct(path: String, contents: String) -> Result<(), String> {
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
            read_file_chunk,
            inspect_file,
            save_file_direct
        ])
        .run(tauri::generate_context!())
        .expect("error while running NEXOUYA PAD application");
}

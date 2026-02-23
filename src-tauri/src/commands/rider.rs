use std::env;
use std::fs;

/// Writes the rider HTML to a temp file and opens it in the system default browser.
/// The browser handles printing/PDF export natively, avoiding Tauri WebView print limitations.
#[tauri::command]
pub fn rider_open(html: String) -> Result<(), String> {
    let path = env::temp_dir().join("blackout-rider.html");
    fs::write(&path, &html).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path.to_string_lossy().to_string()])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

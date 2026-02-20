use crate::database::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub bpm_api_key: Option<String>,
}

fn get_setting(db: &rusqlite::Connection, key: &str) -> Option<String> {
    db.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .ok()
}

fn upsert_setting(db: &rusqlite::Connection, key: &str, value: &str) -> Result<(), String> {
    db.execute(
        "INSERT INTO settings(key, value) VALUES(?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn settings_get(state: State<AppState>) -> Result<Settings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let theme = get_setting(&db, "theme").unwrap_or_else(|| "dark".to_string());
    let bpm_api_key = get_setting(&db, "bpm_api_key");
    Ok(Settings { theme, bpm_api_key })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSettingsPayload {
    pub theme: Option<String>,
    pub bpm_api_key: Option<String>,
}

#[tauri::command]
pub fn settings_set(
    state: State<AppState>,
    payload: SetSettingsPayload,
) -> Result<Settings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let Some(ref theme) = payload.theme {
        upsert_setting(&db, "theme", theme)?;
    }
    if let Some(ref key) = payload.bpm_api_key {
        upsert_setting(&db, "bpm_api_key", key)?;
    }

    let theme = get_setting(&db, "theme").unwrap_or_else(|| "dark".to_string());
    let bpm_api_key = get_setting(&db, "bpm_api_key");
    Ok(Settings { theme, bpm_api_key })
}

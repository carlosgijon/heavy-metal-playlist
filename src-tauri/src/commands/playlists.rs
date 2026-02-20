use crate::database::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistWithStats {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub song_count: i64,
    pub total_duration: i64,
}

#[tauri::command]
pub fn playlists_get_all(state: State<AppState>) -> Result<Vec<PlaylistWithStats>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "
        SELECT
            p.id,
            p.name,
            p.description,
            p.created_at,
            COUNT(CASE WHEN ps.type != 'event' THEN 1 END) AS song_count,
            COALESCE(SUM(CASE WHEN ps.type != 'event' THEN ls.duration ELSE 0 END), 0) AS total_duration
        FROM playlists p
        LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
        LEFT JOIN library_songs ls ON ls.id = ps.song_id
        GROUP BY p.id, p.name, p.description, p.created_at
        ORDER BY p.created_at ASC
        ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PlaylistWithStats {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                song_count: row.get(4)?,
                total_duration: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlaylistPayload {
    pub name: String,
    pub description: Option<String>,
}

#[tauri::command]
pub fn playlists_create(
    state: State<AppState>,
    payload: CreatePlaylistPayload,
) -> Result<Playlist, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO playlists (id, name, description, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, payload.name, payload.description, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(Playlist {
        id,
        name: payload.name,
        description: payload.description,
        created_at,
    })
}

#[tauri::command]
pub fn playlists_update(state: State<AppState>, playlist: Playlist) -> Result<Playlist, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let rows = db
        .execute(
            "UPDATE playlists SET name = ?1, description = ?2 WHERE id = ?3",
            params![playlist.name, playlist.description, playlist.id],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err(format!("Playlist {} not found", playlist.id));
    }
    Ok(playlist)
}

#[tauri::command]
pub fn playlists_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM playlists WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

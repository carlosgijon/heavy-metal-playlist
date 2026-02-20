use crate::database::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LibrarySong {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub tempo: Option<i64>,
    pub style: Option<String>,
    pub notes: Option<String>,
}

/// Merged view combining playlist_songs + library_songs — used by all playlist-song queries.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistSongView {
    pub id: String,
    pub playlist_id: String,
    pub song_id: Option<String>,
    pub position: i64,
    pub r#type: Option<String>,
    pub title: String,
    pub setlist_name: Option<String>,
    pub join_with_next: bool,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub tempo: Option<i64>,
    pub style: Option<String>,
    pub notes: Option<String>,
}

/// Re-numbers positions 0,1,2,… ordered by current position for a given playlist.
/// Called after any delete that may leave gaps in the sequence.
pub fn renormalize_positions(
    db: &rusqlite::Connection,
    playlist_id: &str,
) -> Result<(), String> {
    let mut stmt = db
        .prepare(
            "SELECT id FROM playlist_songs WHERE playlist_id = ?1 ORDER BY position ASC",
        )
        .map_err(|e| e.to_string())?;

    let ids: Vec<String> = stmt
        .query_map(params![playlist_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (index, id) in ids.iter().enumerate() {
        db.execute(
            "UPDATE playlist_songs SET position = ?1 WHERE id = ?2",
            params![index as i64, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn library_get_all(state: State<AppState>) -> Result<Vec<LibrarySong>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, title, artist, album, duration, tempo, style, notes
             FROM library_songs ORDER BY title ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LibrarySong {
                id: row.get(0)?,
                title: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration: row.get(4)?,
                tempo: row.get(5)?,
                style: row.get(6)?,
                notes: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
pub struct CreateLibrarySongPayload {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub tempo: Option<i64>,
    pub style: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn library_create(
    state: State<AppState>,
    payload: CreateLibrarySongPayload,
) -> Result<LibrarySong, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    db.execute(
        "INSERT INTO library_songs (id, title, artist, album, duration, tempo, style, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            payload.title,
            payload.artist,
            payload.album,
            payload.duration,
            payload.tempo,
            payload.style,
            payload.notes
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(LibrarySong {
        id,
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
        duration: payload.duration,
        tempo: payload.tempo,
        style: payload.style,
        notes: payload.notes,
    })
}

#[tauri::command]
pub fn library_update(state: State<AppState>, song: LibrarySong) -> Result<LibrarySong, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let rows = db
        .execute(
            "UPDATE library_songs SET title=?1, artist=?2, album=?3, duration=?4,
             tempo=?5, style=?6, notes=?7 WHERE id=?8",
            params![
                song.title, song.artist, song.album, song.duration,
                song.tempo, song.style, song.notes, song.id
            ],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err(format!("Library song {} not found", song.id));
    }
    Ok(song)
}

#[tauri::command]
pub fn library_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Capture affected playlist IDs BEFORE the cascade delete removes the rows
    let mut stmt = db
        .prepare("SELECT DISTINCT playlist_id FROM playlist_songs WHERE song_id = ?1")
        .map_err(|e| e.to_string())?;

    let affected: Vec<String> = stmt
        .query_map(params![id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Delete — ON DELETE CASCADE removes the playlist_songs rows automatically
    db.execute("DELETE FROM library_songs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // Re-normalize positions for every affected playlist
    for playlist_id in &affected {
        renormalize_positions(&db, playlist_id)?;
    }

    Ok(())
}

#[tauri::command]
pub fn library_get_usage(state: State<AppState>, id: String) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT DISTINCT playlist_id FROM playlist_songs WHERE song_id = ?1")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddToPlaylistPayload {
    pub playlist_id: String,
    pub song_id: String,
    pub setlist_name: Option<String>,
    pub join_with_next: Option<bool>,
}

#[tauri::command]
pub fn library_add_to_playlist(
    state: State<AppState>,
    payload: AddToPlaylistPayload,
) -> Result<PlaylistSongView, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Verify the library song exists and fetch its data
    let song: LibrarySong = db
        .query_row(
            "SELECT id, title, artist, album, duration, tempo, style, notes
             FROM library_songs WHERE id = ?1",
            params![payload.song_id],
            |row| {
                Ok(LibrarySong {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    duration: row.get(4)?,
                    tempo: row.get(5)?,
                    style: row.get(6)?,
                    notes: row.get(7)?,
                })
            },
        )
        .map_err(|_| format!("Library song {} not found", payload.song_id))?;

    // Next position = current count in this playlist
    let position: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = ?1",
            params![payload.playlist_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let entry_id = Uuid::new_v4().to_string();
    let join_flag = payload.join_with_next.unwrap_or(false) as i64;

    db.execute(
        "INSERT INTO playlist_songs (id, playlist_id, song_id, position, type, setlist_name, join_with_next)
         VALUES (?1, ?2, ?3, ?4, 'song', ?5, ?6)",
        params![
            entry_id,
            payload.playlist_id,
            payload.song_id,
            position,
            payload.setlist_name,
            join_flag
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(PlaylistSongView {
        id: entry_id,
        playlist_id: payload.playlist_id,
        song_id: Some(song.id),
        position,
        r#type: Some("song".to_string()),
        title: song.title,
        setlist_name: payload.setlist_name,
        join_with_next: payload.join_with_next.unwrap_or(false),
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        tempo: song.tempo,
        style: song.style,
        notes: song.notes,
    })
}

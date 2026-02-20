use crate::commands::library::{renormalize_positions, PlaylistSongView};
use crate::database::AppState;
use rusqlite::params;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

const SONG_VIEW_QUERY: &str = "
    SELECT
        ps.id, ps.playlist_id, ps.song_id, ps.position, ps.type,
        COALESCE(ls.title, ps.title, '') AS title,
        ps.setlist_name,
        ps.join_with_next,
        COALESCE(ls.artist, '') AS artist,
        ls.album, ls.duration, ls.tempo, ls.style, ls.notes
    FROM playlist_songs ps
    LEFT JOIN library_songs ls ON ls.id = ps.song_id
";

fn map_view_row(row: &rusqlite::Row) -> rusqlite::Result<PlaylistSongView> {
    let join_int: i64 = row.get(7)?;
    Ok(PlaylistSongView {
        id: row.get(0)?,
        playlist_id: row.get(1)?,
        song_id: row.get(2)?,
        position: row.get(3)?,
        r#type: row.get(4)?,
        title: row.get(5)?,
        setlist_name: row.get(6)?,
        join_with_next: join_int != 0,
        artist: row.get(8)?,
        album: row.get(9)?,
        duration: row.get(10)?,
        tempo: row.get(11)?,
        style: row.get(12)?,
        notes: row.get(13)?,
    })
}

#[tauri::command]
pub fn songs_get_by_playlist(
    state: State<AppState>,
    playlist_id: String,
) -> Result<Vec<PlaylistSongView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let query = format!(
        "{} WHERE ps.playlist_id = ?1 ORDER BY ps.position ASC",
        SONG_VIEW_QUERY
    );
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![playlist_id], map_view_row)
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSongPayload {
    pub playlist_id: String,
    pub song_id: Option<String>,
    pub r#type: Option<String>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub tempo: Option<i64>,
    pub style: Option<String>,
    pub notes: Option<String>,
    pub setlist_name: Option<String>,
    pub join_with_next: Option<bool>,
}

#[tauri::command]
pub fn songs_create(
    state: State<AppState>,
    song: CreateSongPayload,
) -> Result<PlaylistSongView, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let entry_type = song.r#type.as_deref().unwrap_or("song");

    let position: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = ?1",
            params![song.playlist_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let entry_id = Uuid::new_v4().to_string();

    if entry_type == "event" {
        let title = song.title.clone().unwrap_or_default();
        db.execute(
            "INSERT INTO playlist_songs (id, playlist_id, position, type, title, join_with_next)
             VALUES (?1, ?2, ?3, 'event', ?4, 0)",
            params![entry_id, song.playlist_id, position, title],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // Resolve library song ID: use existing or create a new library entry
        let lib_song_id = if let Some(ref sid) = song.song_id {
            sid.clone()
        } else {
            let lib_id = Uuid::new_v4().to_string();
            db.execute(
                "INSERT INTO library_songs (id, title, artist, album, duration, tempo, style, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    lib_id,
                    song.title.as_deref().unwrap_or(""),
                    song.artist.as_deref().unwrap_or(""),
                    song.album,
                    song.duration,
                    song.tempo,
                    song.style,
                    song.notes
                ],
            )
            .map_err(|e| e.to_string())?;
            lib_id
        };

        let join_flag = song.join_with_next.unwrap_or(false) as i64;
        db.execute(
            "INSERT INTO playlist_songs (id, playlist_id, song_id, position, type, setlist_name, join_with_next)
             VALUES (?1, ?2, ?3, ?4, 'song', ?5, ?6)",
            params![
                entry_id,
                song.playlist_id,
                lib_song_id,
                position,
                song.setlist_name,
                join_flag
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // Return the full merged view
    let query = format!("{} WHERE ps.id = ?1", SONG_VIEW_QUERY);
    db.query_row(&query, params![entry_id], map_view_row)
        .map_err(|e| e.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSongPayload {
    pub id: String,
    pub playlist_id: String,
    pub song_id: Option<String>,
    pub r#type: Option<String>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub tempo: Option<i64>,
    pub style: Option<String>,
    pub notes: Option<String>,
    pub setlist_name: Option<String>,
    pub join_with_next: Option<bool>,
    pub position: i64,
}

#[tauri::command]
pub fn songs_update(
    state: State<AppState>,
    song: UpdateSongPayload,
) -> Result<PlaylistSongView, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let join_flag = song.join_with_next.unwrap_or(false) as i64;
    let entry_type = song.r#type.as_deref().unwrap_or("song");

    if entry_type == "event" {
        db.execute(
            "UPDATE playlist_songs SET title=?1, setlist_name=?2, join_with_next=?3 WHERE id=?4",
            params![song.title, song.setlist_name, join_flag, song.id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // Update junction-row fields
        db.execute(
            "UPDATE playlist_songs SET setlist_name=?1, join_with_next=?2 WHERE id=?3",
            params![song.setlist_name, join_flag, song.id],
        )
        .map_err(|e| e.to_string())?;

        // Update shared library fields (affects all playlists using this song)
        if let Some(ref sid) = song.song_id {
            db.execute(
                "UPDATE library_songs SET title=?1, artist=?2, album=?3, duration=?4,
                 tempo=?5, style=?6, notes=?7 WHERE id=?8",
                params![
                    song.title, song.artist, song.album,
                    song.duration, song.tempo, song.style, song.notes, sid
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let query = format!("{} WHERE ps.id = ?1", SONG_VIEW_QUERY);
    db.query_row(&query, params![song.id], map_view_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn songs_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let playlist_id: String = db
        .query_row(
            "SELECT playlist_id FROM playlist_songs WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| format!("PlaylistSong {} not found", id))?;

    db.execute("DELETE FROM playlist_songs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    renormalize_positions(&db, &playlist_id)?;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderPayload {
    pub playlist_id: String,
    pub ids: Vec<String>,
}

#[tauri::command]
pub fn songs_reorder(
    state: State<AppState>,
    payload: ReorderPayload,
) -> Result<Vec<PlaylistSongView>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    for (index, id) in payload.ids.iter().enumerate() {
        db.execute(
            "UPDATE playlist_songs SET position = ?1 WHERE id = ?2 AND playlist_id = ?3",
            params![index as i64, id, payload.playlist_id],
        )
        .map_err(|e| e.to_string())?;
    }

    let query = format!(
        "{} WHERE ps.playlist_id = ?1 ORDER BY ps.position ASC",
        SONG_VIEW_QUERY
    );
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![payload.playlist_id], map_view_row)
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

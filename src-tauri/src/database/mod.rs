use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct AppState {
    pub db: Mutex<Connection>,
}

pub fn init_db(app: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("could not resolve app data dir");

    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("heavy-metal-playlist.db");
    let conn = Connection::open(&db_path)?;

    // WAL mode for better performance; enforce foreign key constraints
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    create_schema(&conn)?;
    Ok(conn)
}

fn create_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS playlists (
            id          TEXT PRIMARY KEY NOT NULL,
            name        TEXT NOT NULL,
            description TEXT,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS library_songs (
            id       TEXT PRIMARY KEY NOT NULL,
            title    TEXT NOT NULL,
            artist   TEXT NOT NULL,
            album    TEXT,
            duration INTEGER,
            tempo    INTEGER,
            style    TEXT,
            notes    TEXT
        );

        CREATE TABLE IF NOT EXISTS playlist_songs (
            id             TEXT PRIMARY KEY NOT NULL,
            playlist_id    TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
            song_id        TEXT REFERENCES library_songs(id) ON DELETE CASCADE,
            position       INTEGER NOT NULL,
            type           TEXT NOT NULL DEFAULT 'song',
            title          TEXT,
            setlist_name   TEXT,
            join_with_next INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_ps_playlist ON playlist_songs(playlist_id);
        CREATE INDEX IF NOT EXISTS idx_ps_song     ON playlist_songs(song_id);
        ",
    )
}

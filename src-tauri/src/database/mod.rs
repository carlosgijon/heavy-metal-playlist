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

    let db_path = app_dir.join("blackout-orm.db");
    let conn = Connection::open(&db_path)?;

    // WAL mode for better performance; enforce foreign key constraints
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    create_schema(&conn)?;

    // Migrations: add columns silently if they don't exist yet
    let _ = conn.execute(
        "ALTER TABLE amplifiers ADD COLUMN mic_id TEXT REFERENCES microphones(id) ON DELETE SET NULL",
        [],
    );
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN stage_position TEXT", []);
    // Cabinet / speaker fields for amplifiers
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN cabinet_brand TEXT", []);
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN speaker_brand TEXT", []);
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN speaker_model TEXT", []);
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN speaker_config TEXT", []);
    // Usage field for microphones
    let _ = conn.execute("ALTER TABLE microphones ADD COLUMN usage TEXT", []);
    // Monitor type / IEM fields for PA equipment
    let _ = conn.execute("ALTER TABLE pa_equipment ADD COLUMN monitor_type TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE pa_equipment ADD COLUMN iem_wireless INTEGER NOT NULL DEFAULT 0",
        [],
    );

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

        CREATE TABLE IF NOT EXISTS microphones (
            id            TEXT PRIMARY KEY NOT NULL,
            name          TEXT NOT NULL,
            brand         TEXT,
            model         TEXT,
            type          TEXT NOT NULL,
            polar_pattern TEXT,
            phantom_power INTEGER NOT NULL DEFAULT 0,
            notes         TEXT
        );

        CREATE TABLE IF NOT EXISTS band_members (
            id             TEXT PRIMARY KEY NOT NULL,
            name           TEXT NOT NULL,
            role           TEXT NOT NULL,
            stage_position TEXT,
            vocal_mic_id   TEXT REFERENCES microphones(id) ON DELETE SET NULL,
            notes          TEXT,
            sort_order     INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS instruments (
            id            TEXT PRIMARY KEY NOT NULL,
            member_id     TEXT REFERENCES band_members(id) ON DELETE SET NULL,
            name          TEXT NOT NULL,
            type          TEXT NOT NULL,
            brand         TEXT,
            model         TEXT,
            mic_id        TEXT REFERENCES microphones(id) ON DELETE SET NULL,
            uses_di       INTEGER NOT NULL DEFAULT 0,
            channel_order INTEGER NOT NULL DEFAULT 0,
            notes         TEXT
        );

        CREATE TABLE IF NOT EXISTS amplifiers (
            id        TEXT PRIMARY KEY NOT NULL,
            member_id TEXT REFERENCES band_members(id) ON DELETE SET NULL,
            name      TEXT NOT NULL,
            brand     TEXT,
            model     TEXT,
            type      TEXT NOT NULL,
            wattage   INTEGER,
            notes     TEXT
        );

        CREATE TABLE IF NOT EXISTS pa_equipment (
            id        TEXT PRIMARY KEY NOT NULL,
            category  TEXT NOT NULL,
            name      TEXT NOT NULL,
            brand     TEXT,
            model     TEXT,
            quantity  INTEGER NOT NULL DEFAULT 1,
            channels  INTEGER,
            aux_sends INTEGER,
            wattage   INTEGER,
            notes     TEXT
        );
        ",
    )
}

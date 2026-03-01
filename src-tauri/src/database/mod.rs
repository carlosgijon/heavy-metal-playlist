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
    // DI flag for amplifiers
    let _ = conn.execute(
        "ALTER TABLE amplifiers ADD COLUMN uses_di INTEGER NOT NULL DEFAULT 0",
        [],
    );
    // Mic assignment: where the mic is used (member/amplifier/instrument)
    let _ = conn.execute("ALTER TABLE microphones ADD COLUMN assigned_to_type TEXT", []);
    let _ = conn.execute("ALTER TABLE microphones ADD COLUMN assigned_to_id TEXT", []);
    // Signal routing fields for instruments
    let _ = conn.execute("ALTER TABLE instruments ADD COLUMN routing TEXT NOT NULL DEFAULT 'di'", []);
    let _ = conn.execute("ALTER TABLE instruments ADD COLUMN amp_id TEXT REFERENCES amplifiers(id) ON DELETE SET NULL", []);
    let _ = conn.execute("ALTER TABLE instruments ADD COLUMN mono_stereo TEXT NOT NULL DEFAULT 'mono'", []);
    // Signal routing fields for amplifiers
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN routing TEXT NOT NULL DEFAULT 'di'", []);
    let _ = conn.execute("ALTER TABLE amplifiers ADD COLUMN mono_stereo TEXT NOT NULL DEFAULT 'mono'", []);
    // Drum microphone assignment for instruments
    let _ = conn.execute("ALTER TABLE instruments ADD COLUMN mic_id TEXT REFERENCES microphones(id) ON DELETE SET NULL", []);
    // Mono/stereo for microphones
    let _ = conn.execute("ALTER TABLE microphones ADD COLUMN mono_stereo TEXT NOT NULL DEFAULT 'mono'", []);
    // Per-gig checklists: add checklist_id to existing rows (NULL = legacy global item)
    let _ = conn.execute("ALTER TABLE checklist_items ADD COLUMN checklist_id TEXT", []);
    // Follow-up reminder fields for gigs
    let _ = conn.execute("ALTER TABLE gigs ADD COLUMN follow_up_date TEXT", []);
    let _ = conn.execute("ALTER TABLE gigs ADD COLUMN follow_up_note TEXT", []);

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

        CREATE TABLE IF NOT EXISTS venues (
            id            TEXT PRIMARY KEY NOT NULL,
            name          TEXT NOT NULL,
            city          TEXT,
            address       TEXT,
            website       TEXT,
            capacity      INTEGER,
            booking_name  TEXT,
            booking_email TEXT,
            booking_phone TEXT,
            notes         TEXT,
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS gigs (
            id              TEXT PRIMARY KEY NOT NULL,
            venue_id        TEXT REFERENCES venues(id) ON DELETE SET NULL,
            title           TEXT NOT NULL,
            date            TEXT,
            time            TEXT,
            status          TEXT NOT NULL DEFAULT 'lead',
            pay             TEXT,
            load_in_time    TEXT,
            soundcheck_time TEXT,
            set_time        TEXT,
            setlist_id      TEXT REFERENCES playlists(id) ON DELETE SET NULL,
            notes           TEXT,
            created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id         TEXT PRIMARY KEY NOT NULL,
            type       TEXT NOT NULL,
            title      TEXT NOT NULL,
            date       TEXT NOT NULL,
            end_date   TEXT,
            member_id  TEXT REFERENCES band_members(id) ON DELETE CASCADE,
            all_day    INTEGER NOT NULL DEFAULT 1,
            notes      TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS checklist_items (
            id           TEXT PRIMARY KEY NOT NULL,
            checklist_id TEXT REFERENCES gig_checklists(id) ON DELETE CASCADE,
            category     TEXT NOT NULL DEFAULT 'otro',
            text         TEXT NOT NULL,
            done         INTEGER NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS gig_checklists (
            id         TEXT PRIMARY KEY NOT NULL,
            gig_id     TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
            name       TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS gig_contacts (
            id           TEXT PRIMARY KEY NOT NULL,
            gig_id       TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
            date         TEXT NOT NULL,
            contact_type TEXT NOT NULL DEFAULT 'call',
            notes        TEXT,
            created_at   TEXT NOT NULL
        );
        ",
    )
}

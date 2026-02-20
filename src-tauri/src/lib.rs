mod commands;
mod database;

use database::AppState;
use std::sync::Mutex;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let db = database::init_db(app.handle())?;
            app.manage(AppState {
                db: Mutex::new(db),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::playlists::playlists_get_all,
            commands::playlists::playlists_create,
            commands::playlists::playlists_update,
            commands::playlists::playlists_delete,
            commands::library::library_get_all,
            commands::library::library_create,
            commands::library::library_update,
            commands::library::library_delete,
            commands::library::library_get_usage,
            commands::library::library_add_to_playlist,
            commands::songs::songs_get_by_playlist,
            commands::songs::songs_create,
            commands::songs::songs_update,
            commands::songs::songs_delete,
            commands::songs::songs_reorder,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::bpm::bpm_lookup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

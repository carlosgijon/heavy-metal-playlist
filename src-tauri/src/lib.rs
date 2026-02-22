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
            commands::equipment::members_get_all,
            commands::equipment::members_create,
            commands::equipment::members_update,
            commands::equipment::members_delete,
            commands::equipment::microphones_get_all,
            commands::equipment::microphones_create,
            commands::equipment::microphones_update,
            commands::equipment::microphones_delete,
            commands::equipment::instruments_get_all,
            commands::equipment::instruments_create,
            commands::equipment::instruments_update,
            commands::equipment::instruments_delete,
            commands::equipment::amplifiers_get_all,
            commands::equipment::amplifiers_create,
            commands::equipment::amplifiers_update,
            commands::equipment::amplifiers_delete,
            commands::equipment::pa_get_all,
            commands::equipment::pa_create,
            commands::equipment::pa_update,
            commands::equipment::pa_delete,
            commands::equipment::channel_list_generate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

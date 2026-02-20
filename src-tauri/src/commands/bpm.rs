use crate::database::AppState;
use tauri::State;

/// Looks up the BPM of a track via the Deezer API.
/// Runs in Rust to bypass browser CORS restrictions.
#[tauri::command]
pub async fn bpm_lookup(
    _state: State<'_, AppState>,
    title: String,
    artist: String,
) -> Result<Option<i64>, String> {
    if title.trim().is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::new();

    // Search for the track
    let query = format!(
        "track:\"{}\" artist:\"{}\"",
        title.trim(),
        artist.trim()
    );
    let encoded = urlencoding::encode(&query);
    let search_url = format!("https://api.deezer.com/search?q={}&limit=1", encoded);

    let search_res: serde_json::Value = client
        .get(&search_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let track_id = search_res["data"][0]["id"].as_u64();
    let Some(id) = track_id else {
        return Ok(None);
    };

    // Fetch track detail to get BPM
    let track_url = format!("https://api.deezer.com/track/{}", id);
    let track_res: serde_json::Value = client
        .get(&track_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let bpm = track_res["bpm"].as_f64();
    Ok(bpm.filter(|&b| b > 0.0).map(|b| b.round() as i64))
}

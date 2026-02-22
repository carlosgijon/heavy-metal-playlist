use crate::database::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ── Structs ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BandMember {
    pub id: String,
    pub name: String,
    pub role: String,
    pub stage_position: Option<String>,
    pub vocal_mic_id: Option<String>,
    pub notes: Option<String>,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Microphone {
    pub id: String,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "type")]
    pub mic_type: String,
    pub polar_pattern: Option<String>,
    pub phantom_power: bool,
    pub notes: Option<String>,
    pub usage: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Instrument {
    pub id: String,
    pub member_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub instrument_type: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub mic_id: Option<String>,
    pub uses_di: bool,
    pub channel_order: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Amplifier {
    pub id: String,
    pub member_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub amp_type: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub wattage: Option<i64>,
    pub mic_id: Option<String>,
    pub stage_position: Option<String>,
    pub notes: Option<String>,
    pub cabinet_brand: Option<String>,
    pub speaker_brand: Option<String>,
    pub speaker_model: Option<String>,
    pub speaker_config: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaEquipment {
    pub id: String,
    pub category: String,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub quantity: i64,
    pub channels: Option<i64>,
    pub aux_sends: Option<i64>,
    pub wattage: Option<i64>,
    pub notes: Option<String>,
    pub monitor_type: Option<String>,
    pub iem_wireless: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChannelEntry {
    pub channel_number: i64,
    pub name: String,
    pub mono_stereo: String,
    pub phantom_power: bool,
    pub mic_model: Option<String>,
    pub mic_type: Option<String>,
    pub polar_pattern: Option<String>,
    pub notes: Option<String>,
}

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberPayload {
    pub name: String,
    pub role: String,
    pub stage_position: Option<String>,
    pub vocal_mic_id: Option<String>,
    pub notes: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrophonePayload {
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "type")]
    pub mic_type: String,
    pub polar_pattern: Option<String>,
    pub phantom_power: Option<bool>,
    pub notes: Option<String>,
    pub usage: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstrumentPayload {
    pub member_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub instrument_type: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub mic_id: Option<String>,
    pub uses_di: Option<bool>,
    pub channel_order: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmplifierPayload {
    pub member_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub amp_type: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub wattage: Option<i64>,
    pub mic_id: Option<String>,
    pub stage_position: Option<String>,
    pub notes: Option<String>,
    pub cabinet_brand: Option<String>,
    pub speaker_brand: Option<String>,
    pub speaker_model: Option<String>,
    pub speaker_config: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaPayload {
    pub category: String,
    pub name: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub quantity: Option<i64>,
    pub channels: Option<i64>,
    pub aux_sends: Option<i64>,
    pub wattage: Option<i64>,
    pub notes: Option<String>,
    pub monitor_type: Option<String>,
    pub iem_wireless: Option<bool>,
}

// ── Band Members ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn members_get_all(state: State<AppState>) -> Result<Vec<BandMember>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, name, role, stage_position, vocal_mic_id, notes, sort_order
             FROM band_members ORDER BY sort_order ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BandMember {
                id: row.get(0)?,
                name: row.get(1)?,
                role: row.get(2)?,
                stage_position: row.get(3)?,
                vocal_mic_id: row.get(4)?,
                notes: row.get(5)?,
                sort_order: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn members_create(state: State<AppState>, payload: MemberPayload) -> Result<BandMember, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let sort_order = payload.sort_order.unwrap_or(0);
    db.execute(
        "INSERT INTO band_members (id, name, role, stage_position, vocal_mic_id, notes, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id, payload.name, payload.role, payload.stage_position,
            payload.vocal_mic_id, payload.notes, sort_order
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(BandMember {
        id,
        name: payload.name,
        role: payload.role,
        stage_position: payload.stage_position,
        vocal_mic_id: payload.vocal_mic_id,
        notes: payload.notes,
        sort_order,
    })
}

#[tauri::command]
pub fn members_update(state: State<AppState>, member: BandMember) -> Result<BandMember, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE band_members SET name=?2, role=?3, stage_position=?4, vocal_mic_id=?5,
         notes=?6, sort_order=?7 WHERE id=?1",
        params![
            member.id, member.name, member.role, member.stage_position,
            member.vocal_mic_id, member.notes, member.sort_order
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(member)
}

#[tauri::command]
pub fn members_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM band_members WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Microphones ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn microphones_get_all(state: State<AppState>) -> Result<Vec<Microphone>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, name, brand, model, type, polar_pattern, phantom_power, notes, usage
             FROM microphones ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let pp: i64 = row.get(6)?;
            Ok(Microphone {
                id: row.get(0)?,
                name: row.get(1)?,
                brand: row.get(2)?,
                model: row.get(3)?,
                mic_type: row.get(4)?,
                polar_pattern: row.get(5)?,
                phantom_power: pp != 0,
                notes: row.get(7)?,
                usage: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn microphones_create(state: State<AppState>, payload: MicrophonePayload) -> Result<Microphone, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let pp = payload.phantom_power.unwrap_or(false) as i64;
    db.execute(
        "INSERT INTO microphones (id, name, brand, model, type, polar_pattern, phantom_power, notes, usage)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, payload.name, payload.brand, payload.model, payload.mic_type,
                payload.polar_pattern, pp, payload.notes, payload.usage],
    )
    .map_err(|e| e.to_string())?;
    Ok(Microphone {
        id,
        name: payload.name,
        brand: payload.brand,
        model: payload.model,
        mic_type: payload.mic_type,
        polar_pattern: payload.polar_pattern,
        phantom_power: pp != 0,
        notes: payload.notes,
        usage: payload.usage,
    })
}

#[tauri::command]
pub fn microphones_update(state: State<AppState>, microphone: Microphone) -> Result<Microphone, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let pp = microphone.phantom_power as i64;
    db.execute(
        "UPDATE microphones SET name=?2, brand=?3, model=?4, type=?5,
         polar_pattern=?6, phantom_power=?7, notes=?8, usage=?9 WHERE id=?1",
        params![microphone.id, microphone.name, microphone.brand, microphone.model,
                microphone.mic_type, microphone.polar_pattern, pp, microphone.notes,
                microphone.usage],
    )
    .map_err(|e| e.to_string())?;
    Ok(microphone)
}

#[tauri::command]
pub fn microphones_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM microphones WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Instruments ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn instruments_get_all(state: State<AppState>) -> Result<Vec<Instrument>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, member_id, name, type, brand, model, mic_id, uses_di, channel_order, notes
             FROM instruments ORDER BY channel_order ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let uses_di: i64 = row.get(7)?;
            Ok(Instrument {
                id: row.get(0)?,
                member_id: row.get(1)?,
                name: row.get(2)?,
                instrument_type: row.get(3)?,
                brand: row.get(4)?,
                model: row.get(5)?,
                mic_id: row.get(6)?,
                uses_di: uses_di != 0,
                channel_order: row.get(8)?,
                notes: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn instruments_create(state: State<AppState>, payload: InstrumentPayload) -> Result<Instrument, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let uses_di = payload.uses_di.unwrap_or(false) as i64;
    let channel_order = payload.channel_order.unwrap_or(0);
    db.execute(
        "INSERT INTO instruments (id, member_id, name, type, brand, model, mic_id, uses_di, channel_order, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![id, payload.member_id, payload.name, payload.instrument_type,
                payload.brand, payload.model, payload.mic_id, uses_di, channel_order, payload.notes],
    )
    .map_err(|e| e.to_string())?;
    Ok(Instrument {
        id,
        member_id: payload.member_id,
        name: payload.name,
        instrument_type: payload.instrument_type,
        brand: payload.brand,
        model: payload.model,
        mic_id: payload.mic_id,
        uses_di: uses_di != 0,
        channel_order,
        notes: payload.notes,
    })
}

#[tauri::command]
pub fn instruments_update(state: State<AppState>, instrument: Instrument) -> Result<Instrument, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let uses_di = instrument.uses_di as i64;
    db.execute(
        "UPDATE instruments SET member_id=?2, name=?3, type=?4, brand=?5, model=?6,
         mic_id=?7, uses_di=?8, channel_order=?9, notes=?10 WHERE id=?1",
        params![instrument.id, instrument.member_id, instrument.name, instrument.instrument_type,
                instrument.brand, instrument.model, instrument.mic_id, uses_di,
                instrument.channel_order, instrument.notes],
    )
    .map_err(|e| e.to_string())?;
    Ok(instrument)
}

#[tauri::command]
pub fn instruments_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM instruments WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Amplifiers ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn amplifiers_get_all(state: State<AppState>) -> Result<Vec<Amplifier>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, member_id, name, type, brand, model, wattage, mic_id, stage_position, notes,
                    cabinet_brand, speaker_brand, speaker_model, speaker_config
             FROM amplifiers ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Amplifier {
                id: row.get(0)?,
                member_id: row.get(1)?,
                name: row.get(2)?,
                amp_type: row.get(3)?,
                brand: row.get(4)?,
                model: row.get(5)?,
                wattage: row.get(6)?,
                mic_id: row.get(7)?,
                stage_position: row.get(8)?,
                notes: row.get(9)?,
                cabinet_brand: row.get(10)?,
                speaker_brand: row.get(11)?,
                speaker_model: row.get(12)?,
                speaker_config: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn amplifiers_create(state: State<AppState>, payload: AmplifierPayload) -> Result<Amplifier, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO amplifiers (id, member_id, name, type, brand, model, wattage, mic_id,
                                 stage_position, notes, cabinet_brand, speaker_brand,
                                 speaker_model, speaker_config)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![id, payload.member_id, payload.name, payload.amp_type,
                payload.brand, payload.model, payload.wattage,
                payload.mic_id, payload.stage_position, payload.notes,
                payload.cabinet_brand, payload.speaker_brand,
                payload.speaker_model, payload.speaker_config],
    )
    .map_err(|e| e.to_string())?;
    Ok(Amplifier {
        id,
        member_id: payload.member_id,
        name: payload.name,
        amp_type: payload.amp_type,
        brand: payload.brand,
        model: payload.model,
        wattage: payload.wattage,
        mic_id: payload.mic_id,
        stage_position: payload.stage_position,
        notes: payload.notes,
        cabinet_brand: payload.cabinet_brand,
        speaker_brand: payload.speaker_brand,
        speaker_model: payload.speaker_model,
        speaker_config: payload.speaker_config,
    })
}

#[tauri::command]
pub fn amplifiers_update(state: State<AppState>, amplifier: Amplifier) -> Result<Amplifier, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE amplifiers SET member_id=?2, name=?3, type=?4, brand=?5, model=?6,
         wattage=?7, mic_id=?8, stage_position=?9, notes=?10,
         cabinet_brand=?11, speaker_brand=?12, speaker_model=?13, speaker_config=?14
         WHERE id=?1",
        params![amplifier.id, amplifier.member_id, amplifier.name, amplifier.amp_type,
                amplifier.brand, amplifier.model, amplifier.wattage,
                amplifier.mic_id, amplifier.stage_position, amplifier.notes,
                amplifier.cabinet_brand, amplifier.speaker_brand,
                amplifier.speaker_model, amplifier.speaker_config],
    )
    .map_err(|e| e.to_string())?;
    Ok(amplifier)
}

#[tauri::command]
pub fn amplifiers_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM amplifiers WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── PA Equipment ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn pa_get_all(state: State<AppState>) -> Result<Vec<PaEquipment>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, category, name, brand, model, quantity, channels, aux_sends, wattage, notes,
                    monitor_type, iem_wireless
             FROM pa_equipment ORDER BY category ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let iem_w: i64 = row.get::<_, i64>(11).unwrap_or(0);
            Ok(PaEquipment {
                id: row.get(0)?,
                category: row.get(1)?,
                name: row.get(2)?,
                brand: row.get(3)?,
                model: row.get(4)?,
                quantity: row.get(5)?,
                channels: row.get(6)?,
                aux_sends: row.get(7)?,
                wattage: row.get(8)?,
                notes: row.get(9)?,
                monitor_type: row.get(10)?,
                iem_wireless: iem_w != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pa_create(state: State<AppState>, payload: PaPayload) -> Result<PaEquipment, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let quantity = payload.quantity.unwrap_or(1);
    let iem_wireless = payload.iem_wireless.unwrap_or(false) as i64;
    db.execute(
        "INSERT INTO pa_equipment (id, category, name, brand, model, quantity, channels,
                                   aux_sends, wattage, notes, monitor_type, iem_wireless)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![id, payload.category, payload.name, payload.brand, payload.model,
                quantity, payload.channels, payload.aux_sends, payload.wattage, payload.notes,
                payload.monitor_type, iem_wireless],
    )
    .map_err(|e| e.to_string())?;
    Ok(PaEquipment {
        id,
        category: payload.category,
        name: payload.name,
        brand: payload.brand,
        model: payload.model,
        quantity,
        channels: payload.channels,
        aux_sends: payload.aux_sends,
        wattage: payload.wattage,
        notes: payload.notes,
        monitor_type: payload.monitor_type,
        iem_wireless: iem_wireless != 0,
    })
}

#[tauri::command]
pub fn pa_update(state: State<AppState>, item: PaEquipment) -> Result<PaEquipment, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let iem_w = item.iem_wireless as i64;
    db.execute(
        "UPDATE pa_equipment SET category=?2, name=?3, brand=?4, model=?5, quantity=?6,
         channels=?7, aux_sends=?8, wattage=?9, notes=?10,
         monitor_type=?11, iem_wireless=?12 WHERE id=?1",
        params![item.id, item.category, item.name, item.brand, item.model,
                item.quantity, item.channels, item.aux_sends, item.wattage, item.notes,
                item.monitor_type, iem_w],
    )
    .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub fn pa_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM pa_equipment WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Channel List (derived) ────────────────────────────────────────────────────

#[tauri::command]
pub fn channel_list_generate(state: State<AppState>) -> Result<Vec<ChannelEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut channels: Vec<ChannelEntry> = Vec::new();

    // 1. Drums first, ordered by channel_order
    let mut stmt = db.prepare(
        "SELECT i.name, i.uses_di, i.type, m.model, m.type, m.polar_pattern, m.phantom_power
         FROM instruments i
         LEFT JOIN microphones m ON i.mic_id = m.id
         WHERE i.type = 'drums'
         ORDER BY i.channel_order ASC, i.name ASC"
    ).map_err(|e| e.to_string())?;
    let drum_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,   // name
            row.get::<_, i64>(1)?,      // uses_di
            row.get::<_, String>(2)?,   // type
            row.get::<_, Option<String>>(3)?, // mic model
            row.get::<_, Option<String>>(4)?, // mic type
            row.get::<_, Option<String>>(5)?, // polar pattern
            row.get::<_, Option<i64>>(6)?,    // phantom power
        ))
    }).map_err(|e| e.to_string())?;

    for row in drum_rows {
        let (name, uses_di, _itype, mic_model, mic_type, polar, pp) = row.map_err(|e| e.to_string())?;
        channels.push(ChannelEntry {
            channel_number: 0,
            name,
            mono_stereo: "mono".to_string(),
            phantom_power: pp.unwrap_or(0) != 0,
            mic_model,
            mic_type,
            polar_pattern: polar,
            notes: if uses_di != 0 { Some("DI".to_string()) } else { None },
        });
    }

    // 2. Other instruments ordered by type priority then channel_order
    let mut stmt = db.prepare(
        "SELECT i.name, i.uses_di, i.type, m.model, m.type, m.polar_pattern, m.phantom_power
         FROM instruments i
         LEFT JOIN microphones m ON i.mic_id = m.id
         WHERE i.type != 'drums'
         ORDER BY
           CASE i.type
             WHEN 'bass'     THEN 1
             WHEN 'guitar'   THEN 2
             WHEN 'keyboard' THEN 3
             ELSE 4
           END,
           i.channel_order ASC, i.name ASC"
    ).map_err(|e| e.to_string())?;
    let other_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<i64>>(6)?,
        ))
    }).map_err(|e| e.to_string())?;

    for row in other_rows {
        let (name, uses_di, itype, mic_model, mic_type, polar, pp) = row.map_err(|e| e.to_string())?;
        let mono_stereo = if uses_di != 0 && (itype == "keyboard" || itype == "other") {
            "stereo"
        } else {
            "mono"
        };
        channels.push(ChannelEntry {
            channel_number: 0,
            name,
            mono_stereo: mono_stereo.to_string(),
            phantom_power: pp.unwrap_or(0) != 0,
            mic_model,
            mic_type,
            polar_pattern: polar,
            notes: if uses_di != 0 { Some("DI".to_string()) } else { None },
        });
    }

    // 3. Vocals: vocalists first, then rest, via band_members.vocal_mic_id
    let mut stmt = db.prepare(
        "SELECT bm.name, m.model, m.type, m.polar_pattern, m.phantom_power
         FROM band_members bm
         LEFT JOIN microphones m ON bm.vocal_mic_id = m.id
         WHERE bm.vocal_mic_id IS NOT NULL
         ORDER BY
           CASE bm.role WHEN 'vocalist' THEN 0 ELSE 1 END,
           bm.sort_order ASC, bm.name ASC"
    ).map_err(|e| e.to_string())?;
    let vocal_rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<i64>>(4)?,
        ))
    }).map_err(|e| e.to_string())?;

    for row in vocal_rows {
        let (name, mic_model, mic_type, polar, pp) = row.map_err(|e| e.to_string())?;
        channels.push(ChannelEntry {
            channel_number: 0,
            name: format!("Voz - {}", name),
            mono_stereo: "mono".to_string(),
            phantom_power: pp.unwrap_or(0) != 0,
            mic_model,
            mic_type,
            polar_pattern: polar,
            notes: None,
        });
    }

    // Assign sequential channel numbers
    for (i, ch) in channels.iter_mut().enumerate() {
        ch.channel_number = (i + 1) as i64;
    }

    Ok(channels)
}

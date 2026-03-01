use crate::database::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ── Venue ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Venue {
    pub id: String,
    pub name: String,
    pub city: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub capacity: Option<i64>,
    pub booking_name: Option<String>,
    pub booking_email: Option<String>,
    pub booking_phone: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VenuePayload {
    pub name: String,
    pub city: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub capacity: Option<i64>,
    pub booking_name: Option<String>,
    pub booking_email: Option<String>,
    pub booking_phone: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn venues_get_all(state: State<AppState>) -> Result<Vec<Venue>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, name, city, address, website, capacity,
                    booking_name, booking_email, booking_phone, notes, created_at
             FROM venues ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Venue {
                id: row.get(0)?,
                name: row.get(1)?,
                city: row.get(2)?,
                address: row.get(3)?,
                website: row.get(4)?,
                capacity: row.get(5)?,
                booking_name: row.get(6)?,
                booking_email: row.get(7)?,
                booking_phone: row.get(8)?,
                notes: row.get(9)?,
                created_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn venues_create(state: State<AppState>, payload: VenuePayload) -> Result<Venue, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO venues (id, name, city, address, website, capacity,
                              booking_name, booking_email, booking_phone, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id, payload.name, payload.city, payload.address, payload.website, payload.capacity,
            payload.booking_name, payload.booking_email, payload.booking_phone, payload.notes,
            created_at
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(Venue { id, name: payload.name, city: payload.city, address: payload.address,
        website: payload.website, capacity: payload.capacity, booking_name: payload.booking_name,
        booking_email: payload.booking_email, booking_phone: payload.booking_phone,
        notes: payload.notes, created_at })
}

#[tauri::command]
pub fn venues_update(state: State<AppState>, venue: Venue) -> Result<Venue, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE venues SET name=?1, city=?2, address=?3, website=?4, capacity=?5,
                           booking_name=?6, booking_email=?7, booking_phone=?8, notes=?9
         WHERE id=?10",
        params![
            venue.name, venue.city, venue.address, venue.website, venue.capacity,
            venue.booking_name, venue.booking_email, venue.booking_phone, venue.notes, venue.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(venue)
}

#[tauri::command]
pub fn venues_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM venues WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Gig ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Gig {
    pub id: String,
    pub venue_id: Option<String>,
    pub venue_name: Option<String>,
    pub title: String,
    pub date: Option<String>,
    pub time: Option<String>,
    pub status: String,
    pub pay: Option<String>,
    pub load_in_time: Option<String>,
    pub soundcheck_time: Option<String>,
    pub set_time: Option<String>,
    pub setlist_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub follow_up_date: Option<String>,
    pub follow_up_note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GigPayload {
    pub venue_id: Option<String>,
    pub title: String,
    pub date: Option<String>,
    pub time: Option<String>,
    pub status: String,
    pub pay: Option<String>,
    pub load_in_time: Option<String>,
    pub soundcheck_time: Option<String>,
    pub set_time: Option<String>,
    pub setlist_id: Option<String>,
    pub notes: Option<String>,
    pub follow_up_date: Option<String>,
    pub follow_up_note: Option<String>,
}

fn gig_from_row(row: &rusqlite::Row) -> rusqlite::Result<Gig> {
    Ok(Gig {
        id: row.get(0)?,
        venue_id: row.get(1)?,
        venue_name: row.get(2)?,
        title: row.get(3)?,
        date: row.get(4)?,
        time: row.get(5)?,
        status: row.get(6)?,
        pay: row.get(7)?,
        load_in_time: row.get(8)?,
        soundcheck_time: row.get(9)?,
        set_time: row.get(10)?,
        setlist_id: row.get(11)?,
        notes: row.get(12)?,
        created_at: row.get(13)?,
        follow_up_date: row.get(14)?,
        follow_up_note: row.get(15)?,
    })
}

#[tauri::command]
pub fn gigs_get_all(state: State<AppState>) -> Result<Vec<Gig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT g.id, g.venue_id, v.name AS venue_name, g.title, g.date, g.time,
                    g.status, g.pay, g.load_in_time, g.soundcheck_time, g.set_time,
                    g.setlist_id, g.notes, g.created_at, g.follow_up_date, g.follow_up_note
             FROM gigs g
             LEFT JOIN venues v ON v.id = g.venue_id
             ORDER BY g.date DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], gig_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gigs_create(state: State<AppState>, payload: GigPayload) -> Result<Gig, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO gigs (id, venue_id, title, date, time, status, pay,
                           load_in_time, soundcheck_time, set_time, setlist_id, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id, payload.venue_id, payload.title, payload.date, payload.time,
            payload.status, payload.pay, payload.load_in_time, payload.soundcheck_time,
            payload.set_time, payload.setlist_id, payload.notes, created_at
        ],
    )
    .map_err(|e| e.to_string())?;
    // Re-query to get venue_name via JOIN
    let mut stmt = db
        .prepare(
            "SELECT g.id, g.venue_id, v.name, g.title, g.date, g.time,
                    g.status, g.pay, g.load_in_time, g.soundcheck_time, g.set_time,
                    g.setlist_id, g.notes, g.created_at, g.follow_up_date, g.follow_up_note
             FROM gigs g LEFT JOIN venues v ON v.id = g.venue_id WHERE g.id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![id], gig_from_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gigs_update(state: State<AppState>, gig: Gig) -> Result<Gig, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE gigs SET venue_id=?1, title=?2, date=?3, time=?4, status=?5, pay=?6,
                         load_in_time=?7, soundcheck_time=?8, set_time=?9,
                         setlist_id=?10, notes=?11,
                         follow_up_date=?12, follow_up_note=?13
         WHERE id=?14",
        params![
            gig.venue_id, gig.title, gig.date, gig.time, gig.status, gig.pay,
            gig.load_in_time, gig.soundcheck_time, gig.set_time,
            gig.setlist_id, gig.notes, gig.follow_up_date, gig.follow_up_note, gig.id
        ],
    )
    .map_err(|e| e.to_string())?;
    // Re-query to refresh venue_name (same lock)
    let mut stmt = db
        .prepare(
            "SELECT g.id, g.venue_id, v.name, g.title, g.date, g.time,
                    g.status, g.pay, g.load_in_time, g.soundcheck_time, g.set_time,
                    g.setlist_id, g.notes, g.created_at, g.follow_up_date, g.follow_up_note
             FROM gigs g LEFT JOIN venues v ON v.id = g.venue_id WHERE g.id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![gig.id], gig_from_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gigs_update_status(
    state: State<AppState>,
    id: String,
    status: String,
) -> Result<Gig, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE gigs SET status=?1 WHERE id=?2", params![status, id])
        .map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT g.id, g.venue_id, v.name, g.title, g.date, g.time,
                    g.status, g.pay, g.load_in_time, g.soundcheck_time, g.set_time,
                    g.setlist_id, g.notes, g.created_at, g.follow_up_date, g.follow_up_note
             FROM gigs g LEFT JOIN venues v ON v.id = g.venue_id WHERE g.id=?1",
        )
        .map_err(|e| e.to_string())?;
    stmt.query_row(params![id], gig_from_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gigs_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM gigs WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── CalendarEvent ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub date: String,
    pub end_date: Option<String>,
    pub member_id: Option<String>,
    pub member_name: Option<String>,
    pub all_day: bool,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEventPayload {
    #[serde(rename = "type")]
    pub event_type: String,
    pub title: String,
    pub date: String,
    pub end_date: Option<String>,
    pub member_id: Option<String>,
    pub all_day: bool,
    pub notes: Option<String>,
}

fn cal_event_from_row(row: &rusqlite::Row) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        event_type: row.get(1)?,
        title: row.get(2)?,
        date: row.get(3)?,
        end_date: row.get(4)?,
        member_id: row.get(5)?,
        member_name: row.get(6)?,
        all_day: row.get::<_, i64>(7)? != 0,
        notes: row.get(8)?,
        created_at: row.get(9)?,
    })
}

const CAL_SELECT: &str =
    "SELECT e.id, e.type, e.title, e.date, e.end_date, e.member_id,
            m.name AS member_name, e.all_day, e.notes, e.created_at
     FROM calendar_events e
     LEFT JOIN band_members m ON m.id = e.member_id";

#[tauri::command]
pub fn calendar_events_get_all(state: State<AppState>) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = format!("{} ORDER BY e.date ASC", CAL_SELECT);
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], cal_event_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn calendar_events_get_by_month(
    state: State<AppState>,
    year: i32,
    month: i32,
) -> Result<Vec<CalendarEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let prefix = format!("{:04}-{:02}", year, month);
    let sql = format!("{} WHERE e.date LIKE ?1 OR e.end_date LIKE ?1 ORDER BY e.date ASC", CAL_SELECT);
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let pattern = format!("{}%", prefix);
    let rows = stmt
        .query_map(params![pattern], cal_event_from_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn calendar_events_create(
    state: State<AppState>,
    payload: CalendarEventPayload,
) -> Result<CalendarEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let all_day_int: i64 = if payload.all_day { 1 } else { 0 };
    db.execute(
        "INSERT INTO calendar_events (id, type, title, date, end_date, member_id, all_day, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id, payload.event_type, payload.title, payload.date, payload.end_date,
            payload.member_id, all_day_int, payload.notes, created_at
        ],
    )
    .map_err(|e| e.to_string())?;
    let sql = format!("{} WHERE e.id=?1", CAL_SELECT);
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    stmt.query_row(params![id], cal_event_from_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn calendar_events_update(
    state: State<AppState>,
    event: CalendarEvent,
) -> Result<CalendarEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let all_day_int: i64 = if event.all_day { 1 } else { 0 };
    db.execute(
        "UPDATE calendar_events SET type=?1, title=?2, date=?3, end_date=?4,
                                    member_id=?5, all_day=?6, notes=?7
         WHERE id=?8",
        params![
            event.event_type, event.title, event.date, event.end_date,
            event.member_id, all_day_int, event.notes, event.id
        ],
    )
    .map_err(|e| e.to_string())?;
    let sql = format!("{} WHERE e.id=?1", CAL_SELECT);
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    stmt.query_row(params![event.id], cal_event_from_row)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn calendar_events_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM calendar_events WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── GigChecklist ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GigChecklist {
    pub id: String,
    pub gig_id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GigChecklistPayload {
    pub gig_id: String,
    pub name: String,
}

#[tauri::command]
pub fn gig_checklists_get_by_gig(
    state: State<AppState>,
    gig_id: String,
) -> Result<Vec<GigChecklist>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, gig_id, name, created_at FROM gig_checklists WHERE gig_id=?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![gig_id], |row| {
            Ok(GigChecklist { id: row.get(0)?, gig_id: row.get(1)?, name: row.get(2)?, created_at: row.get(3)? })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gig_checklists_create(
    state: State<AppState>,
    payload: GigChecklistPayload,
) -> Result<GigChecklist, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO gig_checklists (id, gig_id, name, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, payload.gig_id, payload.name, created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(GigChecklist { id, gig_id: payload.gig_id, name: payload.name, created_at })
}

#[tauri::command]
pub fn gig_checklists_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM gig_checklists WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── ChecklistItem ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub id: String,
    pub checklist_id: String,
    pub category: String,
    pub text: String,
    pub done: bool,
    pub sort_order: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItemPayload {
    pub checklist_id: String,
    pub category: String,
    pub text: String,
    pub sort_order: i64,
}

#[tauri::command]
pub fn checklist_get_by_list(
    state: State<AppState>,
    checklist_id: String,
) -> Result<Vec<ChecklistItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, checklist_id, category, text, done, sort_order FROM checklist_items WHERE checklist_id=?1 ORDER BY sort_order ASC, category ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![checklist_id], |row| {
            Ok(ChecklistItem {
                id: row.get(0)?,
                checklist_id: row.get(1)?,
                category: row.get(2)?,
                text: row.get(3)?,
                done: row.get::<_, i64>(4)? != 0,
                sort_order: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn checklist_create(
    state: State<AppState>,
    payload: ChecklistItemPayload,
) -> Result<ChecklistItem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO checklist_items (id, checklist_id, category, text, done, sort_order) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![id, payload.checklist_id, payload.category, payload.text, payload.sort_order],
    )
    .map_err(|e| e.to_string())?;
    Ok(ChecklistItem {
        id,
        checklist_id: payload.checklist_id,
        category: payload.category,
        text: payload.text,
        done: false,
        sort_order: payload.sort_order,
    })
}

#[tauri::command]
pub fn checklist_update(
    state: State<AppState>,
    item: ChecklistItem,
) -> Result<ChecklistItem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let done_int: i64 = if item.done { 1 } else { 0 };
    db.execute(
        "UPDATE checklist_items SET category=?1, text=?2, done=?3, sort_order=?4 WHERE id=?5",
        params![item.category, item.text, done_int, item.sort_order, item.id],
    )
    .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub fn checklist_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM checklist_items WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn checklist_reset_done_by_list(
    state: State<AppState>,
    checklist_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE checklist_items SET done=0 WHERE checklist_id=?1", params![checklist_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── GigContact ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GigContact {
    pub id: String,
    pub gig_id: String,
    pub date: String,
    pub contact_type: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GigContactPayload {
    pub gig_id: String,
    pub date: String,
    pub contact_type: String,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn gig_contacts_get_by_gig(
    state: State<AppState>,
    gig_id: String,
) -> Result<Vec<GigContact>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT id, gig_id, date, contact_type, notes, created_at FROM gig_contacts WHERE gig_id=?1 ORDER BY date DESC, created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![gig_id], |row| {
            Ok(GigContact {
                id: row.get(0)?,
                gig_id: row.get(1)?,
                date: row.get(2)?,
                contact_type: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gig_contacts_create(
    state: State<AppState>,
    payload: GigContactPayload,
) -> Result<GigContact, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO gig_contacts (id, gig_id, date, contact_type, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, payload.gig_id, payload.date, payload.contact_type, payload.notes, created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(GigContact { id, gig_id: payload.gig_id, date: payload.date, contact_type: payload.contact_type, notes: payload.notes, created_at })
}

#[tauri::command]
pub fn gig_contacts_delete(state: State<AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM gig_contacts WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn gigs_update_follow_up(
    state: State<AppState>,
    id: String,
    follow_up_date: Option<String>,
    follow_up_note: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE gigs SET follow_up_date=?1, follow_up_note=?2 WHERE id=?3",
        params![follow_up_date, follow_up_note, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

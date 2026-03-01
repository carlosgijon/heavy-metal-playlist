export type GigStatus =
  | 'lead'
  | 'contacted'
  | 'negotiating'
  | 'hold'
  | 'confirmed'
  | 'played'
  | 'cancelled';

export type CalendarEventType = 'rehearsal' | 'unavailable' | 'other';
export type ChecklistCategory = 'equipo' | 'logistica' | 'documentos' | 'otro';

export const GIG_STATUS_LABELS: Record<GigStatus, string> = {
  lead: 'Interés',
  contacted: 'Contactado',
  negotiating: 'Negociando',
  hold: 'En espera',
  confirmed: 'Confirmado',
  played: 'Tocado',
  cancelled: 'Cancelado',
};

export const GIG_STATUS_BADGE: Record<GigStatus, string> = {
  lead: 'badge-ghost',
  contacted: 'badge-info',
  negotiating: 'badge-warning',
  hold: 'badge-primary',
  confirmed: 'badge-success',
  played: 'badge-neutral',
  cancelled: 'badge-error',
};

/** Next status in the pipeline when clicking the quick-advance button */
export const GIG_STATUS_NEXT: Record<GigStatus, GigStatus> = {
  lead: 'contacted',
  contacted: 'negotiating',
  negotiating: 'hold',
  hold: 'confirmed',
  confirmed: 'played',
  played: 'played',
  cancelled: 'cancelled',
};

export const GIG_STATUSES: GigStatus[] = [
  'lead', 'contacted', 'negotiating', 'hold', 'confirmed', 'played', 'cancelled',
];

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  rehearsal: 'Ensayo',
  unavailable: 'No disponible',
  other: 'Otro',
};

/** Tailwind bg class for calendar dots */
export const EVENT_TYPE_DOT: Record<CalendarEventType, string> = {
  rehearsal: 'bg-info',
  unavailable: 'bg-error',
  other: 'bg-warning',
};

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  equipo: 'Equipo',
  logistica: 'Logística',
  documentos: 'Documentos',
  otro: 'Otro',
};

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  'equipo', 'logistica', 'documentos', 'otro',
];

export type GigContactType = 'call' | 'email' | 'meeting' | 'message' | 'other';

export const GIG_CONTACT_TYPE_LABELS: Record<GigContactType, string> = {
  call: 'Llamada',
  email: 'Email',
  meeting: 'Reunión',
  message: 'Mensaje',
  other: 'Otro',
};

export const GIG_CONTACT_TYPES: GigContactType[] = ['call', 'email', 'meeting', 'message', 'other'];

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  name: string;
  city?: string;
  address?: string;
  website?: string;
  capacity?: number;
  bookingName?: string;
  bookingEmail?: string;
  bookingPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface Gig {
  id: string;
  venueId?: string;
  venueName?: string;
  title: string;
  date?: string;
  time?: string;
  status: GigStatus;
  pay?: string;
  loadInTime?: string;
  soundcheckTime?: string;
  setTime?: string;
  setlistId?: string;
  notes?: string;
  createdAt: string;
  followUpDate?: string;
  followUpNote?: string;
}

export interface GigContact {
  id: string;
  gigId: string;
  date: string;
  contactType: GigContactType;
  notes?: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  endDate?: string;
  memberId?: string;
  memberName?: string;
  allDay: boolean;
  notes?: string;
  createdAt: string;
}

export interface GigChecklist {
  id: string;
  gigId: string;
  name: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  category: ChecklistCategory;
  text: string;
  done: boolean;
  sortOrder: number;
}

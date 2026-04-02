export type PollType   = 'yes_no' | 'approval' | 'proposal';
export type PollStatus = 'draft' | 'open' | 'closed' | 'archived';
export type YesNoValue = 'yes' | 'no' | 'abstain';

export const POLL_TYPE_LABELS: Record<PollType, string> = {
  yes_no:   'Sí / No',
  approval: 'Aprobación',
  proposal: 'Propuesta',
};

export const POLL_TYPE_BADGE: Record<PollType, string> = {
  yes_no:   'badge-info',
  approval: 'badge-warning',
  proposal: 'badge-accent',
};

export const POLL_STATUS_LABELS: Record<PollStatus, string> = {
  draft:    'Borrador',
  open:     'Abierta',
  closed:   'Cerrada',
  archived: 'Archivada',
};

export const POLL_STATUS_BADGE: Record<PollStatus, string> = {
  draft:    'badge-ghost',
  open:     'badge-success',
  closed:   'badge-error',
  archived: 'badge-neutral',
};

export interface PollOption {
  id:         string;
  pollId:     string;
  text:       string;
  proposedBy: string | null;
  createdAt:  string;
  // injected by results endpoint
  voteCount?: number;
}

export interface PollVote {
  id:        string;
  pollId:    string;
  optionId:  string | null;
  voterName: string;
  value:     string;
  comment:   string | null;
  createdAt: string;
}

export interface Poll {
  id:          string;
  bandId:      string;
  title:       string;
  description: string | null;
  type:        PollType;
  status:      PollStatus;
  createdBy:   string;
  deadline:    string | null;   // YYYY-MM-DD
  linkedGigId: string | null;
  linkedGig:   { id: string; title: string } | null;
  createdAt:   string;
  options:     PollOption[];
  votes:       PollVote[];
  voteCount:   number;          // unique voters
}

// Results

export interface YesNoResults {
  type:       'yes_no';
  total:      number;
  yes:        number; yesPct:     number;
  no:         number; noPct:      number;
  abstain:    number; abstainPct: number;
  voters:     { voterName: string; value: YesNoValue; comment: string | null }[];
}

export interface OptionResults {
  type:         'approval' | 'proposal';
  totalVoters:  number;
  options:      (PollOption & { voteCount: number })[];
}

export type PollResults = YesNoResults | OptionResults;

// DTOs

export interface CreatePollDto {
  title:       string;
  description?: string;
  type:        PollType;
  createdBy:   string;
  deadline?:   string;
  linkedGigId?: string;
  options?:    string[];
}

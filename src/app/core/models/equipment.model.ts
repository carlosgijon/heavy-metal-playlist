export type MemberRole = 'vocalist' | 'guitarist' | 'bassist' | 'drummer' | 'keyboardist' | 'other';

export type StagePosition =
  | 'front-left' | 'front-center' | 'front-right'
  | 'mid-left'   | 'mid-center'   | 'mid-right'
  | 'back-left'  | 'back-center'  | 'back-right';

export type MicType = 'dynamic' | 'condenser' | 'ribbon';
export type PolarPattern = 'cardioid' | 'supercardioid' | 'hypercardioid' | 'omnidirectional' | 'figure-8';
export type InstrumentType = 'guitar' | 'bass' | 'drums' | 'keyboard' | 'other';
export type AmpType = 'guitar' | 'bass' | 'keyboard';
export type PaCategory = 'console' | 'main-speaker' | 'subwoofer' | 'monitor' | 'di-box' | 'power-amp' | 'other';
export type MicUsage = 'instrument' | 'vocal' | 'drums-overhead' | 'drums-snare' | 'drums-kick' | 'drums-pack' | 'ambient';
export type SpeakerConfig = '1x12' | '2x12' | '4x12' | '1x15' | '2x15' | '4x10' | '8x10' | '2x10' | 'custom';
export type MonitorType = 'speaker' | 'iem';

export interface BandMember {
  id: string;
  name: string;
  role: MemberRole;
  stagePosition?: StagePosition;
  vocalMicId?: string;
  notes?: string;
  sortOrder: number;
}

export interface Microphone {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  type: MicType;
  polarPattern?: PolarPattern;
  phantomPower: boolean;
  notes?: string;
  usage?: MicUsage;
}

export interface Instrument {
  id: string;
  memberId?: string;
  name: string;
  type: InstrumentType;
  brand?: string;
  model?: string;
  micId?: string;
  usesDi: boolean;
  channelOrder: number;
  notes?: string;
}

export interface Amplifier {
  id: string;
  memberId?: string;
  name: string;
  type: AmpType;
  brand?: string;
  model?: string;
  wattage?: number;
  micId?: string;
  stagePosition?: StagePosition;
  notes?: string;
  cabinetBrand?: string;
  speakerBrand?: string;
  speakerModel?: string;
  speakerConfig?: SpeakerConfig;
}

export interface PaEquipment {
  id: string;
  category: PaCategory;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  channels?: number;
  auxSends?: number;
  wattage?: number;
  notes?: string;
  monitorType?: MonitorType;
  iemWireless: boolean;
}

export interface ChannelEntry {
  channelNumber: number;
  name: string;
  monoStereo: 'mono' | 'stereo';
  phantomPower: boolean;
  micModel?: string;
  micType?: string;
  polarPattern?: string;
  notes?: string;
}

export const STAGE_POSITION_LABELS: Record<StagePosition, string> = {
  'back-left':    'Fondo Izq',
  'back-center':  'Fondo Centro',
  'back-right':   'Fondo Der',
  'mid-left':     'Medio Izq',
  'mid-center':   'Medio Centro',
  'mid-right':    'Medio Der',
  'front-left':   'Frente Izq',
  'front-center': 'Frente Centro',
  'front-right':  'Frente Der',
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  vocalist:     'Vocalista',
  guitarist:    'Guitarrista',
  bassist:      'Bajista',
  drummer:      'Batería',
  keyboardist:  'Teclista',
  other:        'Otro',
};

export const ROLE_EMOJI: Record<MemberRole, string> = {
  vocalist:    '🎤',
  guitarist:   '🎸',
  bassist:     '🎸',
  drummer:     '🥁',
  keyboardist: '🎹',
  other:       '🎵',
};

export const MIC_TYPE_LABELS: Record<MicType, string> = {
  dynamic:   'Dinámico',
  condenser: 'Condensador',
  ribbon:    'Cinta',
};

export const POLAR_LABELS: Record<PolarPattern, string> = {
  cardioid:       'Cardioide',
  supercardioid:  'Supercardioide',
  hypercardioid:  'Hipercardioide',
  omnidirectional:'Omnidireccional',
  'figure-8':     'Figura 8',
};

export const PA_CATEGORY_LABELS: Record<PaCategory, string> = {
  'console':      'Mesa de mezclas',
  'main-speaker': 'Altavoz principal',
  'subwoofer':    'Subwoofer',
  'monitor':      'Monitor/Cuña',
  'di-box':       'Caja DI',
  'power-amp':    'Amplificador de potencia',
  'other':        'Otro',
};

export const MIC_USAGE_LABELS: Record<MicUsage, string> = {
  'instrument':     'Para ampli / instrumento',
  'vocal':          'Para voces',
  'drums-overhead': 'Para batería — Aéreos (Overhead)',
  'drums-snare':    'Para batería — Caja (Snare)',
  'drums-kick':     'Para batería — Bombo (Kick)',
  'drums-pack':     'Pack completo batería',
  'ambient':        'Para ambiente / público',
};

export const SPEAKER_CONFIG_LABELS: Record<SpeakerConfig, string> = {
  '1x12': '1×12"', '2x12': '2×12"', '4x12': '4×12"',
  '1x15': '1×15"', '2x15': '2×15"',
  '4x10': '4×10"', '8x10': '8×10"', '2x10': '2×10"',
  'custom': 'Personalizado',
};

export const MONITOR_TYPE_LABELS: Record<MonitorType, string> = {
  'speaker': 'Altavoz de escenario',
  'iem':     'In-Ear Monitor (IEM)',
};

export interface NavTheme {
  id: string;
  name: string;
  preview: { bg: string; accent: string };
  vars: Partial<Record<NavVar, string>>;
}

type NavVar =
  | '--nav-bg'
  | '--nav-border'
  | '--nav-text'
  | '--nav-item-text'
  | '--nav-hover'
  | '--nav-active'
  | '--nav-active-text';

const ALL_NAV_VARS: NavVar[] = [
  '--nav-bg', '--nav-border', '--nav-text',
  '--nav-item-text', '--nav-hover', '--nav-active', '--nav-active-text',
];

export const NAV_THEMES: NavTheme[] = [
  {
    id: 'default',
    name: 'Sin contraste',
    preview: { bg: 'transparent', accent: 'transparent' },
    vars: {},
  },
  {
    id: 'metal',
    name: 'Metal',
    preview: { bg: '#0a0a0a', accent: '#ef4444' },
    vars: {
      '--nav-bg':          '#0a0a0a',
      '--nav-border':      '#1c1c1c',
      '--nav-text':        'rgba(255,255,255,0.92)',
      '--nav-item-text':   'rgba(255,255,255,0.55)',
      '--nav-hover':       '#1c1c1c',
      '--nav-active':      'rgba(239,68,68,0.15)',
      '--nav-active-text': '#ef4444',
    },
  },
  {
    id: 'studio',
    name: 'Estudio',
    preview: { bg: '#0f172a', accent: '#818cf8' },
    vars: {
      '--nav-bg':          '#0f172a',
      '--nav-border':      '#1e293b',
      '--nav-text':        'rgba(226,232,240,0.95)',
      '--nav-item-text':   'rgba(148,163,184,0.75)',
      '--nav-hover':       '#1e293b',
      '--nav-active':      'rgba(129,140,248,0.15)',
      '--nav-active-text': '#818cf8',
    },
  },
  {
    id: 'bosque',
    name: 'Bosque',
    preview: { bg: '#0f1f14', accent: '#4ade80' },
    vars: {
      '--nav-bg':          '#0f1f14',
      '--nav-border':      '#1a3320',
      '--nav-text':        'rgba(220,252,231,0.92)',
      '--nav-item-text':   'rgba(134,239,172,0.65)',
      '--nav-hover':       '#1a3320',
      '--nav-active':      'rgba(74,222,128,0.15)',
      '--nav-active-text': '#4ade80',
    },
  },
  {
    id: 'oceano',
    name: 'Océano',
    preview: { bg: '#0a1628', accent: '#38bdf8' },
    vars: {
      '--nav-bg':          '#0a1628',
      '--nav-border':      '#0f2040',
      '--nav-text':        'rgba(224,242,254,0.92)',
      '--nav-item-text':   'rgba(125,211,252,0.65)',
      '--nav-hover':       '#0f2040',
      '--nav-active':      'rgba(56,189,248,0.15)',
      '--nav-active-text': '#38bdf8',
    },
  },
  {
    id: 'noche',
    name: 'Noche',
    preview: { bg: '#111111', accent: '#c084fc' },
    vars: {
      '--nav-bg':          '#111111',
      '--nav-border':      '#222222',
      '--nav-text':        'rgba(228,228,231,0.92)',
      '--nav-item-text':   'rgba(161,161,170,0.7)',
      '--nav-hover':       '#1e1e1e',
      '--nav-active':      'rgba(192,132,252,0.15)',
      '--nav-active-text': '#c084fc',
    },
  },
  {
    id: 'blanco',
    name: 'Blanco',
    preview: { bg: '#ffffff', accent: '#2563eb' },
    vars: {
      '--nav-bg':          '#ffffff',
      '--nav-border':      '#e5e7eb',
      '--nav-text':        'rgba(31,41,55,0.95)',
      '--nav-item-text':   'rgba(55,65,81,0.65)',
      '--nav-hover':       '#f3f4f6',
      '--nav-active':      'rgba(37,99,235,0.1)',
      '--nav-active-text': '#2563eb',
    },
  },
  {
    id: 'cobre',
    name: 'Cobre',
    preview: { bg: '#1c1208', accent: '#f59e0b' },
    vars: {
      '--nav-bg':          '#1c1208',
      '--nav-border':      '#2e1f0e',
      '--nav-text':        'rgba(254,243,199,0.92)',
      '--nav-item-text':   'rgba(212,167,101,0.65)',
      '--nav-hover':       '#2e1f0e',
      '--nav-active':      'rgba(245,158,11,0.15)',
      '--nav-active-text': '#f59e0b',
    },
  },
];

export function applyNavTheme(id: string): void {
  const theme = NAV_THEMES.find(t => t.id === id) ?? NAV_THEMES[0];
  const root = document.documentElement;

  // Clear all nav vars first
  ALL_NAV_VARS.forEach(v => root.style.removeProperty(v));

  // Apply vars for selected theme (default has empty vars = no-op = DaisyUI takes over)
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

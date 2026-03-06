/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: { extend: {} },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'light',
      'dark',
      'cupcake',
      'bumblebee',
      'emerald',
      'corporate',
      'synthwave',
      'retro',
      'cyberpunk',
      'valentine',
      'halloween',
      'garden',
      'forest',
      'aqua',
      'lofi',
      'pastel',
      'fantasy',
      'wireframe',
      'black',
      'luxury',
      'dracula',
      'cmyk',
      'autumn',
      'business',
      'acid',
      'lemonade',
      'night',
      'coffee',
      'winter',
      'dim',
      'nord',
      'sunset',
      'caramellatte',
      'abyss',
      'silk',
      // ── Slack-inspired custom themes ───────────────────────────────
      {
        'slack-aubergine': {
          // Primary: Slack's iconic aubergine/plum purple
          'primary':          '#4a154b',
          'primary-content':  '#ffffff',
          // Secondary: Slack's teal accent
          'secondary':        '#1d9bd1',
          'secondary-content':'#ffffff',
          // Accent: Slack green (active status)
          'accent':           '#2bac76',
          'accent-content':   '#ffffff',
          // Neutral
          'neutral':          '#3d2b3e',
          'neutral-content':  '#f8f0f8',
          // Base: dark purple background like Slack sidebar
          'base-100':         '#1a1a2e',
          'base-200':         '#16213e',
          'base-300':         '#0f3460',
          'base-content':     '#e8e0e8',
          // State colors
          'info':             '#1d9bd1',
          'info-content':     '#ffffff',
          'success':          '#2bac76',
          'success-content':  '#ffffff',
          'warning':          '#ecb22e',
          'warning-content':  '#1a1a1a',
          'error':            '#e01e5a',
          'error-content':    '#ffffff',
        },
      },
      {
        'slack-light': {
          // Primary: Slack purple
          'primary':          '#611f69',
          'primary-content':  '#ffffff',
          // Secondary: Slack teal
          'secondary':        '#1d9bd1',
          'secondary-content':'#ffffff',
          // Accent: Slack green
          'accent':           '#2bac76',
          'accent-content':   '#ffffff',
          // Neutral
          'neutral':          '#4a154b',
          'neutral-content':  '#f8f0f8',
          // Base: clean white like Slack main content area
          'base-100':         '#ffffff',
          'base-200':         '#f8f0f8',
          'base-300':         '#ede2ee',
          'base-content':     '#1d1c1d',
          // State colors
          'info':             '#1d9bd1',
          'info-content':     '#ffffff',
          'success':          '#2bac76',
          'success-content':  '#ffffff',
          'warning':          '#ecb22e',
          'warning-content':  '#1a1a1a',
          'error':            '#e01e5a',
          'error-content':    '#ffffff',
        },
      },
      {
        'slack-dark': {
          // Primary: brighter purple for dark bg
          'primary':          '#7c3085',
          'primary-content':  '#ffffff',
          // Secondary: Slack teal
          'secondary':        '#1d9bd1',
          'secondary-content':'#ffffff',
          // Accent: Slack green
          'accent':           '#2bac76',
          'accent-content':   '#ffffff',
          // Neutral
          'neutral':          '#2c2c2c',
          'neutral-content':  '#e0e0e0',
          // Base: dark grey like Slack dark mode
          'base-100':         '#1a1d21',
          'base-200':         '#222529',
          'base-300':         '#2d3136',
          'base-content':     '#d1d2d3',
          // State colors
          'info':             '#1d9bd1',
          'info-content':     '#ffffff',
          'success':          '#2bac76',
          'success-content':  '#ffffff',
          'warning':          '#ecb22e',
          'warning-content':  '#1a1a1a',
          'error':            '#e01e5a',
          'error-content':    '#ffffff',
        },
      },
    ],
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};

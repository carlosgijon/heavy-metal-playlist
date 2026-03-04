import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blackout.orm',
  appName: 'Blackout ORM',
  webDir: 'dist/blackout-orm/browser',
  server: {
    androidScheme: 'http',
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sbit06.studyplanner',
  appName: 'Study Planner',
  webDir: 'dist',
  backgroundColor: '#050708',
  android: {
    allowMixedContent: false
  }
};

export default config;

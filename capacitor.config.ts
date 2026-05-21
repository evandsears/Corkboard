import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corkboard.app',
  appName: 'Corkboard',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_corkboard',
    },
    AdMob: {
      appId: 'ca-app-pub-5109081999190590~3206185208', // Live Google AdMob App ID
    },
  },
};

export default config;

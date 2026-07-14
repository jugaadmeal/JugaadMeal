import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jugaadmeal.app',
  appName: 'JugaadMeal',
  webDir: 'out',
  server: {
    url: 'https://jugaadmeal.vercel.app/',
    cleartext: true
  }
};

export default config;

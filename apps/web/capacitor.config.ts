import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadoesperto.app',
  appName: 'Mercado Esperto',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f6f8f7',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  // Signing configuration for Google Play Store
  // In CI/CD, use environment variables:
  // - ANDROID_SIGNING_KEY (base64 encoded keystore)
  // - ANDROID_KEYSTORE_PASSWORD
  // - ANDROID_KEYSTORE_ALIAS
  android: {
    signingKey: {
      storeFile: process.env.ANDROID_SIGNING_KEY_FILE || 'android/keystore/mercado-esperto-release.p12',
      storePassword: process.env.ANDROID_KEYSTORE_PASSWORD || '',
      keyAlias: process.env.ANDROID_KEYSTORE_ALIAS || 'mercado-esperto',
      keyPassword: process.env.ANDROID_KEYSTORE_PASSWORD || '',
    },
  },
};

export default config;

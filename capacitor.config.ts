import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.vagou',
  appName: 'VAGOU',
  webDir: 'dist',
  server: {
    // Aponta para a URL de produção - atualizações refletem automaticamente
    url: 'https://c4946289-db05-4d03-84be-c6148e50ffc0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1d4ed8",
      showSpinner: false,
    },
  },
};

export default config;

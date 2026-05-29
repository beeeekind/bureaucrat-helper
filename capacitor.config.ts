import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.svii.app',
  appName: 'SVII',
  // webDir is required by cap sync even when using a remote server URL.
  // The Next.js public/ folder is a safe, always-present choice.
  webDir: 'public',
  server: {
    // The native shell loads the live Vercel deployment instead of local assets.
    url: 'https://project-yz19f.vercel.app',
    cleartext: false,   // HTTPS only — no plain-text HTTP
  },
};

export default config;

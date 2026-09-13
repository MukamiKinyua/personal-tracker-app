import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android wrap.
 *
 * The web build in dist/public is bundled into the APK and served from
 * https://localhost inside a WebView; the API it talks to is wherever
 * VITE_API_URL pointed at build time. `https` rather than the default
 * `capacitor://` scheme so that service workers, secure cookies and the
 * Web Crypto API all behave as they do in a browser.
 */
const config: CapacitorConfig = {
  appId: "com.glorymukami.tracker",
  appName: "Personal Tracker",
  webDir: "dist/public",
  android: {
    // The app talks to its own API only; nothing in it needs plain http.
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_tracker",
      iconColor: "#f4c766",
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oneequal.app",
  appName: "1Equal",
  webDir: "mobile/www",
  appendUserAgent: "1EqualAndroid",
  server: {
    url: "https://www.1equal.com/login",
    androidScheme: "https",
    allowNavigation: ["www.1equal.com", "1equal.com"],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

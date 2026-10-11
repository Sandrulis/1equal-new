import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.oneequal.app",
  appName: "1Equal",
  webDir: "mobile/www",
  server: {
    url: "https://1equal.com",
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

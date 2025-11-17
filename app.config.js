import 'dotenv/config';

export default {
  expo: {
    name: 'Rate My Rat',
    slug: 'rate-my-rat',
    scheme: 'ratemyrat',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.ratemyrat.app',
      usesAppleSignIn: true,
    },

    android: {
      package: 'com.ratemyrat.app',
    },

    plugins: [
      'expo-router',
      'expo-font',
      'expo-apple-authentication',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          sounds: [],
        },
      ],
    ],

    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      eas: {
        projectId: 'c77574a4-5195-4272-b845-564c14ba951e',
      },
    },

    experiments: {
      typedRoutes: true,
    },
  },
};

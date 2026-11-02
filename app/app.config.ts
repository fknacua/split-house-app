import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build variant, from `APP_VARIANT` (set per profile in eas.json).
 * `development` builds its own package so the dev build sits next to the
 * dry-run and production APKs; anything else builds the real app.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

const ANDROID_PACKAGE = IS_DEV ? 'com.splithouse.app.dev' : 'com.splithouse.app';
const APP_NAME = IS_DEV ? 'SplitHouse Dev' : 'SplitHouse';

/**
 * Expo app config. The scheme stays `splithouse` in every variant, since the
 * auth client and the backend's trusted origins use it.
 * @param context The static config Expo passes in (empty without an app.json).
 * @returns The resolved app config for the current variant.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'split-house-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'splithouse',
  userInterfaceStyle: 'automatic',
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      backgroundColor: '#0D5C63',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0D5C63',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#0D5C63',
      },
    ],
    'expo-font',
    'expo-secure-store',
    '@react-native-google-signin/google-signin',
    '@react-native-community/datetimepicker',
    'expo-sharing',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '9b0f3d6a-7202-4226-8da4-2de005d8bc8c',
    },
  },
  owner: 'fknacua',
});

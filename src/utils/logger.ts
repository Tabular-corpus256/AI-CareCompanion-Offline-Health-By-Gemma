import { Platform } from 'react-native';

type ErrorContext = Record<string, unknown>;

/**
 * Logs an error with structured metadata.
 *
 * To enable Firebase Crashlytics reporting:
 * 1. Install: npm install @react-native-firebase/crashlytics
 * 2. Uncomment the crashlytics lines below
 * 3. Enable Crashlytics in Firebase Console → Crashlytics
 */
export function logError(
  source: string,
  error: unknown,
  context?: ErrorContext,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[ERROR][${source}] ${message}`, {
    ...context,
    stack,
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  });

  // Firebase Crashlytics integration (uncomment when @react-native-firebase/crashlytics is installed):
  // try {
  //   const crashlytics = require('@react-native-firebase/crashlytics').default;
  //   crashlytics().log(`[${source}] ${message}`);
  //   if (context) {
  //     Object.entries(context).forEach(([key, value]) => {
  //       crashlytics().setAttribute(key, String(value));
  //     });
  //   }
  //   crashlytics().recordError(error instanceof Error ? error : new Error(message));
  // } catch {
  //   // Crashlytics not available — silently skip
  // }
}

export function logWarn(
  source: string,
  message: string,
  context?: ErrorContext,
): void {
  console.warn(`[WARN][${source}] ${message}`, context);
}

export function logInfo(
  source: string,
  message: string,
  context?: ErrorContext,
): void {
  console.log(`[INFO][${source}] ${message}`, context);
}

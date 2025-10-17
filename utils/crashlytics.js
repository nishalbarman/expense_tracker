import { getCrashlytics } from '@react-native-firebase/crashlytics';

// Initialize Crashlytics once
const crashlytics = getCrashlytics();

/**
 * Dynamic logger that mimics console behavior
 */
export const Logger = {
  log: (...args) => {
    const message = args.map(arg => formatArg(arg)).join(' ');
    crashlytics.recordError(new Error(message));
    console.log(...args);
  },
  info: (...args) => {
    const message = args.map(arg => formatArg(arg)).join(' ');
    crashlytics.recordError(new Error(message));
    console.info(...args);
  },
  warn: (...args) => {
    const message = args.map(arg => formatArg(arg)).join(' ');
    crashlytics.recordError(new Error(message));
    console.warn(...args);
  },
  error: (...args) => {
    const message = args.map(arg => formatArg(arg)).join(' ');
    crashlytics.recordError(new Error(message));
    console.error(...args);
  },
};

/**
 * Helper: format any argument into a string for Crashlytics
 */
function formatArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

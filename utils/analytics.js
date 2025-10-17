// Import the modular API functions
import { getAnalytics, logEvent as firebaseLogEvent, setUserProperties } from '@react-native-firebase/analytics';

/**
 * Log screen view
 */
export async function logScreenView(screenName, screenClass) {
  try {
    const analytics = getAnalytics();
    await firebaseLogEvent(analytics, 'screen_view', sanitizeParams({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    }));
  } catch (error) {
    console.warn('logScreenView failed:', error?.message || error);
  }
}

/**
 * Log a custom event
 */
export async function logEvent(eventName, params = {}) {
  try {
    const analytics = getAnalytics();
    await firebaseLogEvent(analytics, eventName, sanitizeParams(params));
  } catch (error) {
    console.warn('logEvent failed:', eventName, error?.message || error);
  }
}

/**
 * Set user property
 */
export async function setUserProperty(name, value) {
  try {
    const analytics = getAnalytics();
    await setUserProperties(analytics, { [name]: String(value) });
  } catch (error) {
    console.warn('setUserProperty failed:', name, error?.message || error);
  }
}

/**
 * Sanitize parameters to comply with Firebase limits
 */
function sanitizeParams(params) {
  const safe = {};
  Object.entries(params || {}).forEach(([key, val]) => {
    if (val == null) return;
    if (typeof val === 'object') {
      try {
        safe[key] = JSON.stringify(val).slice(0, 95);
      } catch (_) {
        safe[key] = String(val);
      }
    } else if (typeof val === 'string') {
      safe[key] = val.slice(0, 95);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      safe[key] = val;
    } else {
      safe[key] = String(val).slice(0, 95);
    }
  });
  return safe;
}

export default { logScreenView, logEvent, setUserProperty };

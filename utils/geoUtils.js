// src/utils/geoUtils.js

import { mmkvStorage } from '@/mmkv/mmkvStorage';
import axios from 'axios';

/**
 * Detect if the user is in California (CPRA)
 * Stores result in mmkvStorage to avoid repeated API calls
 */
const STORAGE_KEY = 'IS_CA_USER';

export async function isCaliforniaUser() {
  try {
    // Step 1: Check if value is cached
    const cached = await mmkvStorage.getItem(STORAGE_KEY);
    if (cached !== null) {
      return cached === 'true';
    }

    // Step 2: Fetch location (use free reliable service or your choice)
    const res = await axios.get('https://ipwho.is/');
    // console.log("Response Location API:", res)
    const isCA = res.data.country === 'US' && res.data.region === 'California';

    // Step 3: Save in mmkvStorage
    await mmkvStorage.setItem(STORAGE_KEY, isCA ? 'true' : 'false');

    return isCA;
  } catch (err) {
    console.log('❌ Geo detection error:', err);
    // Default fallback: not California
    return false;
  }
}

/**
 * Optional: Clear cached value (useful for testing)
 */
export async function clearCaliforniaCache() {
  await mmkvStorage.removeItem(STORAGE_KEY);
}

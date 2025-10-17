// src/utils/AdManager.js

import { logEvent } from "@/utils/analytics";
import { DebugGeography, Ump } from "google-ump-react-native";

import mobileAds from "react-native-google-mobile-ads";
import { isCaliforniaUser } from "./geoUtils"; // Custom utility to detect California users

let requestNonPersonalizedAdsOnly = false;

/**
 * Initialize Google Mobile Ads + UMP consent flow
 * Handles GDPR (EU) & CPRA/CCPA (California)
 */
export async function initializeAds() {
  console.log("🔄 Initializing AdMob + UMP consent flow...");

  try {
    // Step 0: Enable debug/test mode
    // const TEST_DEVICE_ID = process.env.EXPO_PUBLIC_TEST_DEVICE_ID; // Replace with your actual test device ID
    await Ump.requestInfoUpdate(
    // {
    //   debugSettings: {
    //     debugGeography: DebugGeography.EEA, // Force EEA for testing
    //     testDeviceIdentifiers: [TEST_DEVICE_ID],
    //   },
    //   tagForUnderAgeOfConsent: false,
    // }
  );

    // Step 1: Request consent info from Google
    const { canRequestAds } = await Ump.loadAndShowConsentFormIfRequired();
    console.log("✅ Consent info update requested");

    // Step 2: Check if we can request ads
    if (canRequestAds) {
      console.log("✅ Consent obtained — can request ads");
      requestNonPersonalizedAdsOnly = false;
    } else {
      console.log("🚫 Consent not obtained — non-personalized ads only");
      requestNonPersonalizedAdsOnly = true;
    }

    // Step 3: Handle CPRA/CCPA (California) users
    const isCA = await isCaliforniaUser();
    if (isCA) {
      console.log("⚠️ California user detected — showing non-personalized ads");
      requestNonPersonalizedAdsOnly = true;
    }
  } catch (error) {
    console.log("❌ Consent error:", error);
    requestNonPersonalizedAdsOnly = true; // fallback
  }

  // Step 4: Initialize AdMob SDK
  try {
    const adapterStatuses = await mobileAds().initialize();
    console.log("🎉 AdMob initialized successfully:", adapterStatuses);
  } catch (err) {
    console.log("❌ AdMob initialization error:", err);
  }
}

/**
 * Returns ad request options based on consent
 */
export function getAdRequestOptions() {
  return { requestNonPersonalizedAdsOnly };
}

// export const resetGDPRConsent = async () => {
//   try {
//     // Reset consent info
//     Ump.reset();

//     await Ump.requestInfoUpdate();

//     // Optionally request consent info update to show consent form again
//     await Ump.loadAndShowConsentFormIfRequired();

//     console.log("GDPR consent has been reset.");
//     logEvent("gdpr_consent_reset", {}); // Optional analytics
//   } catch (error) {
//     console.warn("Failed to reset GDPR consent:", error?.message || error);
//   }
// };

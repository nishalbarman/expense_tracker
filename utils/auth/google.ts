// utils/auth/google.ts
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

/**
 * Call once on app init with your web client id (client_type 3 from google-services.json).
 */
export function configureGoogleSignin(webClientId: string) {
  GoogleSignin.configure({
    webClientId,
    // Optionally: iosClientId, offlineAccess, forceCodeForRefreshToken
  });
}

/**
 * Launches Google account picker and signs into Firebase with the ID token.
 */
export async function signInWithGoogleFirebase() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken = (result as any)?.data?.idToken ?? (result as any)?.idToken;
  if (!idToken) throw new Error("No Google ID token returned");
  const credential = auth.GoogleAuthProvider.credential(idToken);
  return auth().signInWithCredential(credential);
}

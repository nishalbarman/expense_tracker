// utils/auth/google.ts
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
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
// export async function signInWithGoogleFirebase() {
//   await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//   const result = await GoogleSignin.signIn();
//   const idToken = (result as any)?.data?.idToken ?? (result as any)?.idToken;
//   if (!idToken) throw new Error("No Google ID token returned");
//   const credential = auth.GoogleAuthProvider.credential(idToken);
//   return auth().signInWithCredential(credential);
// }

export async function signInWithGoogleFirebase() {
  // Ensure Google Play Services and config done at app init:
  // GoogleSignin.configure({ webClientId: '<YOUR-WEB-CLIENT-ID>' });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken = (result as any)?.data?.idToken ?? (result as any)?.idToken;

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

  const current = auth().currentUser;
  if (current) {
    // Link Google to existing email/password account
    try {
      const linked = await current.linkWithCredential(googleCredential);
      return linked.user; // merged under one UID
    } catch (e: any) {
      if (
        e?.code === "auth/credential-already-in-use" ||
        e?.code === "auth/email-already-in-use"
      ) {
        // Already linked to another account: sign in with Google and migrate app data if needed
        const res = await auth().signInWithCredential(googleCredential);
        return res.user;
      }
      if (e?.code === "auth/requires-recent-login") {
        // Prompt for re-auth with password or re-login flow, then retry link
        throw new Error("Please reauthenticate and try linking again.");
      }
      throw e;
    }
  } else {
    // No current user: try to sign in with Google
    try {
      const res = await auth().signInWithCredential(googleCredential);
      return res.user;
    } catch (e: any) {
      if (e?.code === "auth/account-exists-with-different-credential") {
        // The email already exists with another provider (e.g., password).
        // Get pending cred, ask user to sign in with existing provider, then link.
        const pending = e?.credential as FirebaseAuthTypes.AuthCredential;
        const email = e?.customData?.email;
        // After the user signs in with existing method (e.g., password), link:
        // await auth().currentUser?.linkWithCredential(pending);
        throw new Error(
          "Account exists with a different sign-in method. Sign in with your existing method, then link Google."
        );
      }
      throw e;
    }
  }
}

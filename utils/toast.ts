import Toast from "react-native-toast-message";

export const ToastIds = {
  Offline: "toast-offline",
  LoginRequired: "toast-login-required",
  Syncing: "toast-syncing",
  SyncDone: "toast-sync-done",
  SyncFailed: "toast-sync-failed",
};

export const showToastOnce = (
  type: "info" | "success" | "error",
  id: string,
  text1: string,
  text2?: string
) => {
  // @ts-ignore react-native-toast-message has isVisible(id) starting v3; if not, emulate via internal store or track locally
  const anyToastVisible = (Toast as any)?.isVisible?.(id);
  if (anyToastVisible) return;
  Toast.show({ type, text1, text2, props: { toastId: id } as any });
}; // Prevent duplicates by id [react-toast libraries use ids to dedupe patterns] [3][4]

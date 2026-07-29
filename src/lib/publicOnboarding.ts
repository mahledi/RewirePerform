export const PUBLIC_ONBOARDING_VERSION = "1";
export const PUBLIC_ONBOARDING_STORAGE_KEY = "rewireperform:public-onboarding";

export const hasCompletedPublicOnboarding = () => {
  try {
    if (window.localStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY) === PUBLIC_ONBOARDING_VERSION) {
      return true;
    }
  } catch {
    // Fall back to a session marker when persistent device storage is unavailable.
  }
  try {
    return window.sessionStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY) === PUBLIC_ONBOARDING_VERSION;
  } catch {
    return false;
  }
};

export const completePublicOnboarding = () => {
  try {
    window.localStorage.setItem(PUBLIC_ONBOARDING_STORAGE_KEY, PUBLIC_ONBOARDING_VERSION);
    return;
  } catch {
    // Fall back to the current session so native navigation cannot loop.
  }
  try {
    window.sessionStorage.setItem(PUBLIC_ONBOARDING_STORAGE_KEY, PUBLIC_ONBOARDING_VERSION);
  } catch {
    // The visual introduction remains usable even when all browser storage is unavailable.
  }
};

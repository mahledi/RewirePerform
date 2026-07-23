export const PUBLIC_ONBOARDING_VERSION = "1";
export const PUBLIC_ONBOARDING_STORAGE_KEY = "rewireperform:public-onboarding";

export const hasCompletedPublicOnboarding = () => {
  try {
    return window.localStorage.getItem(PUBLIC_ONBOARDING_STORAGE_KEY) === PUBLIC_ONBOARDING_VERSION;
  } catch {
    return false;
  }
};

export const completePublicOnboarding = () => {
  try {
    window.localStorage.setItem(PUBLIC_ONBOARDING_STORAGE_KEY, PUBLIC_ONBOARDING_VERSION);
  } catch {
    // The introduction remains usable when device storage is unavailable.
  }
};

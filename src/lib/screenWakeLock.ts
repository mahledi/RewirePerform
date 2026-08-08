export type ScreenWakeLockHandle = {
  readonly released?: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLockHandle>;
  };
};

export const requestScreenWakeLock = async (): Promise<ScreenWakeLockHandle | null> => {
  if (typeof navigator === "undefined") return null;
  const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
  if (!wakeLock || typeof wakeLock.request !== "function") return null;

  try {
    return await wakeLock.request("screen");
  } catch {
    // Energiesparmodus, Gerätepolitik oder Browser können den optionalen Lock ablehnen.
    return null;
  }
};

export const releaseScreenWakeLock = async (
  handle: ScreenWakeLockHandle | null,
): Promise<void> => {
  if (!handle || handle.released) return;
  try {
    await handle.release();
  } catch {
    // Der Browser darf den Lock bei Hintergrundwechsel bereits freigegeben haben.
  }
};

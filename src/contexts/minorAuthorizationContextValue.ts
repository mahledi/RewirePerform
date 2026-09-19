import { createContext } from "react";
import type { AccessRecoveryPhase } from "@/lib/accessRecovery";
import type { MinorAuthorizationStatus } from "@/lib/minorAuthorization";

export interface MinorAuthorizationContextValue {
  status: MinorAuthorizationStatus | null;
  loading: boolean;
  phase: AccessRecoveryPhase;
  error: string | null;
  refresh: () => Promise<MinorAuthorizationStatus | null>;
  setStatus: (status: MinorAuthorizationStatus) => void;
}

export const MinorAuthorizationContext = createContext<MinorAuthorizationContextValue>({
  status: null,
  loading: false,
  phase: "idle",
  error: null,
  refresh: async () => null,
  setStatus: () => undefined,
});

import { createContext } from "react";
import type { MinorAuthorizationStatus } from "@/lib/minorAuthorization";

export interface MinorAuthorizationContextValue {
  status: MinorAuthorizationStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<MinorAuthorizationStatus | null>;
  setStatus: (status: MinorAuthorizationStatus) => void;
}

export const MinorAuthorizationContext = createContext<MinorAuthorizationContextValue>({
  status: null,
  loading: false,
  error: null,
  refresh: async () => null,
  setStatus: () => undefined,
});

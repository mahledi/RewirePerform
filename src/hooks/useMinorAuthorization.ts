import { useContext } from "react";
import { MinorAuthorizationContext } from "@/contexts/minorAuthorizationContextValue";

export const useMinorAuthorization = () => useContext(MinorAuthorizationContext);

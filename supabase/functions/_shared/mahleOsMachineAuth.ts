import {
  authenticateMahleOsAuthorization,
  type MahleOsMachineAuthError,
} from "./mahleOsMachineAuthCore.ts";

export const authenticateMahleOsMachine = async (
  req: Request,
): Promise<MahleOsMachineAuthError | null> => {
  return authenticateMahleOsAuthorization({
    authorization: req.headers.get("Authorization") ?? "",
    currentKey: Deno.env.get("MAHLEOS_REWIRE_API_KEY")?.trim() ?? "",
    previousKey: Deno.env.get("MAHLEOS_REWIRE_API_KEY_PREVIOUS")?.trim() ?? "",
  });
};

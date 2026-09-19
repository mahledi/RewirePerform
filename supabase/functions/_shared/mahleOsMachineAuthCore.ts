const encoder = new TextEncoder();
const MACHINE_KEY_PATTERN = /^[a-f0-9]{64}$/iu;

export type MahleOsMachineAuthError = "service_not_configured" | "unauthorized";

const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

export const authenticateMahleOsAuthorization = async ({
  authorization,
  currentKey,
  previousKey,
}: {
  authorization: string;
  currentKey: string;
  previousKey: string;
}): Promise<MahleOsMachineAuthError | null> => {
  if (!MACHINE_KEY_PATTERN.test(currentKey)) return "service_not_configured";
  if (previousKey && !MACHINE_KEY_PATTERN.test(previousKey)) {
    return "service_not_configured";
  }

  const match = /^Bearer ([a-f0-9]{64})$/iu.exec(authorization.trim());
  if (!match) return "unauthorized";

  const configuredKeys = previousKey ? [currentKey, previousKey] : [currentKey];
  const suppliedDigest = await digest(match[1]);
  const expectedDigests = await Promise.all(configuredKeys.map(digest));

  let authenticated = false;
  for (const expectedDigest of expectedDigests) {
    authenticated = constantTimeEqual(expectedDigest, suppliedDigest) || authenticated;
  }
  return authenticated ? null : "unauthorized";
};

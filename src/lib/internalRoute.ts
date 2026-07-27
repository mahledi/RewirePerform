const INTERNAL_ROUTE_BASE = "https://internal.rewireperform.invalid";
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/iu;

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });

type InternalRouteOptions = {
  blockedPathPrefixes?: readonly string[];
};

export const safeInternalRoute = (
  value: string | null,
  options: InternalRouteOptions = {},
): string | null => {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || containsControlCharacter(value)
  ) {
    return null;
  }

  const pathComponent = value.split(/[?#]/u, 1)[0] ?? "";
  if (ENCODED_PATH_SEPARATOR.test(pathComponent)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, INTERNAL_ROUTE_BASE);
  } catch {
    return null;
  }

  if (parsed.origin !== INTERNAL_ROUTE_BASE) return null;
  if (options.blockedPathPrefixes?.some((prefix) => parsed.pathname.startsWith(prefix))) {
    return null;
  }

  return value;
};

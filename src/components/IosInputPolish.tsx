import { useEffect } from "react";

const isIosLikeDevice = () => {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const isSingleLineInput = (target: EventTarget | null): target is HTMLInputElement | HTMLSelectElement => {
  if (target instanceof HTMLSelectElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  const multilineUnsafeTypes = new Set(["button", "checkbox", "file", "hidden", "image", "radio", "range", "reset", "submit"]);
  return !multilineUnsafeTypes.has(target.type);
};

const IosInputPolish = () => {
  useEffect(() => {
    if (!isIosLikeDevice()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (!isSingleLineInput(event.target)) return;
      event.preventDefault();
      event.target.blur();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  return null;
};

export default IosInputPolish;

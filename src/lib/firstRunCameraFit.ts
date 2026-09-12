import { useEffect, useState, type RefObject } from "react";

export const FIRST_RUN_SCREEN_WIDTH = 344;
export const FIRST_RUN_SCREEN_HEIGHT = 610;

export const calculateFirstRunCameraFit = ({
  viewportWidth,
  viewportHeight,
  reservedBottom = 0,
  padding = 16,
}: {
  viewportWidth: number;
  viewportHeight: number;
  reservedBottom?: number;
  padding?: number;
}) => {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1;

  const availableWidth = Math.max(1, viewportWidth - padding);
  const availableHeight = Math.max(1, viewportHeight - reservedBottom - padding);

  return Math.min(
    1,
    availableWidth / FIRST_RUN_SCREEN_WIDTH,
    availableHeight / FIRST_RUN_SCREEN_HEIGHT,
  );
};

export const useFirstRunCameraFit = (
  viewportRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  reservedBottom = 0,
) => {
  const [fit, setFit] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setFit(1);
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateFit = () => {
      const isNarrowViewport = typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 767px)").matches
        : window.innerWidth < 768;

      setFit(isNarrowViewport
        ? calculateFirstRunCameraFit({
            viewportWidth: viewport.clientWidth,
            viewportHeight: viewport.clientHeight,
            reservedBottom,
          })
        : 1);
    };

    updateFit();
    window.addEventListener("resize", updateFit);

    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateFit);
    resizeObserver?.observe(viewport);

    return () => {
      window.removeEventListener("resize", updateFit);
      resizeObserver?.disconnect();
    };
  }, [enabled, reservedBottom, viewportRef]);

  return fit;
};

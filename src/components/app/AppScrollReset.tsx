import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const resetDocumentScroll = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
};

const AppScrollReset = () => {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);

  useLayoutEffect(() => {
    if (previousPathname.current === location.pathname) return;
    previousPathname.current = location.pathname;
    resetDocumentScroll();
  }, [location.pathname]);

  return null;
};

export default AppScrollReset;

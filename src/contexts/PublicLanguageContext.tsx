import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type PublicLanguage = "de" | "en";

const STORAGE_KEY = "rewireperform.public-language";

const readLanguage = (): PublicLanguage => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "de";
  } catch {
    return "de";
  }
};

type PublicLanguageContextValue = {
  language: PublicLanguage;
  setLanguage: (language: PublicLanguage) => void;
  tr: (german: string, english: string) => string;
};

const PublicLanguageContext = createContext<PublicLanguageContextValue>({
  language: "de",
  setLanguage: () => undefined,
  tr: (german) => german,
});

const isPublicPath = (path: string) => path === "/" || path.startsWith("/start")
  || ["/privacy", "/imprint", "/support", "/team-access", "/organization/invite", "/account-deletion", "/account-deleted", "/join", "/auth", "/auth/confirm", "/auth/reset-password"].includes(path);

export const PublicLanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<PublicLanguage>(readLanguage);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = isPublicPath(location.pathname) ? language : "de";
  }, [language, location.pathname]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Language selection still works for this session if storage is unavailable.
    }
  }, [language]);

  const value = useMemo<PublicLanguageContextValue>(() => ({
    language,
    setLanguage,
    tr: (german, english) => language === "en" ? english : german,
  }), [language]);

  return <PublicLanguageContext.Provider value={value}>{children}</PublicLanguageContext.Provider>;
};

export const usePublicLanguage = () => useContext(PublicLanguageContext);

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Home,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

export type AthleteAppSection = "today" | "plan" | "progress" | "more";

const appSections: Array<{
  id: AthleteAppSection;
  label: string;
  icon: LucideIcon;
  path: string;
}> = [
  { id: "today", label: "Heute", icon: Home, path: "/dashboard" },
  { id: "plan", label: "Plan", icon: CalendarDays, path: "/dashboard#dashboard-plan" },
  { id: "progress", label: "Entwicklung", icon: BarChart3, path: "/progress" },
  { id: "more", label: "Mehr", icon: Menu, path: "/settings" },
];

interface AthleteAppHeaderProps {
  actions?: ReactNode;
}

export const AthleteAppHeader = ({ actions }: AthleteAppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.055] bg-[#0D0E12]/88 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          aria-label="RewirePerform Dashboard"
          className="min-h-11 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]"
        >
          <BrandLockup symbolSize={27} textClassName="text-[13px] tracking-[-0.02em]" />
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
};

interface AthleteBottomNavigationProps {
  active: AthleteAppSection;
  onPlan?: () => void;
}

export const AthleteBottomNavigation = ({ active, onPlan }: AthleteBottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visualActive, setVisualActive] = useState(active);
  const navigationTimer = useRef<number | null>(null);

  useEffect(() => {
    setVisualActive(active);
  }, [active]);

  useEffect(() => () => {
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
  }, []);

  const selectSection = (section: (typeof appSections)[number]) => {
    if (navigationTimer.current !== null) {
      window.clearTimeout(navigationTimer.current);
      navigationTimer.current = null;
    }
    setVisualActive(section.id);
    if (section.id === "plan" && onPlan) {
      onPlan();
      return;
    }
    if (`${location.pathname}${location.hash}` !== section.path) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        navigate(section.path);
        return;
      }
      navigationTimer.current = window.setTimeout(() => {
        navigationTimer.current = null;
        navigate(section.path);
      }, 150);
    }
  };

  return (
    <nav
      aria-label="App-Navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-4xl border-t border-white/[0.07] bg-[#0B0C10]/92 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl"
    >
      <div className="grid grid-cols-4">
        {appSections.map((section) => {
          const Icon = section.icon;
          const isActive = visualActive === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => selectSection(section)}
              aria-current={isActive ? "page" : undefined}
              className="relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isActive && (
                <motion.span
                  layoutId="athlete-nav-indicator"
                  className="absolute top-0 h-0.5 w-5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                />
              )}
              <Icon
                aria-hidden="true"
                className={cn("h-[19px] w-[19px]", isActive ? "text-primary" : "text-white/48")}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-white/48")}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

interface AthleteScreenHeaderProps {
  title: string;
  eyebrow?: string;
  onBack: () => void;
  backLabel?: string;
  trailing?: ReactNode;
}

export const AthleteScreenHeader = ({
  title,
  eyebrow,
  onBack,
  backLabel = "Zurück",
  trailing,
}: AthleteScreenHeaderProps) => (
  <header className="sticky top-0 z-50 border-b border-white/[0.055] bg-[#0D0E12]/88 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl">
    <div className="mx-auto flex min-h-11 w-full max-w-2xl items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/62 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-[14px] font-semibold tracking-[-0.015em]">{title}</h1>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  </header>
);

export const athleteAppBackground =
  "min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#0D0E12] text-[#EEF0F2]";

export const athleteAppViewport =
  "relative mx-auto w-full max-w-4xl px-5 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-6 sm:px-6 md:px-8";

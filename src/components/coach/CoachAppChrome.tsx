import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

export type CoachAppSection = "overview" | "mental" | "evidence" | "toolkit" | "manage" | "account";

const coachSections: Array<{
  id: CoachAppSection;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "mental", label: "Zustand", icon: Activity },
  { id: "evidence", label: "Entwicklung", icon: BarChart3 },
  { id: "toolkit", label: "Toolkit", icon: Sparkles },
  { id: "manage", label: "Team", icon: Settings },
];

export const CoachAppHeader = ({ onOpenAccount, onSignOut }: { onOpenAccount: () => void; onSignOut: () => void }) => (
  <header className="sticky top-0 z-40 border-b border-white/[0.055] bg-[#0D0E12]/88 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-2xl">
    <div className="mx-auto flex min-h-11 w-full max-w-5xl items-center justify-between gap-4">
      <BrandLockup symbolSize={27} textClassName="text-[13px] tracking-[-0.02em]" />
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-primary/15 bg-primary/[0.055] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary sm:inline-flex">
          Coach Console
        </span>
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label="Konto und Feedback"
          title="Konto und Feedback"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/[0.07] bg-white/[0.025] text-white/48 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Abmelden"
          title="Abmelden"
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/[0.07] bg-white/[0.025] text-white/48 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  </header>
);

export const CoachBottomNavigation = ({
  active,
  onSelect,
}: {
  active: CoachAppSection;
  onSelect: (section: CoachAppSection) => void;
}) => {
  const reduceMotion = useReducedMotion();
  const [visualActive, setVisualActive] = useState(active);

  useEffect(() => setVisualActive(active), [active]);

  const select = (section: CoachAppSection) => {
    setVisualActive(section);
    onSelect(section);
  };

  return (
    <nav
      aria-label="Coach-Navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-5xl border-t border-white/[0.07] bg-[#0B0C10]/94 px-1.5 pb-[max(9px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl sm:px-4"
    >
      <div className="grid grid-cols-5">
        {coachSections.map((section) => {
          const Icon = section.icon;
          const selected = visualActive === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => select(section.id)}
              aria-current={selected ? "page" : undefined}
              className="relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {selected && (
                <motion.span
                  layoutId="coach-nav-indicator"
                  className="absolute top-0 h-0.5 w-5 rounded-full bg-primary"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }}
                />
              )}
              <Icon
                aria-hidden="true"
                className={cn("h-[18px] w-[18px]", selected ? "text-primary" : "text-white/42")}
                strokeWidth={selected ? 2 : 1.7}
              />
              <span className={cn("max-w-full truncate text-[9px] font-medium sm:text-[10px]", selected ? "text-primary" : "text-white/42")}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const CoachPageIntro = ({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string;
  title: string;
  description: string;
  trailing?: ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-[clamp(1.65rem,4.5vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-[#EEF0F2]">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/46">{description}</p>
    </div>
    {trailing && <div className="shrink-0">{trailing}</div>}
  </div>
);

export const coachAppBackground =
  "coach-premium-shell min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#0D0E12] text-[#EEF0F2]";

export const coachAppViewport =
  "relative mx-auto w-full max-w-5xl px-5 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-6 sm:px-6 md:px-8 md:pt-8";

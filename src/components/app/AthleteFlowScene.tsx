import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type AthleteFlowSceneProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
  testId?: string;
};

export const athleteFlowPrimaryButton =
  "flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-[0_14px_38px_-22px_rgba(46,173,137,0.9)] transition-[background-color,box-shadow,opacity,transform] disabled:bg-white/[0.06] disabled:text-white/30 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]";

export const athleteFlowSecondaryButton =
  "flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.025] px-4 text-sm font-semibold text-white/58 transition-colors hover:bg-white/[0.045] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]";

export const athleteFlowPanel =
  "rounded-[24px] border border-white/[0.07] bg-white/[0.028] shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_24px_70px_-54px_rgba(0,0,0,0.95)]";

export const AthleteFlowAmbient = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_50%_-18%,rgba(46,173,137,0.14),transparent_58%)]"
  />
);

export const AthleteFlowScene = ({
  children,
  className,
  duration = 0.24,
  testId,
}: AthleteFlowSceneProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      data-testid={testId}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.995 }}
      transition={{ duration: reduceMotion ? 0 : duration, ease: "easeOut" }}
      className={cn("relative", className)}
    >
      {children}
    </motion.section>
  );
};

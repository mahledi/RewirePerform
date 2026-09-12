import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AthleteFlowSceneProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
  testId?: string;
};

export const athleteFlowPrimaryButton =
  "flex h-12 min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-[#07110e] shadow-glow transition-[background-color,box-shadow,opacity,transform] hover:bg-primary/92 active:brightness-95 disabled:bg-white/[0.06] disabled:text-white/30 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]";

export const athleteFlowSecondaryButton =
  "flex h-12 min-h-12 items-center justify-center gap-2 rounded-2xl border border-border/65 bg-card/65 px-4 text-sm font-semibold text-foreground/78 transition-[background-color,border-color,color,transform] hover:border-border hover:bg-card hover:text-foreground active:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E12]";

export const athleteFlowPanel =
  "rounded-2xl border border-white/[0.07] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_-54px_rgba(0,0,0,0.95)]";

export const athleteFlowStageSurface =
  "rounded-[28px] border border-white/[0.075] bg-[linear-gradient(155deg,rgba(255,255,255,0.048),rgba(255,255,255,0.018)_44%,rgba(46,173,137,0.025))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_90px_-58px_rgba(0,0,0,0.95),0_0_70px_-54px_rgba(46,173,137,0.72)]";

export const athleteFlowInput =
  "w-full rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-[border-color,background-color,box-shadow] focus-visible:border-primary/55 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

export const athleteFlowChoice = (selected: boolean) => cn(
  "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-[background-color,border-color,color,box-shadow,transform]",
  selected
    ? "border-primary/55 bg-primary/[0.11] text-foreground shadow-[inset_0_1px_0_rgba(98,198,168,0.1),0_0_28px_-20px_rgba(46,173,137,0.9)]"
    : "border-border/65 bg-card/65 text-foreground/85 hover:border-border hover:bg-card",
);

export const AthleteFlowProgress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/[0.07]", className)}>
    <motion.div
      className="h-full rounded-full bg-[linear-gradient(90deg,#2EAD89,#62C6A8)]"
      animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    />
  </div>
);

type AthleteFlowButtonProps = HTMLMotionProps<"button"> & {
  pressScale?: number;
};

export const AthleteFlowButton = ({
  children,
  className,
  disabled,
  pressScale = 0.99,
  type = "button",
  ...props
}: AthleteFlowButtonProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={!disabled && !reduceMotion ? { scale: pressScale } : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const AthleteFlowAmbient = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.16),transparent_34%),radial-gradient(circle_at_0%_46%,rgba(46,173,137,0.045),transparent_30%),radial-gradient(circle_at_100%_72%,rgba(46,173,137,0.035),transparent_28%)]"
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

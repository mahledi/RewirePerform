import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BrandLockup } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

export const BrandMark = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    aria-label="Zur Startseite"
    className={cn(
      "mx-auto flex w-fit items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className,
    )}
  >
    <BrandLockup symbolSize={34} textClassName="text-xl" />
  </Link>
);

export const LegalLinks = () => (
  <nav aria-label="Rechtliches und Hilfe" className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
    <Link to="/privacy" className="transition-colors hover:text-foreground">
      Datenschutz
    </Link>
    <Link to="/imprint" className="transition-colors hover:text-foreground">
      Impressum
    </Link>
    <Link to="/support" className="transition-colors hover:text-foreground">
      Support
    </Link>
  </nav>
);

export const AuthStatusLayout = ({
  icon,
  title,
  description,
  tone = "default",
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  tone?: "default" | "error";
  children: ReactNode;
}) => (
  <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md min-w-0 text-center"
    >
      <BrandMark />
      <div
        className={cn(
          "mx-auto mb-5 mt-8 flex h-14 w-14 items-center justify-center rounded-full",
          tone === "error" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </div>
      <h1 className="mb-3 font-heading text-3xl font-bold">{title}</h1>
      <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
      {children}
      <LegalLinks />
    </motion.div>
  </div>
);

type StatusActionVariant = "primary" | "secondary" | "link" | "quiet";

export const StatusAction = ({
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: StatusActionVariant }) => (
  <button
    type="button"
    className={cn(
      "flex min-h-11 w-full items-center justify-center gap-2 px-4 py-3 text-sm transition-colors disabled:opacity-50",
      variant === "primary"
        && "rounded-xl bg-primary font-heading font-semibold text-primary-foreground hover:shadow-glow",
      variant === "secondary"
        && "rounded-xl border border-border/60 bg-secondary/50 font-heading font-semibold hover:bg-secondary",
      variant === "link" && "font-medium text-primary hover:underline",
      variant === "quiet" && "font-medium text-muted-foreground hover:text-foreground",
      className,
    )}
    {...props}
  />
);

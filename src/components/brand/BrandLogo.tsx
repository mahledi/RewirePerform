import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BrandSurface = "dark" | "light";

const symbolSources: Record<BrandSurface, string> = {
  dark: "/brand/rewireperform-symbol-dark.svg",
  light: "/brand/rewireperform-symbol-light.svg",
};

type BrandSymbolProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "height" | "src" | "width"> & {
  decorative?: boolean;
  label?: string;
  size?: number;
  surface?: BrandSurface;
};

export const BrandSymbol = ({
  className,
  decorative = true,
  label = "RewirePerform",
  size = 32,
  surface = "dark",
  ...props
}: BrandSymbolProps) => (
  <img
    src={symbolSources[surface]}
    width={size}
    height={size}
    alt={decorative ? "" : label}
    aria-hidden={decorative || undefined}
    draggable={false}
    className={cn("block shrink-0 object-contain", className)}
    {...props}
  />
);

type BrandLockupProps = {
  className?: string;
  symbolClassName?: string;
  symbolSize?: number;
  surface?: BrandSurface;
  textClassName?: string;
};

export const BrandLockup = ({
  className,
  symbolClassName,
  symbolSize = 28,
  surface = "dark",
  textClassName,
}: BrandLockupProps) => (
  <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
    <BrandSymbol className={symbolClassName} size={symbolSize} surface={surface} />
    <span className={cn("truncate font-heading font-bold tracking-normal", textClassName)}>
      RewirePerform
    </span>
  </span>
);

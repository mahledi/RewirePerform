import { ChevronRight, type LucideIcon } from "lucide-react";

interface MobileNavCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

const MobileNavCard = ({ icon: Icon, title, description, onClick }: MobileNavCardProps) => (
  <button
    onClick={onClick}
    className="group relative flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left transition-all premium-hairline hover:border-primary/40 hover:bg-card/90 active:scale-[0.985]"
  >
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate font-heading text-base font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
  </button>
);

export default MobileNavCard;

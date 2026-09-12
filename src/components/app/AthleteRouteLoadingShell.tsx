import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
  type AthleteAppSection,
} from "@/components/app/AthleteAppChrome";

interface AthleteRouteLoadingShellProps {
  active: AthleteAppSection;
  label?: string;
}

const AthleteRouteLoadingShell = ({
  active,
  label = "Öffne deinen Bereich...",
}: AthleteRouteLoadingShellProps) => (
  <div className={athleteAppBackground} aria-label={label} aria-busy="true">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.08),transparent_34%)]" />
    <AthleteAppHeader />
    <main className={athleteAppViewport}>
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
      <div className="mt-5 h-9 w-52 animate-pulse rounded-xl bg-white/[0.07] motion-reduce:animate-none" />
      <div className="mt-8 h-40 animate-pulse rounded-[28px] border border-white/[0.055] bg-white/[0.025] motion-reduce:animate-none" />
      <div className="mt-5 h-56 animate-pulse rounded-[24px] border border-white/[0.05] bg-white/[0.02] motion-reduce:animate-none" />
    </main>
    <AthleteBottomNavigation active={active} />
  </div>
);

export default AthleteRouteLoadingShell;

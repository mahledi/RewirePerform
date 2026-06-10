import type { LucideIcon } from "lucide-react";

export type DemoFlowStep = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
};

export type DemoCheckinKey = "energy" | "focus" | "pressure" | "readiness";

export type DemoCoachTabId = "overview" | "readiness" | "evidence" | "toolkit" | "teams";

export type DemoCoachTab = {
  id: DemoCoachTabId;
  label: string;
  Icon: LucideIcon;
};

export type DemoMetric = {
  label: string;
  value: string;
  detail: string;
};

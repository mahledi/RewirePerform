import GoldenDaysPreview from "@/pages/GoldenDaysPreview";
import { PROGRAM_DAY_DRAFTS } from "@/prototypes/golden-days/programDayDrafts";

const ProgramContentPreview = () => (
  <GoldenDaysPreview drafts={PROGRAM_DAY_DRAFTS} mode="program" />
);

export default ProgramContentPreview;

import GoldenDaysPreview from "@/pages/GoldenDaysPreview";
import { PROGRAM_V11_DRAFTS } from "@/content/programV11";

const ProgramContentPreview = () => (
  <GoldenDaysPreview drafts={PROGRAM_V11_DRAFTS} mode="program" />
);

export default ProgramContentPreview;

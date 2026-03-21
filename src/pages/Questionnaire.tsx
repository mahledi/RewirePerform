import { useState } from "react";
import QuestionnaireIntro from "@/components/questionnaire/QuestionnaireIntro";
import QuestionnaireFlow from "@/components/questionnaire/QuestionnaireFlow";
import QuestionnaireResults from "@/components/questionnaire/QuestionnaireResults";

type Phase = "intro" | "flow" | "results";

const Questionnaire = () => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});

  const handleComplete = (finalAnswers: Record<string, string | string[] | number>) => {
    setAnswers(finalAnswers);
    setPhase("results");
    window.scrollTo(0, 0);
  };

  return (
    <>
      {phase === "intro" && (
        <QuestionnaireIntro onStart={() => setPhase("flow")} />
      )}
      {phase === "flow" && (
        <QuestionnaireFlow
          onComplete={handleComplete}
          onBack={() => setPhase("intro")}
        />
      )}
      {phase === "results" && <QuestionnaireResults answers={answers} />}
    </>
  );
};

export default Questionnaire;

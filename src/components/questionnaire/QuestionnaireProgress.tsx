interface QuestionnaireProgressProps {
  current: number;
  total: number;
  categoryTitle: string;
}

const QuestionnaireProgress = ({
  current,
  total,
  categoryTitle,
}: QuestionnaireProgressProps) => {
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{categoryTitle}</span>
        <span className="text-sm text-muted-foreground font-heading">
          {current + 1} / {total}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default QuestionnaireProgress;

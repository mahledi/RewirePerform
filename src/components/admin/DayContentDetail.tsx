import { useEffect, useState } from "react";
import { MATRIX_DAYS } from "@/content/matrixDays";
import { getDailyContent } from "@/content/dailyContent";
import { scienceBitesByDay } from "@/content/scienceBites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { getNote, setNote } from "@/lib/adminNotes";
import { toast } from "@/hooks/use-toast";

interface Props {
  dayNumber: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const DayContentDetail = ({ dayNumber, onPrev, onNext, hasPrev, hasNext }: Props) => {
  const matrix = MATRIX_DAYS.find((m) => m.dayNumber === dayNumber);
  const content = getDailyContent(dayNumber);
  const scienceBite = scienceBitesByDay[dayNumber];
  const [note, setLocalNote] = useState("");

  useEffect(() => {
    setLocalNote(getNote(dayNumber));
  }, [dayNumber]);

  const handleSave = () => {
    setNote(dayNumber, note);
    toast({ title: "Notiz gespeichert", description: `Tag ${dayNumber}` });
  };

  if (!matrix) {
    return <p className="text-sm text-muted-foreground">Tag nicht gefunden.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">Tag {matrix.dayNumber}</Badge>
          <Badge variant="outline">Phase {matrix.phase}</Badge>
          <Badge variant="outline">Woche {matrix.week}</Badge>
          <span className="text-sm font-medium hidden sm:inline">{matrix.lens}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={onPrev} disabled={!hasPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onNext} disabled={!hasNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Matrix Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{matrix.lens}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div><span className="text-muted-foreground">Mechanismus:</span> {matrix.primaryMechanism}</div>
          <div><span className="text-muted-foreground">Practice Focus:</span> {matrix.practiceFocus}</div>
          <div><span className="text-muted-foreground">Day Role:</span> {matrix.dayRole}</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {matrix.secondaryAxes.map((a) => (
              <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      {content && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks ({content.tasks.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {content.tasks.map((t, i) => (
              <div key={t.id} className="rounded-md border border-border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">#{i + 1}</Badge>
                  <span className="font-medium text-sm">{t.title}</span>
                </div>
                <p className="text-xs text-muted-foreground"><strong>Why:</strong> {t.why}</p>
                <p className="text-xs"><strong>Action:</strong> {t.concreteAction}</p>
                {t.microReframe && (
                  <p className="text-xs text-muted-foreground"><strong>Reframe:</strong> {t.microReframe}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Science Bite */}
      {scienceBite && (
        <Card>
          <CardHeader><CardTitle className="text-base">Science Bite</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground">
              {scienceBite}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Comprehension */}
      {content?.comprehensionPool && content.comprehensionPool.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Comprehension Pool ({content.comprehensionPool.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.comprehensionPool.map((q, qi) => (
              <div key={q.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">Q{qi + 1}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{q.target}</Badge>
                  <span className="text-xs text-muted-foreground">{q.id}</span>
                </div>
                <p className="text-sm font-medium">{q.stem}</p>
                <ul className="space-y-1">
                  {q.options.map((o) => {
                    const correct = o.id === q.correctOptionId;
                    return (
                      <li
                        key={o.id}
                        className={`text-xs rounded px-2 py-1.5 flex items-start gap-2 ${
                          correct
                            ? "bg-primary/10 border border-primary/40 text-foreground"
                            : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="font-mono uppercase shrink-0">{o.id}</span>
                        <span className="flex-1">{o.text}</span>
                        {correct && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground italic"><strong>Erklärung:</strong> {q.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Deine Notizen zu Tag {dayNumber}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setLocalNote(e.target.value)}
            placeholder="Verbesserungen, Ideen, Auffälligkeiten… (lokal gespeichert, offline-fähig)"
            rows={6}
            className="font-mono text-xs"
          />
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Notiz speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayContentDetail;

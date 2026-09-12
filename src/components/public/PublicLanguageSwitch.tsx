import { usePublicLanguage } from "@/contexts/PublicLanguageContext";

export const PublicLanguageSwitch = ({ className = "" }: { className?: string }) => {
  const { language, setLanguage, tr } = usePublicLanguage();

  return (
    <div role="group" aria-label={tr("Sprache wählen", "Choose language")} className={`inline-flex shrink-0 items-center rounded-full border border-white/15 bg-white/[0.045] p-1 ${className}`}>
      {(["de", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={language === option}
          aria-label={option === "de" ? "Deutsch wählen" : "Choose English"}
          title={option === "de" ? "Deutsch" : "English"}
          onClick={() => setLanguage(option)}
          className={`min-h-9 min-w-9 rounded-full px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${language === option ? "bg-primary text-[#07110E]" : "text-white/65 hover:text-white"}`}
        >
          <span aria-hidden="true" className="text-[17px] leading-none">{option === "de" ? "🇩🇪" : "🇬🇧"}</span>
        </button>
      ))}
    </div>
  );
};

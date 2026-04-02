import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  language?: string;
  placeholder?: string;
}

// Check for browser support
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
};

const VoiceInput = ({
  onTranscript,
  currentValue = "",
  language = "de-DE",
  placeholder = "Tippe oder sprich deine Antwort ein...",
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [pulseLevel, setPulseLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    setIsSupported(!!SpeechRecognition);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (final) {
        const separator = currentValue && !currentValue.endsWith(" ") ? " " : "";
        const newValue = currentValue + separator + final;
        onTranscript(newValue);
        setInterimText("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setIsListening(false);
        setInterimText("");
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening (continuous mode workaround)
      if (isListening && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Fake pulse animation
    pulseIntervalRef.current = setInterval(() => {
      setPulseLevel(Math.random());
    }, 150);
  }, [language, currentValue, onTranscript, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    setPulseLevel(0);
  }, []);

  // Update the ref for onend handler
  useEffect(() => {
    if (!isListening && recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, [isListening]);

  if (!isSupported) return null;

  return (
    <div className="space-y-3">
      {/* Voice CTA — encourage speaking */}
      {!isListening && !currentValue && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10"
        >
          <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs text-primary/80">
            <span className="font-medium">Tipp:</span> Sprich deine Antwort einfach ein – das ist oft ehrlicher als Tippen.
          </p>
        </motion.div>
      )}

      {/* Mic Button */}
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening ? stopListening : startListening}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-medium text-sm transition-all ${
            isListening
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          }`}
        >
          {isListening && (
            <>
              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-destructive/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-xl border border-destructive/20"
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
            </>
          )}
          {isListening ? (
            <>
              <Square className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Aufnahme stoppen</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Einsprechen</span>
            </>
          )}
        </motion.button>

        {/* Audio level indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-0.5 overflow-hidden"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  animate={{
                    height: isListening
                      ? `${8 + Math.sin(pulseLevel * Math.PI + i * 0.8) * 12}px`
                      : "4px",
                  }}
                  transition={{ duration: 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interim transcript preview */}
      <AnimatePresence>
        {interimText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50"
          >
            <p className="text-xs text-muted-foreground italic">
              <span className="text-primary font-medium">Erkennung:</span>{" "}
              {interimText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceInput;

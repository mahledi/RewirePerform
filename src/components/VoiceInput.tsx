import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square } from "lucide-react";
import {
  OnDeviceSpeech,
  REWIREPERFORM_SPEECH_CONTEXT,
  isNativeOnDeviceSpeechPlatform,
} from "@/lib/onDeviceSpeech";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  language?: string;
  placeholder?: string;
  showHint?: boolean;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

const getSpeechErrorMessage = (error: string) => {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Spracherkennung ist nicht erlaubt. Aktiviere Mikrofon und Spracherkennung in den iOS-Einstellungen oder tippe deine Antwort.";
  }
  if (error === "audio-capture") {
    return "Kein Mikrofon verfügbar. Du kannst deine Antwort weiterhin tippen.";
  }
  if (error === "network") {
    return "Spracherkennung ist gerade nicht erreichbar. Du kannst deine Antwort weiterhin tippen.";
  }
  return "Spracherkennung konnte nicht gestartet werden. Du kannst deine Antwort weiterhin tippen.";
};

const getNativeSpeechErrorMessage = (error: unknown) => {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (code === "PERMISSION_DENIED") {
    return "Spracherkennung ist nicht erlaubt. Aktiviere Mikrofon und Spracherkennung in den iOS-Einstellungen oder tippe deine Antwort.";
  }
  if (
    code === "ON_DEVICE_UNAVAILABLE" ||
    code === "UNSUPPORTED_LANGUAGE"
  ) {
    return "Lokale Spracherkennung ist auf diesem iPhone nicht verfügbar. Du kannst deine Antwort weiterhin tippen.";
  }
  if (code === "AUDIO_START_FAILED") {
    return "Das Mikrofon konnte nicht gestartet werden. Du kannst deine Antwort weiterhin tippen.";
  }
  return "Lokale Spracherkennung konnte nicht gestartet werden. Du kannst deine Antwort weiterhin tippen.";
};

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechMode = "native" | "web" | null;

// Check for browser support
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return (
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition ||
    null
  );
};

const VoiceInput = ({
  onTranscript,
  currentValue = "",
  language = "de-DE",
  showHint = true,
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [speechMode, setSpeechMode] = useState<SpeechMode>(null);
  const [nativeListenersReady, setNativeListenersReady] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [pulseLevel, setPulseLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentValueRef = useRef(currentValue);
  const interimTextRef = useRef("");
  const committedNativeTranscriptRef = useRef("");
  const isListeningRef = useRef(false); // Ref-Spiegel für stabile Closures
  const onTranscriptRef = useRef(onTranscript);
  const startingRef = useRef(false); // Schutz gegen doppelten Start

  // Refs in sync halten
  useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    let cancelled = false;

    if (isNativeOnDeviceSpeechPlatform()) {
      setNativeListenersReady(false);
      setSpeechMode(null);
      setIsSupported(false);
      void OnDeviceSpeech.getAvailability({ language })
        .then(({ available }) => {
          if (cancelled) return;
          setSpeechMode(available ? "native" : null);
          setIsSupported(available);
        })
        .catch(() => {
          if (cancelled) return;
          setSpeechMode(null);
          setIsSupported(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const SpeechRecognition = getSpeechRecognition();
    setSpeechMode(SpeechRecognition ? "web" : null);
    setIsSupported(!!SpeechRecognition);

    return () => {
      cancelled = true;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
    };
  }, [language]);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    setPulseLevel(0);
    interimTextRef.current = "";
    setInterimText("");
  }, []);

  const startPulse = useCallback(() => {
    if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    pulseIntervalRef.current = setInterval(() => {
      setPulseLevel(Math.random());
    }, 150);
  }, []);

  const stopPulse = useCallback(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    setPulseLevel(0);
  }, []);

  const commitTranscript = useCallback((transcript: string) => {
    const final = transcript.trim();
    if (!final) return;

    const cur = currentValueRef.current;
    const separator = cur && !cur.endsWith(" ") ? " " : "";
    const newValue = cur + separator + final;
    currentValueRef.current = newValue;
    onTranscriptRef.current(newValue);
  }, []);

  useEffect(() => {
    if (speechMode !== "native") return;

    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    setNativeListenersReady(false);

    const registerListeners = async () => {
      const transcriptHandle = await OnDeviceSpeech.addListener(
        "transcript",
        ({ transcript, isFinal }) => {
          if (disposed) return;

          if (isFinal) {
            const finalTranscript = transcript.trim();
            if (
              finalTranscript &&
              committedNativeTranscriptRef.current !== finalTranscript
            ) {
              committedNativeTranscriptRef.current = finalTranscript;
              commitTranscript(finalTranscript);
            }
            interimTextRef.current = "";
            setInterimText("");
            return;
          }

          interimTextRef.current = transcript;
          setInterimText(transcript);
        },
      );
      const stateHandle = await OnDeviceSpeech.addListener(
        "stateChange",
        ({ state }) => {
          if (disposed || state !== "stopped") return;
          isListeningRef.current = false;
          setIsListening(false);
          stopPulse();
        },
      );
      const errorHandle = await OnDeviceSpeech.addListener(
        "speechError",
        (event) => {
          if (disposed) return;
          isListeningRef.current = false;
          setIsListening(false);
          stopPulse();
          setErrorMessage(getNativeSpeechErrorMessage(event));
        },
      );

      if (disposed) {
        await Promise.all([
          transcriptHandle.remove(),
          stateHandle.remove(),
          errorHandle.remove(),
        ]);
        return;
      }

      handles.push(transcriptHandle, stateHandle, errorHandle);
      setNativeListenersReady(true);
    };

    void registerListeners().catch(() => {
      if (!disposed) {
        setNativeListenersReady(false);
        setIsSupported(false);
        setSpeechMode(null);
      }
    });

    return () => {
      disposed = true;
      isListeningRef.current = false;
      void OnDeviceSpeech.cancel().catch(() => undefined);
      for (const handle of handles) {
        void handle.remove();
      }
      stopPulse();
    };
  }, [commitTranscript, speechMode, stopPulse]);

  const startListening = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setErrorMessage(null);

    if (speechMode === "native") {
      try {
        committedNativeTranscriptRef.current = "";
        let permission = await OnDeviceSpeech.checkPermissions();
        if (permission.speechRecognition === "prompt") {
          permission = await OnDeviceSpeech.requestPermissions();
        }
        if (permission.speechRecognition !== "granted") {
          throw { code: "PERMISSION_DENIED" };
        }

        await OnDeviceSpeech.start({
          language,
          contextualStrings: REWIREPERFORM_SPEECH_CONTEXT,
        });
        isListeningRef.current = true;
        setIsListening(true);
        startPulse();
      } catch (error) {
        isListeningRef.current = false;
        setIsListening(false);
        stopPulse();
        setErrorMessage(getNativeSpeechErrorMessage(error));
      } finally {
        startingRef.current = false;
      }
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      startingRef.current = false;
      return;
    }

    // Falls eine alte Instanz noch existiert: sauber entfernen.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionResultEventLike) => {
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

      interimTextRef.current = interim;
      setInterimText(interim);

      if (final) {
        const cur = currentValueRef.current;
        const separator = cur && !cur.endsWith(" ") ? " " : "";
        const newValue = cur + separator + final;
        currentValueRef.current = newValue;
        onTranscriptRef.current(newValue);
        interimTextRef.current = "";
        setInterimText("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      isListeningRef.current = false;
      setIsListening(false);
      setErrorMessage(getSpeechErrorMessage(event.error));
      cleanupRecognition();
    };

    recognition.onend = () => {
      // Auto-Restart nur wenn weiterhin gewünscht und das die aktuelle Instanz ist
      if (isListeningRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);

    startPulse();

    try {
      recognition.start();
    } catch (e) {
      // InvalidStateError: alte Engine noch nicht freigegeben — kurz warten und retry
      console.warn("Recognition.start() failed, retrying...", e);
      setTimeout(() => {
        if (recognitionRef.current === recognition && isListeningRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.error("Recognition retry failed:", err);
            cleanupRecognition();
            isListeningRef.current = false;
            setIsListening(false);
            setErrorMessage(getSpeechErrorMessage("start-failed"));
          }
        }
      }, 250);
    } finally {
      // Lock früh genug freigeben, damit der nächste echte User-Klick wieder geht
      setTimeout(() => {
        startingRef.current = false;
      }, 50);
    }
  }, [
    cleanupRecognition,
    language,
    speechMode,
    startPulse,
    stopPulse,
  ]);

  const stopListening = useCallback(async () => {
    isListeningRef.current = false;

    if (speechMode === "native") {
      const pending = interimTextRef.current;
      setIsListening(false);
      stopPulse();

      try {
        const result = await OnDeviceSpeech.stop();
        const finalTranscript = (result.transcript || pending).trim();
        if (
          finalTranscript &&
          committedNativeTranscriptRef.current !== finalTranscript
        ) {
          committedNativeTranscriptRef.current = finalTranscript;
          commitTranscript(finalTranscript);
        }
      } catch (error) {
        setErrorMessage(getNativeSpeechErrorMessage(error));
      } finally {
        interimTextRef.current = "";
        setInterimText("");
      }
      return;
    }

    const pending = interimTextRef.current.trim();
    commitTranscript(pending);
    cleanupRecognition();
    setIsListening(false);
  }, [
    cleanupRecognition,
    commitTranscript,
    speechMode,
    stopPulse,
  ]);

  if (
    !isSupported ||
    (speechMode === "native" && !nativeListenersReady)
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Voice CTA — encourage speaking */}
      {showHint && !isListening && !currentValue && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10"
        >
          <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-xs text-primary/80">
            <span className="font-medium">Tipp:</span> Sprich deine Antwort ein, wenn das für dich direkter ist. Du kannst den Text danach bearbeiten.
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
              <span className="relative z-10">Einsprechen stoppen</span>
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

      <AnimatePresence>
        {errorMessage && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-destructive"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>

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

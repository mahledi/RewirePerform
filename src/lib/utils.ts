import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalisiert einen Datums-String (z.B. aus <input type="date">) auf das
 * ISO-Format YYYY-MM-DD. Gibt `null` zurück, wenn der Wert leer oder ungültig ist.
 *
 * Schützt davor, dass Edge-Cases (Safari iOS, Locale-Eingaben, leere Strings)
 * als ungültiges Datum in die DB geschrieben werden und dort Fehler auslösen.
 */
export function normalizeDateString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Strikt YYYY-MM-DD akzeptieren (Standard-Output von <input type="date">)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const d = new Date(`${trimmed}T00:00:00`);
    if (!isNaN(d.getTime())) return trimmed;
  }

  // Fallback: irgendetwas Date-Parsebares
  const fallback = new Date(trimmed);
  if (isNaN(fallback.getTime())) return null;
  const year = fallback.getFullYear();
  const month = String(fallback.getMonth() + 1).padStart(2, "0");
  const day = String(fallback.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

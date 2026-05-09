/**
 * Lokaler Notizen-Speicher für den Admin-Content-Browser.
 * Daten liegen ausschließlich im localStorage des Browsers — komplett offline-fähig.
 */

const KEY = "admin_content_notes_v1";

type NotesMap = Record<number, string>;

function readAll(): NotesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: NotesMap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("[adminNotes] write failed", err);
  }
}

export function getNote(dayNumber: number): string {
  return readAll()[dayNumber] ?? "";
}

export function setNote(dayNumber: number, text: string) {
  const map = readAll();
  if (text.trim()) {
    map[dayNumber] = text;
  } else {
    delete map[dayNumber];
  }
  writeAll(map);
}

export function getAllNotes(): NotesMap {
  return readAll();
}

export function exportAsJson(): string {
  return JSON.stringify(readAll(), null, 2);
}

export function exportAsMarkdown(): string {
  const map = readAll();
  const days = Object.keys(map)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  if (!days.length) return "# Admin-Notizen\n\n_Keine Notizen vorhanden._\n";
  const lines: string[] = ["# Admin-Notizen zum 56-Tage-Programm", ""];
  for (const d of days) {
    lines.push(`## Tag ${d}`, "", map[d].trim(), "");
  }
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

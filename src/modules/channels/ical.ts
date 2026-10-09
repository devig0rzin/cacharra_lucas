/**
 * Leitura e geração de calendários iCal (RFC 5545) — só o necessário para
 * trocar datas ocupadas com o Airbnb (e outros canais, como Booking.com).
 */
import { addDays, isIsoDate, type IsoDate } from "@/lib/dates";

export interface CalendarEvent {
  uid: string;
  start: IsoDate; // inclusivo
  end: IsoDate; // exclusivo (dia da saída)
  summary?: string;
}

/** Junta linhas "dobradas" (continuações começam com espaço ou tab). */
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** "20261010" ou "20261010T150000Z" → "2026-10-10" */
function parseIcalDate(value: string): IsoDate | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return isIsoDate(iso) ? iso : null;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

export function parseIcal(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.start) {
        const start = current.start;
        const end = current.end && current.end > start ? current.end : addDays(start, 1);
        events.push({
          uid: current.uid ?? `${start}_${end}`,
          start,
          end,
          summary: current.summary,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);

    if (name === "UID") current.uid = value.trim();
    else if (name === "SUMMARY") current.summary = unescapeText(value);
    else if (name === "DTSTART") current.start = parseIcalDate(value) ?? undefined;
    else if (name === "DTEND") current.end = parseIcalDate(value) ?? undefined;
  }
  return events;
}

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

const compact = (d: IsoDate) => d.replace(/-/g, "");

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Dobra linhas acima de 75 octetos, como pede a RFC. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join("\r\n");
}

export function buildIcal(opts: { prodId: string; name: string; events: CalendarEvent[]; now?: Date }): string {
  const now = stamp(opts.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${opts.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
  ];
  for (const e of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${escapeText(e.summary ?? "Reservado")}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

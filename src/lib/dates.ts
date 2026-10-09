/**
 * Datas de calendário no formato ISO "YYYY-MM-DD".
 *
 * Reservas trabalham com DIAS (noites), não com horários. Toda a matemática
 * é feita em UTC para não sofrer com horário de verão/fuso; "hoje" é sempre
 * calculado no fuso da chácara.
 */
export type IsoDate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: IsoDate): number {
  return Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * 86_400_000);
}

/** Número de noites entre check-in e check-out (check-out exclusivo). */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / 86_400_000);
}

/** Lista as noites (datas de início de cada noite) do intervalo [from, to). */
export function eachNight(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "Hoje" no fuso informado (padrão: fuso da chácara). */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Intervalos semiabertos [aStart, aEnd) e [bStart, bEnd) se sobrepõem? */
export function rangesOverlap(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function formatDateBR(date: IsoDate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { addDays, type IsoDate } from "@/lib/dates";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthStart(date: IsoDate): IsoDate { return `${date.slice(0, 7)}-01`; }
export function addMonths(month: IsoDate, n: number): IsoDate { const y = +month.slice(0, 4); const m = +month.slice(5, 7) - 1 + n; return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); }

interface Props {
  firstMonth: IsoDate; months: number; today: IsoDate; lastBookable: IsoDate;
  blocked: ReadonlySet<IsoDate>; checkIn: IsoDate | null; checkOut: IsoDate | null;
  loading: boolean; onSelect: (date: IsoDate) => void;
  /** Pede para trocar o mês exibido (usado quando o teclado passa da borda). */
  onNavigate?: (deltaMonths: number) => void;
}

/** Mesma quebra do CSS (`max-width: 767px`): no celular só um mês aparece. */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/**
 * Quantos meses estão realmente visíveis. No servidor devolve `months`
 * (o CSS esconde o excedente no celular até hidratar), no navegador lê a
 * media query — assim o teclado nunca leva o foco para um mês escondido.
 */
function useVisibleMonths(months: number): number {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(MOBILE_QUERY).matches ? 1 : months),
    () => months,
  );
}

export function AvailabilityCalendar(p: Props) {
  const visibleMonths = useVisibleMonths(p.months);
  const visibleEnd = addMonths(p.firstMonth, visibleMonths);
  const firstFocusable = p.checkIn && p.checkIn >= p.firstMonth && p.checkIn < visibleEnd
    ? p.checkIn
    : (p.today > p.firstMonth ? p.today : p.firstMonth);
  const [activeDate, setActiveDate] = useState(firstFocusable);
  const pendingFocus = useRef<IsoDate | null>(null);
  const [hoverDate, setHoverDate] = useState<IsoDate | null>(null);
  const visibleActiveDate = activeDate >= p.firstMonth && activeDate < visibleEnd ? activeDate : firstFocusable;

  // Foca depois do render: funciona inclusive quando o mês acabou de trocar.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const el = document.querySelector<HTMLButtonElement>(`button[data-date="${target}"]`);
    if (el) {
      pendingFocus.current = null;
      el.focus();
    }
  });

  function moveFocus(from: IsoDate, amount: number) {
    const next = addDays(from, amount);
    // não sai da janela reservável (passado ou além do limite de reservas)
    if (next < p.today || next > p.lastBookable) return;
    const outside = next >= visibleEnd || next < p.firstMonth;
    if (outside) {
      if (!p.onNavigate) return;
      p.onNavigate(next >= visibleEnd ? 1 : -1);
    }
    pendingFocus.current = next;
    setActiveDate(next);
  }

  return (
    <div className={`calendar-grid ${p.loading ? "is-loading" : ""}`} aria-busy={p.loading}>
      {Array.from({ length: visibleMonths }, (_, i) => (
        <Month
          key={i}
          month={addMonths(p.firstMonth, i)}
          {...p}
          activeDate={visibleActiveDate}
          hoverDate={hoverDate}
          onHover={setHoverDate}
          moveFocus={moveFocus}
        />
      ))}
    </div>
  );
}

function Month({ month, today, lastBookable, blocked, checkIn, checkOut, onSelect, activeDate, hoverDate, onHover, moveFocus }: Props & { month: IsoDate; activeDate: IsoDate; hoverDate: IsoDate | null; onHover: (date: IsoDate | null) => void; moveFocus: (from: IsoDate, amount: number) => void }) {
  const firstWeekday = new Date(`${month}T00:00:00Z`).getUTCDay();
  const next = addMonths(month, 1);
  const days: IsoDate[] = [];
  for (let d = month; d < next; d = addDays(d, 1)) days.push(d);
  return <div data-calendar-month={month} className="calendar-month"><p className="calendar-title">{MONTHS[+month.slice(5, 7) - 1]} {month.slice(0, 4)}</p><div className="calendar-days" role="grid">{WEEKDAYS.map((w, i) => <div key={i} className="calendar-weekday" role="columnheader">{w}</div>)}{Array.from({ length: firstWeekday }, (_, i) => <div key={`pad-${i}`} />)}{days.map((d) => {
    const past = d < today || d > lastBookable;
    const isBlocked = blocked.has(d);
    const isStart = d === checkIn;
    const isEnd = d === checkOut;
    const previewing = checkIn && !checkOut && hoverDate && hoverDate > checkIn && d > checkIn && d <= hoverDate;
    const inRange = (checkIn && checkOut && d > checkIn && d < checkOut) || previewing;
    const state = isStart || isEnd ? "selected" : inRange ? "range" : isBlocked ? "blocked" : "free";
    const label = `${+d.slice(8, 10)} de ${MONTHS[+d.slice(5, 7) - 1]}${isBlocked ? ", ocupado" : ""}${isStart ? ", entrada" : ""}${isEnd ? ", saída" : ""}`;
    return <button key={d} type="button" disabled={past} onClick={() => onSelect(d)} onMouseEnter={() => onHover(d)} onMouseLeave={() => onHover(null)} onFocus={() => setTimeout(() => onHover(null), 0)} onKeyDown={(event) => { const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key]; if (step) { event.preventDefault(); moveFocus(d, step); } }} aria-label={label} aria-pressed={isStart || isEnd} data-date={d} data-state={past ? "past" : state} tabIndex={!past && d === activeDate ? 0 : -1} className="calendar-day">{+d.slice(8, 10)}</button>;
  })}</div></div>;
}

"use client";

import { useState } from "react";
import { addDays, type IsoDate } from "@/lib/dates";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthStart(date: IsoDate): IsoDate { return `${date.slice(0, 7)}-01`; }
export function addMonths(month: IsoDate, n: number): IsoDate { const y = +month.slice(0, 4); const m = +month.slice(5, 7) - 1 + n; return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); }

interface Props {
  firstMonth: IsoDate; months: number; today: IsoDate; lastBookable: IsoDate;
  blocked: ReadonlySet<IsoDate>; checkIn: IsoDate | null; checkOut: IsoDate | null;
  loading: boolean; onSelect: (date: IsoDate) => void;
}

export function AvailabilityCalendar(p: Props) {
  const firstFocusable = p.checkIn ?? (p.today > p.firstMonth ? p.today : p.firstMonth);
  const [activeDate, setActiveDate] = useState(firstFocusable);
  const [hoverDate, setHoverDate] = useState<IsoDate | null>(null);
  const visibleEnd = addMonths(p.firstMonth, p.months);
  const visibleActiveDate = activeDate >= p.firstMonth && activeDate < visibleEnd ? activeDate : firstFocusable;

  function moveFocus(from: IsoDate, amount: number) {
    let next = addDays(from, amount);
    const end = addMonths(p.firstMonth, p.months);
    while ((next < p.today || next > p.lastBookable) && next >= p.firstMonth && next < end) next = addDays(next, amount > 0 ? 1 : -1);
    if (next < p.firstMonth || next >= end || next > p.lastBookable) return;
    setActiveDate(next);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`button[data-date="${next}"]`)?.focus());
  }

  return <div className={`calendar-grid ${p.loading ? "is-loading" : ""}`} aria-busy={p.loading}>{Array.from({ length: p.months }, (_, i) => <Month key={i} month={addMonths(p.firstMonth, i)} {...p} activeDate={visibleActiveDate} hoverDate={hoverDate} onHover={setHoverDate} moveFocus={moveFocus} />)}</div>;
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

"use client";

import { addDays, type IsoDate } from "@/lib/dates";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(month: IsoDate, n: number): IsoDate {
  const y = +month.slice(0, 4);
  const m = +month.slice(5, 7) - 1 + n;
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

interface Props {
  firstMonth: IsoDate;
  months: number;
  today: IsoDate;
  lastBookable: IsoDate;
  blocked: ReadonlySet<IsoDate>;
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
  loading: boolean;
  onSelect: (date: IsoDate) => void;
}

/** Calendário de N meses. Noite ocupada = dia riscado (ainda pode ser dia de saída). */
export function AvailabilityCalendar(p: Props) {
  return (
    <div className={`grid gap-8 md:grid-cols-2 ${p.loading ? "opacity-60" : ""}`} aria-busy={p.loading}>
      {Array.from({ length: p.months }, (_, i) => (
        <Month key={i} month={addMonths(p.firstMonth, i)} {...p} />
      ))}
    </div>
  );
}

function Month({ month, today, lastBookable, blocked, checkIn, checkOut, onSelect }: Props & { month: IsoDate }) {
  const firstWeekday = new Date(`${month}T00:00:00Z`).getUTCDay();
  const next = addMonths(month, 1);
  const days: IsoDate[] = [];
  for (let d = month; d < next; d = addDays(d, 1)) days.push(d);

  return (
    <div>
      <p className="mb-3 text-center font-medium capitalize">
        {MONTHS[+month.slice(5, 7) - 1]} {month.slice(0, 4)}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm" role="grid">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 text-xs text-muted" role="columnheader">
            {w}
          </div>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const past = d < today || d > lastBookable;
          const isBlocked = blocked.has(d);
          const isStart = d === checkIn;
          const isEnd = d === checkOut;
          const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
          const state = isStart || isEnd ? "selected" : inRange ? "range" : isBlocked ? "blocked" : "free";
          const label = `${+d.slice(8, 10)} de ${MONTHS[+d.slice(5, 7) - 1]}${isBlocked ? ", ocupado" : ""}${isStart ? ", entrada" : ""}${isEnd ? ", saída" : ""}`;
          return (
            <button
              key={d}
              type="button"
              disabled={past}
              onClick={() => onSelect(d)}
              aria-label={label}
              aria-pressed={isStart || isEnd}
              data-date={d}
              data-state={past ? "past" : state}
              className={[
                "mx-auto flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                past && "cursor-not-allowed text-black/25",
                !past && state === "free" && "hover:bg-sand",
                !past && state === "blocked" && "text-black/35 line-through decoration-black/40",
                state === "range" && "rounded-none bg-forest/10",
                state === "selected" && "bg-forest font-semibold text-white",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {+d.slice(8, 10)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

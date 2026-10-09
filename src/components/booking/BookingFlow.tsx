"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { reserve, type ReserveState } from "@/app/reservar/actions";
import type { BookingRules } from "@/config/property";
import { addDays, formatBRL, formatDateBR, isIsoDate, nightsBetween, type IsoDate } from "@/lib/dates";
import { isStayFree, quoteStay } from "@/modules/booking/domain";
import { AvailabilityCalendar, addMonths, monthStart } from "./AvailabilityCalendar";

interface Props {
  today: IsoDate;
  rules: BookingRules;
  initial: { checkIn: string | null; checkOut: string | null; guests: number };
}

const MONTHS_SHOWN = 2;

export function BookingFlow({ today, rules, initial }: Props) {
  const lastBookable = addDays(today, rules.bookingWindowDays);
  const validInitialIn = isIsoDate(initial.checkIn) && initial.checkIn >= today ? initial.checkIn : null;
  const validInitialOut =
    validInitialIn && isIsoDate(initial.checkOut) && initial.checkOut > validInitialIn ? initial.checkOut : null;

  const [checkIn, setCheckIn] = useState<IsoDate | null>(validInitialIn);
  const [checkOut, setCheckOut] = useState<IsoDate | null>(validInitialOut);
  const [guests, setGuests] = useState(Math.min(Math.max(initial.guests || 2, 1), rules.maxGuests));
  const [firstMonth, setFirstMonth] = useState(monthStart(validInitialIn ?? today));
  const [blocked, setBlocked] = useState<Set<IsoDate>>(new Set());
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [state, formAction, pending] = useActionState<ReserveState, FormData>(reserve, {});
  const availabilityKey = `${firstMonth}|${state.attempt ?? 0}|${retryKey}`;
  const loading = loadedKey !== availabilityKey;

  // Busca as noites ocupadas dos meses visíveis (e de novo após uma tentativa recusada).
  useEffect(() => {
    const controller = new AbortController();
    const from = firstMonth;
    const to = addMonths(firstMonth, MONTHS_SHOWN);
    fetch(`/api/availability?from=${from}&to=${to}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data: { blockedNights: IsoDate[] }) => {
        setLoadFailed(false);
        setBlocked((prev) => {
          const next = new Set([...prev].filter((d) => d < from || d >= to));
          for (const d of data.blockedNights) next.add(d);
          return next;
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLoadFailed(true);
          setHint("Não conseguimos carregar a disponibilidade.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(availabilityKey);
      });
    return () => controller.abort();
  }, [firstMonth, availabilityKey]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const stayFree = checkIn && checkOut ? isStayFree(checkIn, checkOut, blocked) : false;
  const quote = useMemo(() => (checkIn && checkOut ? quoteStay(checkIn, checkOut, rules) : null), [checkIn, checkOut, rules]);
  const ready = Boolean(checkIn && checkOut && stayFree && nights >= rules.minNights && !loading);

  function select(d: IsoDate) {
    setHint(null);
    if (checkIn && !checkOut && d > checkIn) {
      if (isStayFree(checkIn, d, blocked)) {
        if (nightsBetween(checkIn, d) < rules.minNights) {
          setHint(`O mínimo é de ${rules.minNights} noites. Escolha a saída a partir de ${formatDateBR(addDays(checkIn, rules.minNights))}.`);
          return;
        }
        setCheckOut(d);
        return;
      }
      if (blocked.has(d)) {
        setHint("Há noites ocupadas nesse intervalo. Escolha outra data de saída.");
        return;
      }
    }
    if (blocked.has(d)) {
      setHint("Essa noite já está reservada.");
      return;
    }
    setCheckIn(d);
    setCheckOut(null);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="cal-title" className="booking-calendar-card">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 id="cal-title" className="font-display text-2xl text-forest">
            {!checkIn ? "Escolha a entrada" : !checkOut ? "Agora, a saída" : "Suas datas"}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFirstMonth(addMonths(firstMonth, -1))}
              disabled={loading || firstMonth <= monthStart(today)}
              className="calendar-nav-button"
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setFirstMonth(addMonths(firstMonth, 1))}
              disabled={loading || addMonths(firstMonth, MONTHS_SHOWN) > lastBookable}
              className="calendar-nav-button"
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>
        </div>
        <div className="relative">
        <AvailabilityCalendar
          firstMonth={firstMonth}
          months={MONTHS_SHOWN}
          today={today}
          lastBookable={lastBookable}
          blocked={blocked}
          checkIn={checkIn}
          checkOut={checkOut}
          loading={loading}
          onNavigate={(delta) => {
            const target = addMonths(firstMonth, delta);
            if (target < monthStart(today) || target > lastBookable) return;
            setFirstMonth(target);
          }}
          onSelect={select}
        />
        {loading && <div className="calendar-skeleton" aria-hidden><span /><span /><span /><span /><span /><span /></div>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-forest" /> Selecionado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="line-through">12</span> Ocupado
          </span>
          <span>A partir de {formatBRL(rules.nightlyRateCents)}/noite</span>
          <span>Mínimo de {rules.minNights} noites</span>
        </div>
        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-danger">
          {hint}
        </p>
        {loadFailed && <button type="button" className="retry-button" onClick={() => { setHint(null); setLoadFailed(false); setRetryKey((key) => key + 1); }}>Tentar de novo</button>}
      </section>

      <aside id="booking-form" className="booking-summary-card">
        <dl className="grid grid-cols-2 gap-3 border-b border-sand pb-4 text-sm">
          <div>
            <dt className="text-muted">Entrada</dt>
            <dd className="font-medium">{checkIn ? formatDateBR(checkIn) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Saída</dt>
            <dd className="font-medium">{checkOut ? formatDateBR(checkOut) : "—"}</dd>
          </div>
        </dl>

        <label className="mt-4 grid gap-1 text-sm">
          <span className="text-muted">Hóspedes</span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="rounded-lg border border-sand px-3 py-2"
          >
            {Array.from({ length: rules.maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "hóspede" : "hóspedes"}
              </option>
            ))}
          </select>
        </label>

        {checkIn && checkOut && !stayFree && !loading && (
          <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">Essas datas não estão mais disponíveis. Escolha outras no calendário.</p>
        )}

        {quote && stayFree && (
          <dl className="mt-4 space-y-1.5 border-b border-sand pb-4 text-sm" data-testid="quote">
            <div className="flex justify-between">
              <dt>
                {formatBRL(quote.nightlyRateCents)} × {quote.nights} noites
              </dt>
              <dd>{formatBRL(quote.lodgingCents)}</dd>
            </div>
            {quote.cleaningFeeCents > 0 && (
              <div className="flex justify-between">
                <dt>Taxa de limpeza</dt>
                <dd>{formatBRL(quote.cleaningFeeCents)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatBRL(quote.totalCents)}</dd>
            </div>
          </dl>
        )}

        {ready ? (
          <form action={formAction} className="mt-4 grid gap-3" noValidate>
            <input type="hidden" name="checkIn" value={checkIn ?? ""} />
            <input type="hidden" name="checkOut" value={checkOut ?? ""} />
            <input type="hidden" name="guests" value={guests} />
            <div aria-hidden className="absolute -left-[9999px]">
              <label>
                Não preencha
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <Field name="guestName" label="Nome completo" autoComplete="name" error={state.fieldErrors?.guestName} />
            <Field name="guestEmail" label="E-mail" type="email" autoComplete="email" error={state.fieldErrors?.guestEmail} />
            <Field name="guestPhone" label="WhatsApp" type="tel" autoComplete="tel" error={state.fieldErrors?.guestPhone} />
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Observações (opcional)</span>
              <textarea name="notes" rows={2} className="rounded-lg border border-sand px-3 py-2" />
            </label>
            {state.error && (
              <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-forest px-5 py-3 font-medium text-white hover:bg-forest-deep disabled:opacity-60"
            >
              {pending ? "Reservando suas datas…" : "Ir para o pagamento"}
            </button>
            <p className="text-xs text-muted">
              As datas ficam reservadas para você por {rules.holdMinutes} minutos enquanto conclui o pagamento no Mercado Pago (Pix ou cartão).
            </p>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">Selecione a entrada e a saída no calendário para continuar.</p>
        )}
      </aside>
      {quote && stayFree && <div className="mobile-booking-bar"><div><small>Total</small><strong>{formatBRL(quote.totalCents)}</strong></div><button type="button" onClick={() => document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Continuar</button></div>}
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; autoComplete?: string; error?: string }) {
  const id = `f-${props.name}`;
  return (
    <label htmlFor={id} className="grid gap-1 text-sm">
      <span className="text-muted">{props.label}</span>
      <input
        id={id}
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        required
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? `${id}-err` : undefined}
        className={`rounded-lg border px-3 py-2 ${props.error ? "border-danger" : "border-sand"}`}
      />
      {props.error && (
        <span id={`${id}-err`} className="text-xs text-danger">
          {props.error}
        </span>
      )}
    </label>
  );
}

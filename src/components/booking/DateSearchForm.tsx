import { bookingRules } from "@/config/property";

function FieldIcon({ type }: { type: "date" | "guests" }) {
  return type === "date" ? <svg aria-hidden viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></svg> : <svg aria-hidden viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8" /></svg>;
}

export function DateSearchForm() {
  return <div className="booking-search-shell"><form action="/reservar" method="get" className="booking-search">
    <label><FieldIcon type="date" /><span><small>Check-in</small><input type="date" name="entrada" /></span></label>
    <label><FieldIcon type="date" /><span><small>Check-out</small><input type="date" name="saida" /></span></label>
    <label><FieldIcon type="guests" /><span><small>Hóspedes</small><select name="hospedes" defaultValue="4">{Array.from({ length: bookingRules.maxGuests }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "hóspede" : "hóspedes"}</option>)}</select></span></label>
    <button type="submit" className="availability-button">Ver disponibilidade <span aria-hidden>→</span></button>
  </form><p className="trust-strip"><span>◇</span> Reserva segura <i>•</i> Pagamento via Mercado Pago <i>•</i> Confirmação imediata</p></div>;
}

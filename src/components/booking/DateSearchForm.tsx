import { bookingRules } from "@/config/property";

/**
 * Busca de datas do topo da home. É um <form method="get"> comum:
 * funciona até sem JavaScript e leva para /reservar com as datas preenchidas.
 */
export function DateSearchForm() {
  return (
    <form
      action="/reservar"
      method="get"
      className="grid gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end sm:p-5"
    >
      <label className="grid gap-1 text-xs font-medium text-muted">
        Entrada
        <input type="date" name="entrada" className="rounded-lg border border-sand px-3 py-2 text-base text-ink" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted">
        Saída
        <input type="date" name="saida" className="rounded-lg border border-sand px-3 py-2 text-base text-ink" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted">
        Hóspedes
        <select name="hospedes" defaultValue="4" className="rounded-lg border border-sand px-3 py-2 text-base text-ink">
          {Array.from({ length: bookingRules.maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "hóspede" : "hóspedes"}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-forest px-5 py-2.5 font-medium text-white hover:bg-forest-deep">
        Ver disponibilidade
      </button>
      <p className="text-xs text-muted sm:col-span-4">
        Mínimo de {bookingRules.minNights} noites · Pagamento via Mercado Pago (Pix ou cartão) · Confirmação por e-mail
      </p>
    </form>
  );
}

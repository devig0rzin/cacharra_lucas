import type { Metadata } from "next";
import { Suspense } from "react";
import { property } from "@/config/property";
import { formatBRL, formatDateBR, todayIn } from "@/lib/dates";
import type { BookingStatus } from "@/modules/booking/domain";
import { requireAdmin } from "@/server/admin-auth";
import { getServices } from "@/server/container";
import { env } from "@/server/env";
import { BlockDatesForm } from "./BlockDatesForm";
import { cancelBooking, logout, syncNow } from "./actions";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

const statusLabel: Record<BookingStatus, { text: string; className: string }> = {
  confirmed: { text: "Confirmada", className: "bg-forest/10 text-forest" },
  pending_payment: { text: "Aguardando pagamento", className: "bg-sun/15 text-ink" },
  payment_conflict: { text: "Pagou sem datas — reembolsar", className: "bg-danger/10 text-danger" },
  cancelled: { text: "Cancelada", className: "bg-black/5 text-muted" },
  expired: { text: "Expirada", className: "bg-black/5 text-muted" },
};

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: property.timeZone, dateStyle: "short", timeStyle: "short" }) : "nunca";

async function Dashboard() {
  await requireAdmin();
  const { bookings, channels, channelRepo } = await getServices();
  const e = env();
  const [upcoming, blocks, lastAirbnb] = await Promise.all([
    bookings.listUpcoming(),
    channelRepo.listBlocks(todayIn(property.timeZone)),
    channelRepo.lastRun("airbnb"),
  ]);
  const exportUrl = `${e.SITE_URL}/api/calendario/${e.ICAL_EXPORT_TOKEN}.ics`;

  return (
    <div className="grid gap-8">
      <section className="admin-card">
        <h2 className="font-display text-2xl text-forest">Próximas reservas</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-muted">Nenhuma reserva futura ainda. Elas aparecem aqui assim que alguém reservar pelo site.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="admin-table w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-3 font-normal">Código</th>
                  <th className="py-2 pr-3 font-normal">Datas</th>
                  <th className="py-2 pr-3 font-normal">Hóspede</th>
                  <th className="py-2 pr-3 font-normal">Valor</th>
                  <th className="py-2 pr-3 font-normal">Situação</th>
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id} className="border-t border-sand align-top">
                    <td className="py-3 pr-3 font-medium">{b.code}</td>
                    <td className="py-3 pr-3">
                      {formatDateBR(b.checkIn)} → {formatDateBR(b.checkOut)}
                    </td>
                    <td className="py-3 pr-3">
                      {b.source === "manual" ? (
                        <span className="text-muted">Bloqueio{b.notes ? `: ${b.notes}` : ""}</span>
                      ) : (
                        <>
                          {b.guestName} · {b.guests} hósp.
                          <br />
                          <a className="text-muted underline" href={`https://wa.me/55${b.guestPhone.replace(/^\+?55/, "")}`}>
                            {b.guestPhone}
                          </a>{" "}
                          <span className="text-muted">{b.guestEmail}</span>
                        </>
                      )}
                    </td>
                    <td className="py-3 pr-3">{formatBRL(b.totalCents)}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusLabel[b.status].className}`}>{statusLabel[b.status].text}</span>
                    </td>
                    <td className="py-3 text-right">
                      {b.status !== "cancelled" && (
                        <form action={cancelBooking}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="text-xs text-danger underline">Cancelar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2 className="font-display text-2xl text-forest">Bloquear datas</h2>
        <p className="mt-1 text-sm text-muted">Para uso próprio ou manutenção. O bloqueio também vai para o Airbnb.</p>
        <div className="mt-4">
          <BlockDatesForm />
        </div>
      </section>

      <section className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-forest">Airbnb</h2>
          <form action={syncNow}>
            <button className="rounded-lg border border-sand px-4 py-2 text-sm">Sincronizar agora</button>
          </form>
        </div>
        {channels.configuredChannels.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Ainda não conectado. Copie o link “Exportar calendário” do anúncio no Airbnb e coloque em <code>AIRBNB_ICAL_URL</code>.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Última sincronização: {fmtTime(lastAirbnb?.finishedAt ?? null)}{" "}
            {lastAirbnb && (lastAirbnb.ok ? `· ${lastAirbnb.events} bloqueios` : <span className="text-danger">· falhou: {lastAirbnb.error}</span>)}
          </p>
        )}
        <p className="mt-4 text-sm">Link para colar no Airbnb (Calendário → Conectar a outro site):</p>
        <code className="mt-1 block break-all rounded-lg bg-cream p-3 text-xs">{exportUrl}</code>
        {blocks.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {blocks.map((bl) => (
              <li key={`${bl.channel}-${bl.externalUid}`}>
                {formatDateBR(bl.startDate)} → {formatDateBR(bl.endDate)} <span className="text-muted">· {bl.summary ?? bl.channel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <main id="conteudo" className="admin-page site-container">
      <div className="admin-page-heading">
        <h1 className="font-display text-3xl text-forest">Painel · {property.name}</h1>
        <form action={logout}>
          <button className="text-sm text-muted underline">Sair</button>
        </form>
      </div>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

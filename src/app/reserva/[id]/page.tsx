import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/booking/AutoRefresh";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { property } from "@/config/property";
import { formatBRL, formatDateBR } from "@/lib/dates";
import { getServices } from "@/server/container";

export const metadata: Metadata = { title: "Sua reserva", robots: { index: false } };

async function Status({ params }: Pick<PageProps<"/reserva/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const { bookings } = await getServices();
  const b = await bookings.getById(id);
  if (!b) notFound();

  const details = (
    <dl className="status-details">
      <div>
        <dt className="text-muted">Código</dt>
        <dd className="font-medium" data-testid="booking-code">{b.code}</dd>
      </div>
      <div>
        <dt className="text-muted">Hóspedes</dt>
        <dd className="font-medium">{b.guests}</dd>
      </div>
      <div>
        <dt className="text-muted">Entrada</dt>
        <dd className="font-medium">
          {formatDateBR(b.checkIn)} a partir das {property.checkInTime}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Saída</dt>
        <dd className="font-medium">
          {formatDateBR(b.checkOut)} até as {property.checkOutTime}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Total</dt>
        <dd className="font-medium">{formatBRL(b.totalCents)}</dd>
      </div>
    </dl>
  );

  switch (b.status) {
    case "confirmed":
      return (
        <section className="status-card status-confirmed">
          <div className="status-icon" aria-hidden>✓</div>
          <h1 className="font-display text-4xl text-forest" data-testid="booking-status">Reserva confirmada</h1>
          <p className="mt-2 text-muted">Enviamos os detalhes para {b.guestEmail}. Até breve!</p>
          {details}
          <div className="status-actions"><a href={property.address.mapsUrl} className="button-primary">Como chegar</a><a href={`https://wa.me/${property.contact.whatsapp}`} className="text-link">Falar pelo WhatsApp</a></div>
        </section>
      );
    case "pending_payment":
      return (
        <section className="status-card">
          <AutoRefresh seconds={5} />
          <h1 className="font-display text-4xl text-forest" data-testid="booking-status">Aguardando pagamento</h1>
          <p className="mt-2 text-muted">
            Suas datas estão reservadas até {b.holdExpiresAt ? new Date(b.holdExpiresAt).toLocaleTimeString("pt-BR", { timeZone: property.timeZone, hour: "2-digit", minute: "2-digit" }) : "—"}.
            Se você já pagou, a confirmação aparece aqui em instantes.
          </p>
          {details}
        </section>
      );
    case "payment_conflict":
      return (
        <section className="status-card">
          <h1 className="font-display text-4xl text-forest" data-testid="booking-status">Recebemos seu pagamento</h1>
          <p className="mt-2 text-muted">
            O pagamento chegou depois do prazo e essas datas foram ocupadas. Vamos entrar em contato para remarcar ou devolver o valor.
          </p>
          {details}
        </section>
      );
    default:
      return (
        <section className="status-card">
          <h1 className="font-display text-4xl text-forest" data-testid="booking-status">Reserva não concluída</h1>
          <p className="mt-2 text-muted">O prazo para pagamento terminou e as datas foram liberadas.</p>
          <a href="/reservar" className="mt-6 inline-block rounded-full bg-forest px-5 py-2.5 font-medium text-white">
            Fazer nova reserva
          </a>
        </section>
      );
  }
}

export default function ReservaPage(props: PageProps<"/reserva/[id]">) {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="status-page site-container">
        <Suspense fallback={<p className="status-card text-muted">Carregando sua reserva…</p>}>
          <Status params={props.params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

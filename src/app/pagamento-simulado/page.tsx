import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { formatBRL, formatDateBR } from "@/lib/dates";
import { getServices } from "@/server/container";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Pagamento simulado", robots: { index: false } };

async function approve(formData: FormData) {
  "use server";
  if (env().PAYMENTS_PROVIDER !== "mock") notFound();
  const id = String(formData.get("id"));
  const { bookings } = await getServices();
  await bookings.confirmPayment(id, "mock", `mock-${id}`);
  redirect(`/reserva/${id}`);
}

async function giveUp(formData: FormData) {
  "use server";
  if (env().PAYMENTS_PROVIDER !== "mock") notFound();
  const id = String(formData.get("id"));
  redirect(`/reserva/${id}`);
}

async function Checkout({ searchParams }: Pick<PageProps<"/pagamento-simulado">, "searchParams">) {
  const sp = await searchParams;
  if (env().PAYMENTS_PROVIDER !== "mock") notFound();
  const id = typeof sp.reserva === "string" ? sp.reserva : "";
  const { bookings } = await getServices();
  const b = await bookings.getById(id);
  if (!b) notFound();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <p className="rounded-lg bg-sun/15 p-3 text-sm text-ink">
        Modo de desenvolvimento: esta tela substitui o Mercado Pago. Em produção o hóspede paga com Pix ou cartão na página do Mercado Pago.
      </p>
      <dl className="mt-5 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Reserva</dt>
          <dd>{b.code}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Datas</dt>
          <dd>
            {formatDateBR(b.checkIn)} → {formatDateBR(b.checkOut)}
          </dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatBRL(b.totalCents)}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={approve}>
          <input type="hidden" name="id" value={b.id} />
          <button className="rounded-lg bg-forest px-5 py-2.5 font-medium text-white">Aprovar pagamento</button>
        </form>
        <form action={giveUp}>
          <input type="hidden" name="id" value={b.id} />
          <button className="rounded-lg border border-sand px-5 py-2.5">Voltar sem pagar</button>
        </form>
      </div>
    </div>
  );
}

export default function MockCheckoutPage(props: PageProps<"/pagamento-simulado">) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <h1 className="mb-6 font-display text-3xl text-forest">Pagamento simulado</h1>
      <Suspense fallback={<p className="text-muted">Carregando…</p>}>
        <Checkout searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

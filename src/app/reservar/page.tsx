import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { bookingRules, property } from "@/config/property";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Reservar" };

async function Flow({ searchParams }: Pick<PageProps<"/reservar">, "searchParams">) {
  await connection(); // "hoje" é calculado a cada requisição
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return (
    <BookingFlow
      today={todayIn(property.timeZone)}
      rules={bookingRules}
      initial={{ checkIn: one(sp.entrada), checkOut: one(sp.saida), guests: Number(one(sp.hospedes)) || 2 }}
    />
  );
}

export default function ReservarPage(props: PageProps<"/reservar">) {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="booking-page site-container">
        <p className="section-kicker">Sua próxima pausa começa aqui</p>
        <h1 className="font-display text-4xl text-forest md:text-5xl">Reserve sua estadia</h1>
        <p className="mt-3 max-w-3xl text-muted">
          Entrada a partir das {property.checkInTime} · Saída até as {property.checkOutTime} · Mínimo de {bookingRules.minNights} noites
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-[1.75rem] bg-white/60" />}>
            <Flow searchParams={props.searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

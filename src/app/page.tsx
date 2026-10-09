import Link from "next/link";
import { DateSearchForm } from "@/components/booking/DateSearchForm";
import { HeroLandscape } from "@/components/site/HeroLandscape";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { property } from "@/config/property";

/** Placeholder de foto — trocar por next/image com as fotos reais. */
function PhotoSlot({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      className={`flex items-end rounded-xl bg-[linear-gradient(135deg,#7d9a78,#3f6448)] p-3 text-sm text-white/90 ${className}`}
    >
      {label}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main>
        {/* Topo: imagem forte + busca de datas sem precisar rolar */}
        <section className="relative isolate flex min-h-[640px] flex-col justify-end pb-10 pt-28 sm:min-h-[720px]">
          <HeroLandscape />
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h1 className="max-w-2xl font-display text-4xl leading-[1.05] text-white sm:text-6xl">{property.tagline}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">{property.description}</p>
            <p className="mt-3 text-sm text-white/80">{property.address.distanceNote}</p>
            <div className="mt-8">
              <DateSearchForm />
            </div>
          </div>
        </section>

        <section id="a-chacara" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
          <PhotoSlot label="Vídeo de apresentação" className="aspect-video" />
          <div>
            <h2 className="font-display text-3xl text-forest sm:text-4xl">Bem-vindo à {property.name}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{property.description}</p>
            <Link href="/reservar" className="mt-6 inline-block rounded-full bg-forest px-5 py-2.5 font-medium text-white hover:bg-forest-deep">
              Ver datas disponíveis
            </Link>
          </div>
        </section>

        <section id="estrutura" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl text-forest sm:text-4xl">Destaques da sua estadia</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {property.highlights.map((h) => (
                <article key={h.title}>
                  <PhotoSlot label={h.title} className="aspect-[4/3]" />
                  <h3 className="mt-3 font-medium">{h.title}</h3>
                  <p className="mt-1 text-sm text-muted">{h.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="galeria" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl text-forest sm:text-4xl">Galeria</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {["Piscina", "Área gourmet", "Quarto", "Jardim", "Vista", "Sala", "Fogo de chão", "Pôr do sol"].map((l, i) => (
              <PhotoSlot key={l} label={l} className={i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"} />
            ))}
          </div>
        </section>

        <section id="localizacao" className="bg-white py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl text-forest sm:text-4xl">Localização</h2>
              <p className="mt-4 text-lg text-muted">
                {property.address.line} — {property.address.city}
              </p>
              <p className="mt-1 text-muted">{property.address.distanceNote}</p>
              <a href={property.address.mapsUrl} className="mt-4 inline-block font-medium text-forest underline underline-offset-4">
                Abrir no Google Maps
              </a>
            </div>
            <div>
              <h2 className="font-display text-3xl text-forest sm:text-4xl">Regras da casa</h2>
              <ul className="mt-4 space-y-2 text-muted">
                {property.houseRules.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </>
  );
}

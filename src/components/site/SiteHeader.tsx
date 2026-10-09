import Link from "next/link";
import { property } from "@/config/property";

const nav = [
  { href: "/#a-chacara", label: "A chácara" },
  { href: "/#estrutura", label: "Estrutura" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#localizacao", label: "Localização" },
];

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-20" : "border-b border-sand bg-cream"}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className={`font-display text-xl leading-none ${overlay ? "text-white" : "text-forest"}`}>
          {property.name}
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm ${overlay ? "text-white/85 hover:text-white" : "text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/reservar"
          className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-deep"
        >
          Reservar
        </Link>
      </div>
    </header>
  );
}

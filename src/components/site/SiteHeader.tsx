import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { MobileNavigation } from "./MobileNavigation";

const nav = [
  { href: "/#a-chacara", label: "A Chácara" },
  { href: "/#acomodacoes", label: "Acomodações" },
  { href: "/#experiencias", label: "Experiências" },
  { href: "/#localizacao", label: "Localização" },
  { href: "/#galeria", label: "Galeria" },
] as const;

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return <header className={overlay ? "site-header site-header-overlay" : "site-header site-header-solid"}>
    <div className="site-header-inner">
      <BrandMark />
      <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">{nav.map((item) => <Link key={item.href} href={item.href} className="nav-link">{item.label}</Link>)}</nav>
      <Link href="/reservar" className="button-primary hidden md:inline-flex">Reservar agora</Link>
      <MobileNavigation items={nav} />
    </div>
  </header>;
}

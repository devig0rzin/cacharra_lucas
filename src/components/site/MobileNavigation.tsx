"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface NavItem { href: string; label: string }

export function MobileNavigation({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const trigger = buttonRef.current;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKeyDown); (previous ?? trigger)?.focus(); };
  }, [open]);

  return <div className="md:hidden">
    <button ref={buttonRef} type="button" className="menu-trigger" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((value) => !value)}><span /><span /><span /></button>
    {open && <div className="mobile-menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={panelRef} id="mobile-menu" className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Navegação">
        <div className="flex items-center justify-between"><p className="font-display text-2xl text-forest">Menu</p><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar menu">×</button></div>
        <nav aria-label="Menu móvel" className="mt-8 grid">{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="mobile-menu-link">{item.label}</Link>)}</nav>
        <Link href="/reservar" onClick={() => setOpen(false)} className="button-primary mt-auto">Reservar agora</Link>
      </div>
    </div>}
  </div>;
}

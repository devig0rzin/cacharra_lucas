"use client";

import { useEffect, useState } from "react";
import { property } from "@/config/property";

/**
 * Botão flutuante do WhatsApp. No celular ele só aparece depois que o cartão
 * de reserva do topo sai da tela, para nunca cobrir o formulário de datas.
 */
export function WhatsAppButton() {
  // Começa escondido: evita piscar por cima do formulário antes da primeira medição.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const card = document.querySelector(".booking-overlap");
    const mobile = window.matchMedia("(max-width: 767px)");
    if (!card) {
      queueMicrotask(() => setHidden(false));
      return;
    }
    let cardVisible = true;
    const update = () => setHidden(mobile.matches && cardVisible);
    const io = new IntersectionObserver(([entry]) => {
      cardVisible = entry.isIntersecting;
      update();
    });
    io.observe(card);
    mobile.addEventListener("change", update);
    return () => {
      io.disconnect();
      mobile.removeEventListener("change", update);
    };
  }, []);

  return (
    <a
      href={`https://wa.me/${property.contact.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre a ${property.name}.`)}`}
      className="whatsapp-button"
      aria-label="Falar no WhatsApp"
      data-hidden={hidden || undefined}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z" />
        <path d="M9 9.5c.4 2.2 2.3 4.1 4.5 4.5" />
      </svg>
      <span className="whatsapp-label">WhatsApp</span>
    </a>
  );
}

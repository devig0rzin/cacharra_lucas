import { property } from "@/config/property";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${property.contact.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre a ${property.name}.`)}`}
      className="whatsapp-button"
      aria-label="Falar no WhatsApp"
    >
      <span aria-hidden>✦</span> WhatsApp
    </a>
  );
}

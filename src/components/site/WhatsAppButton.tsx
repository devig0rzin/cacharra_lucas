import { property } from "@/config/property";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${property.contact.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre a ${property.name}.`)}`}
      className="fixed bottom-4 right-4 z-30 rounded-full bg-[#1f8a4c] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#18723e]"
      aria-label="Falar no WhatsApp"
    >
      WhatsApp
    </a>
  );
}

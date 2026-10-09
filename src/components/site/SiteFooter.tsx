import { property } from "@/config/property";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-forest-deep text-white/80">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg text-white">{property.name}</p>
          <p className="mt-1">{property.address.distanceNote}</p>
        </div>
        <div>
          <p className="text-white">Contato</p>
          <a className="mt-1 block hover:text-white" href={`https://wa.me/${property.contact.whatsapp}`}>
            WhatsApp
          </a>
          <a className="block hover:text-white" href={`mailto:${property.contact.email}`}>
            {property.contact.email}
          </a>
          <a className="block hover:text-white" href={property.contact.instagram}>
            Instagram
          </a>
        </div>
        <div>
          <p className="text-white">Pagamento seguro</p>
          <p className="mt-1">Pix e cartão pelo Mercado Pago. Confirmação por e-mail.</p>
        </div>
      </div>
    </footer>
  );
}

import { property } from "@/config/property";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-forest-deep text-white/80">
      <div className="site-container grid gap-8 py-12 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-white">{property.name}</p>
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
          <div className="mt-4 flex gap-4 text-xs"><span>Privacidade</span><span>Termos</span></div>
        </div>
      </div>
    </footer>
  );
}

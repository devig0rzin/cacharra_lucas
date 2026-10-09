import { formatBRL, formatDateBR } from "@/lib/dates";
import type { Booking } from "@/modules/booking/domain";
import type { BookingNotifier } from "@/modules/booking/service";
import type { ChannelNotifier } from "@/modules/channels/service";
import type { EmailSender } from "./email";

interface PropertyInfo {
  name: string;
  checkInTime: string;
  checkOutTime: string;
  addressLine: string;
  mapsUrl: string;
  whatsapp: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, rows: Array<[string, string]>, footer: string): string {
  const body = rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#5b6b5f">${esc(k)}</td><td style="padding:6px 12px"><strong>${esc(v)}</strong></td></tr>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2d24">
<h2 style="color:#1f4d33">${esc(title)}</h2><table style="border-collapse:collapse">${body}</table>
<p style="color:#5b6b5f">${esc(footer)}</p></div>`;
}

const asText = (title: string, rows: Array<[string, string]>, footer: string) =>
  [title, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", footer].join("\n");

/** Avisos por e-mail para hóspede e proprietário. */
export class EmailNotifier implements BookingNotifier, ChannelNotifier {
  constructor(
    private readonly email: EmailSender,
    private readonly ownerEmail: string,
    private readonly property: PropertyInfo,
    private readonly siteUrl: string,
  ) {}

  private summary(b: Booking): Array<[string, string]> {
    return [
      ["Código", b.code],
      ["Entrada", `${formatDateBR(b.checkIn)} a partir das ${this.property.checkInTime}`],
      ["Saída", `${formatDateBR(b.checkOut)} até as ${this.property.checkOutTime}`],
      ["Hóspedes", String(b.guests)],
      ["Valor pago", formatBRL(b.totalCents)],
    ];
  }

  async bookingConfirmed(b: Booking): Promise<void> {
    const guestRows: Array<[string, string]> = [
      ...this.summary(b),
      ["Endereço", this.property.addressLine],
      ["Como chegar", this.property.mapsUrl],
    ];
    const guestTitle = `Reserva confirmada — ${this.property.name}`;
    const guestFooter = `Dúvidas? Fale com a gente no WhatsApp: https://wa.me/${this.property.whatsapp}`;
    const ownerRows: Array<[string, string]> = [
      ...this.summary(b),
      ["Hóspede", b.guestName],
      ["E-mail", b.guestEmail],
      ["Telefone", b.guestPhone],
      ["Observações", b.notes ?? "—"],
    ];
    const ownerTitle = `Nova reserva ${b.code} (${formatDateBR(b.checkIn)} → ${formatDateBR(b.checkOut)})`;
    const ownerFooter = `Painel: ${this.siteUrl}/admin`;

    await Promise.all([
      this.email.send({
        to: b.guestEmail,
        subject: guestTitle,
        html: layout(guestTitle, guestRows, guestFooter),
        text: asText(guestTitle, guestRows, guestFooter),
        replyTo: this.ownerEmail,
      }),
      this.email.send({
        to: this.ownerEmail,
        subject: ownerTitle,
        html: layout(ownerTitle, ownerRows, ownerFooter),
        text: asText(ownerTitle, ownerRows, ownerFooter),
      }),
    ]);
  }

  async paymentConflict(b: Booking): Promise<void> {
    const title = `⚠️ Pagamento recebido para datas já ocupadas — reserva ${b.code}`;
    const rows: Array<[string, string]> = [...this.summary(b), ["Hóspede", b.guestName], ["E-mail", b.guestEmail], ["Telefone", b.guestPhone]];
    const footer = "O pagamento chegou depois do prazo e as datas já tinham sido reservadas. Entre em contato com o hóspede e faça o reembolso pelo Mercado Pago.";
    await this.email.send({ to: this.ownerEmail, subject: title, html: layout(title, rows, footer), text: asText(title, rows, footer) });
  }

  async doubleBooking(b: Booking, channel: string): Promise<void> {
    const title = `⚠️ Possível reserva dupla com o ${channel} — ${b.code}`;
    const rows: Array<[string, string]> = [...this.summary(b), ["Hóspede", b.guestName], ["Telefone", b.guestPhone]];
    const footer = `O calendário do ${channel} tem uma reserva nas mesmas datas desta reserva do site. Verifique os dois lados e cancele uma delas.`;
    await this.email.send({ to: this.ownerEmail, subject: title, html: layout(title, rows, footer), text: asText(title, rows, footer) });
  }
}

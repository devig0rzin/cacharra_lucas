import type { Booking } from "@/modules/booking/domain";

export interface CheckoutSession {
  /** Para onde mandar o hóspede pagar. */
  url: string;
  /** Identificador do lado do provedor (ex.: id da preferência do Mercado Pago). */
  providerRef: string;
}

/** Resultado de um aviso (webhook) do provedor, já verificado e consultado. */
export type PaymentNotification =
  | { kind: "approved"; bookingId: string; paymentRef: string; amountCents: number }
  | { kind: "not_approved"; bookingId: string | null; paymentRef: string; status: string }
  | { kind: "ignored"; reason: string };

export interface PaymentProvider {
  readonly name: "mercadopago" | "mock";
  createCheckout(booking: Booking): Promise<CheckoutSession>;
  /** Lança InvalidWebhookSignatureError se o aviso não for autêntico. */
  handleWebhook(req: Request): Promise<PaymentNotification>;
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Assinatura do webhook inválida");
    this.name = "InvalidWebhookSignatureError";
  }
}

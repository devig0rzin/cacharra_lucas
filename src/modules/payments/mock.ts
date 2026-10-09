/**
 * Pagamento SIMULADO — para desenvolver e demonstrar sem conta no Mercado Pago.
 * O hóspede vai para /pagamento-simulado e clica em "Aprovar".
 * Nunca deve ficar ligado em produção (ver src/server/env.ts).
 */
import type { Booking } from "@/modules/booking/domain";
import type { CheckoutSession, PaymentNotification, PaymentProvider } from "./types";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  constructor(private readonly siteUrl: string) {}

  async createCheckout(booking: Booking): Promise<CheckoutSession> {
    return {
      url: `${this.siteUrl}/pagamento-simulado?reserva=${booking.id}`,
      providerRef: `mock-${booking.id}`,
    };
  }

  async handleWebhook(): Promise<PaymentNotification> {
    return { kind: "ignored", reason: "provedor simulado não usa webhook" };
  }
}

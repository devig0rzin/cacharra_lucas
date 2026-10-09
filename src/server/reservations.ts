/**
 * Casos de uso que atravessam módulos (reserva + pagamento).
 * Mantidos fora dos módulos para que cada módulo continue independente.
 */
import "server-only";
import type { BookingService, HoldRequest } from "@/modules/booking/service";
import type { PaymentProvider } from "@/modules/payments/types";

export async function startReservation(
  deps: { bookings: BookingService; payments: PaymentProvider },
  req: HoldRequest,
): Promise<{ bookingId: string; checkoutUrl: string }> {
  const { booking } = await deps.bookings.createHold(req);
  try {
    const checkout = await deps.payments.createCheckout(booking);
    await deps.bookings.attachPayment(booking.id, deps.payments.name, checkout.providerRef);
    return { bookingId: booking.id, checkoutUrl: checkout.url };
  } catch (err) {
    // Sem link de pagamento não faz sentido segurar as datas.
    await deps.bookings.cancel(booking.id);
    throw err;
  }
}

export type WebhookResult = { status: number; body: string };

export async function processPaymentWebhook(
  deps: { bookings: BookingService; payments: PaymentProvider },
  req: Request,
): Promise<WebhookResult> {
  const n = await deps.payments.handleWebhook(req);
  if (n.kind !== "approved") return { status: 200, body: n.kind };

  const booking = await deps.bookings.getById(n.bookingId);
  if (!booking) return { status: 200, body: "reserva não encontrada" };
  if (n.amountCents < booking.totalCents) {
    console.error(`[pagamento] valor pago (${n.amountCents}) menor que o da reserva ${booking.code} (${booking.totalCents})`);
    return { status: 200, body: "valor divergente" };
  }
  const outcome = await deps.bookings.confirmPayment(booking.id, deps.payments.name, n.paymentRef);
  return { status: 200, body: outcome };
}

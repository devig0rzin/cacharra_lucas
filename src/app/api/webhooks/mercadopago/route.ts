import { InvalidWebhookSignatureError } from "@/modules/payments/types";
import { getServices } from "@/server/container";
import { processPaymentWebhook } from "@/server/reservations";

/**
 * Avisos do Mercado Pago. Configure em "Suas integrações → Webhooks" com o
 * evento "Pagamentos" e copie a "assinatura secreta" para MP_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const services = await getServices();
  try {
    const result = await processPaymentWebhook(services, request);
    return new Response(result.body, { status: result.status });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return new Response("assinatura inválida", { status: 401 });
    console.error("[webhook mercadopago]", err);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return new Response("erro", { status: 500 });
  }
}

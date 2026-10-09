import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MercadoPagoProvider, verifyMercadoPagoSignature } from "@/modules/payments/mercadopago";
import { InvalidWebhookSignatureError } from "@/modules/payments/types";
import { processPaymentWebhook, startReservation } from "@/server/reservations";
import { holdRequest, setup } from "../helpers";

const SECRET = "segredo-do-webhook";

function sign(dataId: string, requestId: string, ts = "1728400000") {
  const v1 = createHmac("sha256", SECRET).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMercadoPagoSignature", () => {
  it("aceita assinatura correta", () => {
    expect(
      verifyMercadoPagoSignature({ signatureHeader: sign("123", "req-1"), requestId: "req-1", dataId: "123", secret: SECRET }),
    ).toBe(true);
  });

  it("recusa assinatura adulterada, ausente ou com outro id", () => {
    expect(verifyMercadoPagoSignature({ signatureHeader: sign("123", "req-1"), requestId: "req-1", dataId: "999", secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: null, requestId: "req-1", dataId: "123", secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: "ts=1,v1=abc", requestId: "req-1", dataId: "123", secret: SECRET })).toBe(false);
  });

  it("normaliza id alfanumérico para minúsculas", () => {
    expect(
      verifyMercadoPagoSignature({ signatureHeader: sign("abc123", "r"), requestId: "r", dataId: "ABC123", secret: SECRET }),
    ).toBe(true);
  });
});

/** Simula a API do Mercado Pago. */
function fakeMercadoPago(payment: { status: string; external_reference: string | null; transaction_amount: number }) {
  const calls: Array<{ url: string; body?: unknown }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith("/checkout/preferences")) {
      return Response.json({ id: "pref-1", init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1" });
    }
    if (url.includes("/v1/payments/")) return Response.json({ id: 555, ...payment });
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function webhookRequest(dataId: string, signature = sign(dataId, "req-1")) {
  return new Request(`https://site.test/api/webhooks/mercadopago?type=payment&data.id=${dataId}`, {
    method: "POST",
    headers: { "x-signature": signature, "x-request-id": "req-1", "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });
}

describe("fluxo completo com Mercado Pago (API simulada)", () => {
  it("cria checkout, recebe webhook aprovado e confirma a reserva", async () => {
    const { service, notifier } = await setup();
    const mp = fakeMercadoPago({ status: "approved", external_reference: null, transaction_amount: 1200 });
    const payments = new MercadoPagoProvider({
      accessToken: "TEST",
      webhookSecret: SECRET,
      siteUrl: "https://site.test",
      propertyName: "Chácara",
      fetchImpl: mp.fetchImpl,
    });

    const { bookingId, checkoutUrl } = await startReservation({ bookings: service, payments }, holdRequest());
    expect(checkoutUrl).toContain("mercadopago.com.br");
    const pref = mp.calls[0].body as { external_reference: string; items: Array<{ unit_price: number }>; notification_url: string };
    expect(pref.external_reference).toBe(bookingId);
    expect(pref.items[0].unit_price).toBe(1200);
    expect(pref.notification_url).toBe("https://site.test/api/webhooks/mercadopago");

    // o pagamento aprovado aponta para a reserva
    const mp2 = fakeMercadoPago({ status: "approved", external_reference: bookingId, transaction_amount: 1200 });
    const payments2 = new MercadoPagoProvider({ accessToken: "TEST", webhookSecret: SECRET, siteUrl: "https://site.test", propertyName: "Chácara", fetchImpl: mp2.fetchImpl });
    const res = await processPaymentWebhook({ bookings: service, payments: payments2 }, webhookRequest("555"));
    expect(res.body).toBe("confirmed");
    expect((await service.getById(bookingId))?.status).toBe("confirmed");
    expect(notifier.confirmed).toHaveLength(1);
  });

  it("webhook com assinatura falsa é recusado", async () => {
    const { service } = await setup();
    const mp = fakeMercadoPago({ status: "approved", external_reference: "x", transaction_amount: 1 });
    const payments = new MercadoPagoProvider({ accessToken: "T", webhookSecret: SECRET, siteUrl: "https://s", propertyName: "C", fetchImpl: mp.fetchImpl });
    await expect(
      processPaymentWebhook({ bookings: service, payments }, webhookRequest("555", "ts=1,v1=deadbeef")),
    ).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it("valor pago menor que o da reserva não confirma", async () => {
    const { service } = await setup();
    const { booking } = await service.createHold(holdRequest());
    const mp = fakeMercadoPago({ status: "approved", external_reference: booking.id, transaction_amount: 10 });
    const payments = new MercadoPagoProvider({ accessToken: "T", webhookSecret: SECRET, siteUrl: "https://s", propertyName: "C", fetchImpl: mp.fetchImpl });
    const res = await processPaymentWebhook({ bookings: service, payments }, webhookRequest("555"));
    expect(res.body).toBe("valor divergente");
    expect((await service.getById(booking.id))?.status).toBe("pending_payment");
  });

  it("pagamento pendente (Pix não pago) não confirma", async () => {
    const { service } = await setup();
    const { booking } = await service.createHold(holdRequest());
    const mp = fakeMercadoPago({ status: "pending", external_reference: booking.id, transaction_amount: 1200 });
    const payments = new MercadoPagoProvider({ accessToken: "T", webhookSecret: SECRET, siteUrl: "https://s", propertyName: "C", fetchImpl: mp.fetchImpl });
    const res = await processPaymentWebhook({ bookings: service, payments }, webhookRequest("555"));
    expect(res.body).toBe("not_approved");
  });

  it("se o Mercado Pago falhar ao criar o checkout, as datas são liberadas", async () => {
    const { service } = await setup();
    const failing = { name: "mercadopago" as const, createCheckout: async () => { throw new Error("MP fora"); }, handleWebhook: async () => ({ kind: "ignored" as const, reason: "" }) };
    await expect(startReservation({ bookings: service, payments: failing }, holdRequest())).rejects.toThrow("MP fora");
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual([]);
  });
});

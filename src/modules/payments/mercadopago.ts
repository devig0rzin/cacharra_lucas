/**
 * Mercado Pago — Checkout Pro (Pix e cartão na página do Mercado Pago).
 *
 * Fluxo: criamos uma "preferência" com o valor da reserva → o hóspede paga no
 * Mercado Pago → o MP chama nosso webhook → consultamos o pagamento na API
 * (nunca confiamos só no corpo do aviso) → confirmamos a reserva.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Booking } from "@/modules/booking/domain";
import { formatDateBR } from "@/lib/dates";
import {
  InvalidWebhookSignatureError,
  type CheckoutSession,
  type PaymentNotification,
  type PaymentProvider,
} from "./types";

const API = "https://api.mercadopago.com";

export interface MercadoPagoConfig {
  accessToken: string;
  webhookSecret: string;
  siteUrl: string;
  propertyName: string;
  fetchImpl?: typeof fetch;
}

/**
 * Valida o cabeçalho x-signature do Mercado Pago.
 * Manifesto: `id:{data.id};request-id:{x-request-id};ts:{ts};` assinado com HMAC-SHA256.
 */
export function verifyMercadoPagoSignature(opts: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = opts;
  if (!signatureHeader || !dataId || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * O Mercado Pago exige data com milissegundos e fuso explícito
 * ("2026-10-08T23:30:00.000Z"); o formato que vem do banco não tem
 * milissegundos e é recusado com HTTP 400. Devolve undefined se não der
 * para interpretar, porque a validade do link é opcional.
 */
export function toMercadoPagoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** O Mercado Pago não conhece esse pagamento (ex.: notificação de teste do painel). */
export class PaymentNotFoundError extends Error {
  constructor(path: string) {
    super(`Mercado Pago: não encontrado (${path})`);
    this.name = "PaymentNotFoundError";
  }
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly cfg: MercadoPagoConfig) {
    this.fetchImpl = cfg.fetchImpl ?? fetch;
  }

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.cfg.accessToken}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) throw new PaymentNotFoundError(path);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Mercado Pago ${init.method ?? "GET"} ${path}: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  async createCheckout(booking: Booking): Promise<CheckoutSession> {
    const returnUrl = `${this.cfg.siteUrl}/reserva/${booking.id}`;
    const pref = await this.api<{ id: string; init_point: string }>("/checkout/preferences", {
      method: "POST",
      headers: { "x-idempotency-key": booking.id },
      body: JSON.stringify({
        items: [
          {
            id: booking.code,
            title: `${this.cfg.propertyName} — ${formatDateBR(booking.checkIn)} a ${formatDateBR(booking.checkOut)}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: booking.totalCents / 100,
          },
        ],
        payer: { name: booking.guestName, email: booking.guestEmail },
        external_reference: booking.id,
        notification_url: `${this.cfg.siteUrl}/api/webhooks/mercadopago`,
        back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
        auto_return: "approved",
        // o link de pagamento vence junto com o prazo em que as datas ficam seguradas
        expires: true,
        expiration_date_to: toMercadoPagoDate(booking.holdExpiresAt),
        statement_descriptor: "SERRAVERDE",
      }),
    });
    return { url: pref.init_point, providerRef: pref.id };
  }

  async handleWebhook(req: Request): Promise<PaymentNotification> {
    const url = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
    const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type;
    const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);

    const valid = verifyMercadoPagoSignature({
      signatureHeader: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      secret: this.cfg.webhookSecret,
    });
    if (!valid) throw new InvalidWebhookSignatureError();

    if (type !== "payment" || !dataId) return { kind: "ignored", reason: `evento ${type ?? "desconhecido"}` };

    let payment: { id: number; status: string; external_reference: string | null; transaction_amount: number };
    try {
      payment = await this.api(`/v1/payments/${encodeURIComponent(dataId)}`);
    } catch (err) {
      // A simulação do painel envia um id fictício: responder 200 evita
      // reenvios inúteis e o painel mostra a entrega como bem-sucedida.
      if (err instanceof PaymentNotFoundError) return { kind: "ignored", reason: `pagamento ${dataId} não existe` };
      throw err;
    }

    const paymentRef = String(payment.id);
    if (payment.status === "approved" && payment.external_reference) {
      return {
        kind: "approved",
        bookingId: payment.external_reference,
        paymentRef,
        amountCents: Math.round(payment.transaction_amount * 100),
      };
    }
    return { kind: "not_approved", bookingId: payment.external_reference, paymentRef, status: payment.status };
  }
}

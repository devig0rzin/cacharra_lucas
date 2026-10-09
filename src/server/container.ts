/**
 * Raiz de composição: o ÚNICO lugar que sabe qual implementação de cada
 * módulo está ligada (Supabase × PGlite, Mercado Pago × simulado, Resend × console).
 * Rotas e páginas pedem `getServices()` e não importam adaptadores diretamente.
 */
import "server-only";
import path from "node:path";
import { bookingRules, property } from "@/config/property";
import type { Db } from "@/lib/db/types";
import { BookingRepository } from "@/modules/booking/repository";
import { BookingService } from "@/modules/booking/service";
import { ChannelRepository } from "@/modules/channels/repository";
import { ChannelSyncService, IcalUrlSource, type ChannelSource } from "@/modules/channels/service";
import { ConsoleEmailSender, ResendEmailSender, type EmailSender } from "@/modules/notifications/email";
import { EmailNotifier } from "@/modules/notifications/notifier";
import { MercadoPagoProvider } from "@/modules/payments/mercadopago";
import { MockPaymentProvider } from "@/modules/payments/mock";
import type { PaymentProvider } from "@/modules/payments/types";
import { env } from "./env";

export interface Services {
  bookings: BookingService;
  channels: ChannelSyncService;
  channelRepo: ChannelRepository;
  payments: PaymentProvider;
}

async function createDb(): Promise<Db> {
  const e = env();
  if (e.DATABASE_URL) {
    const { createPostgresDb } = await import("@/lib/db/postgres");
    return createPostgresDb(e.DATABASE_URL);
  }
  const { createPgliteDb } = await import("@/lib/db/pglite");
  // PGlite é só para desenvolvimento local; não rastrear a pasta no build.
  return createPgliteDb(path.resolve(/*turbopackIgnore: true*/ process.cwd(), e.PGLITE_DIR));
}

async function build(): Promise<Services> {
  const e = env();
  const db = await createDb();

  const email: EmailSender = e.RESEND_API_KEY ? new ResendEmailSender(e.RESEND_API_KEY, e.EMAIL_FROM) : new ConsoleEmailSender();
  const notifier = new EmailNotifier(
    email,
    e.OWNER_EMAIL,
    {
      name: property.name,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      addressLine: `${property.address.line} — ${property.address.city}`,
      mapsUrl: property.address.mapsUrl,
      whatsapp: property.contact.whatsapp,
    },
    e.SITE_URL,
  );

  const bookingRepo = new BookingRepository(db);
  const channelRepo = new ChannelRepository(db);

  const sources: ChannelSource[] = [];
  if (e.AIRBNB_ICAL_URL) sources.push(new IcalUrlSource("airbnb", e.AIRBNB_ICAL_URL));

  const channels = new ChannelSyncService({
    sources,
    channels: channelRepo,
    bookings: bookingRepo,
    notifier,
    timeZone: property.timeZone,
    siteName: property.name,
  });

  const bookings = new BookingService({
    repo: bookingRepo,
    rules: bookingRules,
    timeZone: property.timeZone,
    notifier,
    refreshExternalCalendars: sources.length ? () => channels.refreshIfStale() : undefined,
  });

  const payments: PaymentProvider =
    e.PAYMENTS_PROVIDER === "mercadopago"
      ? new MercadoPagoProvider({
          accessToken: e.MP_ACCESS_TOKEN!,
          webhookSecret: e.MP_WEBHOOK_SECRET!,
          siteUrl: e.SITE_URL,
          propertyName: property.name,
        })
      : new MockPaymentProvider(e.SITE_URL);

  return { bookings, channels, channelRepo, payments };
}

// Reaproveita a instância entre requisições (e entre recargas do `next dev`).
const g = globalThis as unknown as { __services?: Promise<Services> };

export function getServices(): Promise<Services> {
  if (!g.__services) {
    g.__services = build().catch((err) => {
      g.__services = undefined;
      throw err;
    });
  }
  return g.__services;
}

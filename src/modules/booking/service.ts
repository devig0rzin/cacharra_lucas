import { z } from "zod";
import type { BookingRules } from "@/config/property";
import { addDays, eachNight, isIsoDate, todayIn, type IsoDate } from "@/lib/dates";
import { generateBookingCode, quoteStay, validateStay, type Booking, type Quote } from "./domain";
import { InvalidStayError } from "./errors";
import type { BookingRepository, MarkPaidOutcome } from "./repository";

export const guestSchema = z.object({
  guestName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  guestEmail: z.email("E-mail inválido.").max(200),
  guestPhone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .pipe(z.string().min(10, "Telefone inválido.").max(16, "Telefone inválido.")),
  notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : null)),
});

export type GuestInput = z.input<typeof guestSchema>;

export interface HoldRequest {
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
  guest: GuestInput;
}

/** Quem quiser ser avisado sobre eventos de reserva (e-mail, WhatsApp no futuro...). */
export interface BookingNotifier {
  bookingConfirmed(booking: Booking): Promise<void>;
  paymentConflict(booking: Booking): Promise<void>;
}

export interface BookingServiceDeps {
  repo: BookingRepository;
  rules: BookingRules;
  timeZone: string;
  notifier: BookingNotifier;
  /** Chamado antes de segurar datas: atualiza bloqueios do Airbnb "em tempo real". */
  refreshExternalCalendars?: () => Promise<void>;
  clock?: () => Date;
}

export class BookingService {
  private readonly clock: () => Date;

  constructor(private readonly deps: BookingServiceDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  today(): IsoDate {
    return todayIn(this.deps.timeZone, this.clock());
  }

  /** Noites ocupadas em [from, to) — o que o calendário do site pinta como indisponível. */
  async blockedNights(from: IsoDate, to: IsoDate): Promise<IsoDate[]> {
    const ranges = await this.deps.repo.occupiedRanges(from, to, this.clock());
    const nights = new Set<IsoDate>();
    for (const r of ranges) {
      for (const n of eachNight(r.start < from ? from : r.start, r.end > to ? to : r.end)) nights.add(n);
    }
    return [...nights].sort();
  }

  quote(checkIn: IsoDate, checkOut: IsoDate): Quote {
    return quoteStay(checkIn, checkOut, this.deps.rules);
  }

  /** Valida, calcula o valor e segura as datas por `holdMinutes` aguardando pagamento. */
  async createHold(req: HoldRequest): Promise<{ booking: Booking; quote: Quote }> {
    const reason = validateStay(req, this.deps.rules, this.today());
    if (reason) throw new InvalidStayError(reason);
    const guest = guestSchema.parse(req.guest);

    if (this.deps.refreshExternalCalendars) {
      try {
        await this.deps.refreshExternalCalendars();
      } catch (err) {
        // Falha no Airbnb não derruba a reserva; usamos os últimos dados sincronizados.
        console.error("[booking] falha ao atualizar calendários externos", err);
      }
    }

    const quote = this.quote(req.checkIn, req.checkOut);
    const now = this.clock();
    const booking = await this.deps.repo.createHold(
      {
        code: generateBookingCode(),
        source: "site",
        checkIn: req.checkIn,
        checkOut: req.checkOut,
        guests: req.guests,
        ...guest,
        totalCents: quote.totalCents,
        holdExpiresAt: new Date(now.getTime() + this.deps.rules.holdMinutes * 60_000),
      },
      now,
    );
    return { booking, quote };
  }

  async getById(id: string): Promise<Booking | null> {
    return this.deps.repo.findById(id);
  }

  async attachPayment(id: string, provider: string, ref: string): Promise<void> {
    await this.deps.repo.setPaymentRef(id, provider, ref);
  }

  /** Pagamento aprovado → confirma e avisa. Seguro para chamar várias vezes. */
  async confirmPayment(id: string, provider: string, ref: string): Promise<MarkPaidOutcome> {
    const { outcome, booking } = await this.deps.repo.markPaid(id, provider, ref);
    // Falha no e-mail não pode desfazer a confirmação (que já está gravada).
    try {
      if (booking && outcome === "confirmed") await this.deps.notifier.bookingConfirmed(booking);
      if (booking && outcome === "conflict") await this.deps.notifier.paymentConflict(booking);
    } catch (err) {
      console.error(`[booking] reserva ${id} ${outcome}, mas o aviso falhou`, err);
    }
    return outcome;
  }

  async blockDates(checkIn: IsoDate, checkOut: IsoDate, note: string | null): Promise<Booking> {
    if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) throw new InvalidStayError("invalid_dates");
    return this.deps.repo.createManualBlock(generateBookingCode(), checkIn, checkOut, note);
  }

  async cancel(id: string): Promise<void> {
    await this.deps.repo.cancel(id);
  }

  async listUpcoming(): Promise<Booking[]> {
    return this.deps.repo.listUpcoming(addDays(this.today(), -1));
  }

  async expireStaleHolds(): Promise<number> {
    return this.deps.repo.expireStaleHolds(this.clock());
  }
}

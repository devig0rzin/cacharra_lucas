/**
 * Regras puras de reserva (sem banco, sem rede).
 * Pode ser importado tanto no servidor quanto no navegador.
 */
import type { BookingRules } from "@/config/property";
import { addDays, isIsoDate, nightsBetween, type IsoDate } from "@/lib/dates";

export type BookingStatus =
  | "pending_payment" // datas seguradas aguardando pagamento
  | "confirmed"
  | "cancelled"
  | "expired" // o prazo de pagamento acabou
  | "payment_conflict"; // pagou depois que as datas foram tomadas → reembolsar

export type BookingSource = "site" | "manual";

export interface Booking {
  id: string;
  code: string;
  status: BookingStatus;
  source: BookingSource;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string | null;
  totalCents: number;
  holdExpiresAt: string | null;
  paymentProvider: string | null;
  paymentRef: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface StayRequest {
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
}

export type StayValidationError =
  | "invalid_dates"
  | "check_in_in_past"
  | "check_out_before_check_in"
  | "below_min_nights"
  | "above_max_nights"
  | "beyond_booking_window"
  | "invalid_guests";

export const stayErrorMessages: Record<StayValidationError, string> = {
  invalid_dates: "Datas inválidas.",
  check_in_in_past: "A data de entrada já passou.",
  check_out_before_check_in: "A saída precisa ser depois da entrada.",
  below_min_nights: "O mínimo é de 2 noites.",
  above_max_nights: "Reserva acima do máximo de noites permitido.",
  beyond_booking_window: "Ainda não abrimos reservas para essas datas.",
  invalid_guests: "Número de hóspedes inválido.",
};

export function validateStay(req: StayRequest, rules: BookingRules, today: IsoDate): StayValidationError | null {
  if (!isIsoDate(req.checkIn) || !isIsoDate(req.checkOut)) return "invalid_dates";
  if (req.checkIn < today) return "check_in_in_past";
  if (req.checkOut <= req.checkIn) return "check_out_before_check_in";
  const nights = nightsBetween(req.checkIn, req.checkOut);
  if (nights < rules.minNights) return "below_min_nights";
  if (nights > rules.maxNights) return "above_max_nights";
  if (req.checkOut > addDays(today, rules.bookingWindowDays)) return "beyond_booking_window";
  if (!Number.isInteger(req.guests) || req.guests < 1 || req.guests > rules.maxGuests) return "invalid_guests";
  return null;
}

export interface Quote {
  nights: number;
  nightlyRateCents: number;
  lodgingCents: number;
  cleaningFeeCents: number;
  totalCents: number;
}

/** Calcula o valor da estadia. Hoje é preço fixo por noite; temporada/fim de semana entram aqui depois. */
export function quoteStay(checkIn: IsoDate, checkOut: IsoDate, rules: BookingRules): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  const lodgingCents = nights * rules.nightlyRateCents;
  return {
    nights,
    nightlyRateCents: rules.nightlyRateCents,
    lodgingCents,
    cleaningFeeCents: rules.cleaningFeeCents,
    totalCents: lodgingCents + rules.cleaningFeeCents,
  };
}

/**
 * Dado um conjunto de noites ocupadas, a estadia [checkIn, checkOut) está livre?
 * (O dia de saída pode ser o dia de entrada de outra reserva.)
 */
export function isStayFree(checkIn: IsoDate, checkOut: IsoDate, blockedNights: ReadonlySet<IsoDate>): boolean {
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
    if (blockedNights.has(d)) return false;
  }
  return true;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

/** Código curto e legível para o hóspede, ex.: SV-7K3M9Q. */
export function generateBookingCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(6);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `SV-${out}`;
}

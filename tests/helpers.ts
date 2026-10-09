import { bookingRules } from "@/config/property";
import { createPgliteDb } from "@/lib/db/pglite";
import type { Db } from "@/lib/db/types";
import type { Booking } from "@/modules/booking/domain";
import { BookingRepository } from "@/modules/booking/repository";
import { BookingService, type BookingNotifier, type HoldRequest } from "@/modules/booking/service";

export class RecordingNotifier implements BookingNotifier {
  confirmed: Booking[] = [];
  conflicts: Booking[] = [];
  async bookingConfirmed(b: Booking) {
    this.confirmed.push(b);
  }
  async paymentConflict(b: Booking) {
    this.conflicts.push(b);
  }
}

/** Relógio controlável: "agora" = 8/out/2026 12:00 em São Paulo. */
export function fakeClock(start = "2026-10-08T15:00:00Z") {
  let now = new Date(start);
  return {
    now: () => now,
    advanceMinutes(min: number) {
      now = new Date(now.getTime() + min * 60_000);
    },
  };
}

export async function setup() {
  const db: Db = await createPgliteDb();
  const repo = new BookingRepository(db);
  const notifier = new RecordingNotifier();
  const clock = fakeClock();
  const service = new BookingService({
    repo,
    rules: bookingRules,
    timeZone: "America/Sao_Paulo",
    notifier,
    clock: clock.now,
  });
  return { db, repo, notifier, clock, service };
}

export function holdRequest(overrides: Partial<HoldRequest> = {}): HoldRequest {
  return {
    checkIn: "2026-10-10",
    checkOut: "2026-10-12",
    guests: 4,
    guest: { guestName: "Maria Silva", guestEmail: "maria@example.com", guestPhone: "(11) 98888-7777" },
    ...overrides,
  };
}

import { describe, expect, it } from "vitest";
import { DatesUnavailableError, InvalidStayError } from "@/modules/booking/errors";
import { holdRequest, setup } from "../helpers";

describe("BookingService (Postgres via PGlite)", () => {
  it("segura as datas e mostra as noites como ocupadas", async () => {
    const { service } = await setup();
    const { booking, quote } = await service.createHold(holdRequest());

    expect(booking.status).toBe("pending_payment");
    expect(booking.code).toMatch(/^SV-/);
    expect(booking.guestPhone).toBe("11988887777");
    expect(quote.nights).toBe(2);
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("ninguém pega a mesma noite: segunda reserva sobreposta é recusada", async () => {
    const { service } = await setup();
    await service.createHold(holdRequest());
    await expect(service.createHold(holdRequest({ checkIn: "2026-10-11", checkOut: "2026-10-14" }))).rejects.toBeInstanceOf(
      DatesUnavailableError,
    );
  });

  it("duas reservas simultâneas para as mesmas datas: só uma passa", async () => {
    const { service } = await setup();
    const results = await Promise.allSettled([
      service.createHold(holdRequest()),
      service.createHold(holdRequest()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("check-out de uma reserva pode ser o check-in da próxima", async () => {
    const { service } = await setup();
    await service.createHold(holdRequest({ checkIn: "2026-10-10", checkOut: "2026-10-12" }));
    const { booking } = await service.createHold(holdRequest({ checkIn: "2026-10-12", checkOut: "2026-10-14" }));
    expect(booking.checkIn).toBe("2026-10-12");
  });

  it("valida regras antes de tocar no banco (mínimo 2 noites)", async () => {
    const { service } = await setup();
    await expect(service.createHold(holdRequest({ checkOut: "2026-10-11" }))).rejects.toBeInstanceOf(InvalidStayError);
  });

  it("hold vencido libera as datas para outro hóspede", async () => {
    const { service, clock } = await setup();
    await service.createHold(holdRequest());
    clock.advanceMinutes(31);
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual([]);
    const { booking } = await service.createHold(holdRequest());
    expect(booking.status).toBe("pending_payment");
  });

  it("pagamento aprovado confirma e avisa uma única vez (webhook repetido)", async () => {
    const { service, notifier } = await setup();
    const { booking } = await service.createHold(holdRequest());

    expect(await service.confirmPayment(booking.id, "mercadopago", "pay-1")).toBe("confirmed");
    expect(await service.confirmPayment(booking.id, "mercadopago", "pay-1")).toBe("already_confirmed");
    expect(notifier.confirmed).toHaveLength(1);
    expect((await service.getById(booking.id))?.status).toBe("confirmed");
  });

  it("pagamento atrasado, datas ainda livres → confirma mesmo assim", async () => {
    const { service, clock } = await setup();
    const { booking } = await service.createHold(holdRequest());
    clock.advanceMinutes(45);
    await service.expireStaleHolds();
    expect(await service.confirmPayment(booking.id, "mercadopago", "pay-2")).toBe("confirmed");
  });

  it("pagamento atrasado e datas já tomadas → conflito para reembolso", async () => {
    const { service, clock, notifier } = await setup();
    const first = await service.createHold(holdRequest());
    clock.advanceMinutes(45);
    const second = await service.createHold(holdRequest());
    await service.confirmPayment(second.booking.id, "mercadopago", "pay-b");

    expect(await service.confirmPayment(first.booking.id, "mercadopago", "pay-a")).toBe("conflict");
    expect(notifier.conflicts.map((b) => b.id)).toEqual([first.booking.id]);
  });

  it("bloqueio vindo do Airbnb impede reserva no site", async () => {
    const { service, db } = await setup();
    await db.query(
      `insert into channel_blocks (channel, external_uid, start_date, end_date) values ('airbnb', 'x1', '2026-10-11', '2026-10-13')`,
    );
    await expect(service.createHold(holdRequest())).rejects.toBeInstanceOf(DatesUnavailableError);
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual(["2026-10-11", "2026-10-12"]);
  });

  it("falha ao consultar o Airbnb não impede a reserva", async () => {
    const ctx = await setup();
    const { BookingService } = await import("@/modules/booking/service");
    const { bookingRules } = await import("@/config/property");
    const service = new BookingService({
      repo: ctx.repo,
      rules: bookingRules,
      timeZone: "America/Sao_Paulo",
      notifier: ctx.notifier,
      clock: ctx.clock.now,
      refreshExternalCalendars: async () => {
        throw new Error("Airbnb fora do ar");
      },
    });
    const { booking } = await service.createHold(holdRequest());
    expect(booking.status).toBe("pending_payment");
  });
});

import { describe, expect, it } from "vitest";
import { bookingRules } from "@/config/property";
import { addDays, eachNight, isIsoDate, nightsBetween, todayIn } from "@/lib/dates";
import { generateBookingCode, isStayFree, quoteStay, validateStay } from "@/modules/booking/domain";

const rules = { ...bookingRules, nightlyRateCents: 60000, cleaningFeeCents: 15000 };
const today = "2026-10-08";

describe("datas", () => {
  it("valida ISO e rejeita datas impossíveis", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("08/10/2026")).toBe(false);
  });

  it("soma dias atravessando mês e ano", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(nightsBetween("2026-10-08", "2026-10-10")).toBe(2);
    expect(eachNight("2026-10-08", "2026-10-10")).toEqual(["2026-10-08", "2026-10-09"]);
  });

  it("calcula 'hoje' no fuso de São Paulo, não em UTC", () => {
    // 01:30 UTC do dia 9 ainda é 22:30 do dia 8 em São Paulo
    expect(todayIn("America/Sao_Paulo", new Date("2026-10-09T01:30:00Z"))).toBe("2026-10-08");
  });
});

describe("validateStay", () => {
  const ok = { checkIn: "2026-10-10", checkOut: "2026-10-12", guests: 4 };

  it("aceita 2 noites", () => {
    expect(validateStay(ok, rules, today)).toBeNull();
  });

  it("recusa menos de 2 noites", () => {
    expect(validateStay({ ...ok, checkOut: "2026-10-11" }, rules, today)).toBe("below_min_nights");
  });

  it("recusa entrada no passado", () => {
    expect(validateStay({ ...ok, checkIn: "2026-10-07" }, rules, today)).toBe("check_in_in_past");
  });

  it("recusa saída antes da entrada", () => {
    expect(validateStay({ ...ok, checkOut: "2026-10-09" }, rules, today)).toBe("check_out_before_check_in");
  });

  it("recusa hóspedes fora da capacidade", () => {
    expect(validateStay({ ...ok, guests: 0 }, rules, today)).toBe("invalid_guests");
    expect(validateStay({ ...ok, guests: rules.maxGuests + 1 }, rules, today)).toBe("invalid_guests");
  });

  it("recusa além da janela de reservas", () => {
    const far = addDays(today, rules.bookingWindowDays);
    expect(validateStay({ checkIn: far, checkOut: addDays(far, 2), guests: 2 }, rules, today)).toBe(
      "beyond_booking_window",
    );
  });
});

describe("quoteStay", () => {
  it("multiplica noites pelo valor e soma a limpeza", () => {
    expect(quoteStay("2026-10-10", "2026-10-13", rules)).toEqual({
      nights: 3,
      nightlyRateCents: 60000,
      lodgingCents: 180000,
      cleaningFeeCents: 15000,
      totalCents: 195000,
    });
  });
});

describe("isStayFree", () => {
  const blocked = new Set(["2026-10-12", "2026-10-13"]);
  it("permite sair no dia em que outro hóspede entra", () => {
    expect(isStayFree("2026-10-10", "2026-10-12", blocked)).toBe(true);
  });
  it("permite entrar no dia em que outro hóspede sai", () => {
    expect(isStayFree("2026-10-14", "2026-10-16", blocked)).toBe(true);
  });
  it("recusa se qualquer noite estiver ocupada", () => {
    expect(isStayFree("2026-10-11", "2026-10-13", blocked)).toBe(false);
  });
});

describe("generateBookingCode", () => {
  it("gera código legível", () => {
    expect(generateBookingCode()).toMatch(/^SV-[A-HJ-NP-Z2-9]{6}$/);
  });
});

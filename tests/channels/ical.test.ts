import { describe, expect, it } from "vitest";
import { buildIcal, parseIcal } from "@/modules/channels/ical";

// Formato real exportado pelo Airbnb (simplificado)
const AIRBNB_SAMPLE = [
  "BEGIN:VCALENDAR",
  "PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "CALSCALE:GREGORIAN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261018",
  "DTSTART;VALUE=DATE:20261015",
  "UID:1418fb94e984-2b6b5b6f1d3a5a7c44c8a5f2d8d1e1e5@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABCDEF\\nPhone",
  "  Number (Last 4 Digits): 1234",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261101",
  "DTSTART;VALUE=DATE:20261030",
  "UID:7f3e5c2a-blocked@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcal", () => {
  it("lê reservas e bloqueios do Airbnb", () => {
    expect(parseIcal(AIRBNB_SAMPLE)).toEqual([
      {
        uid: "1418fb94e984-2b6b5b6f1d3a5a7c44c8a5f2d8d1e1e5@airbnb.com",
        start: "2026-10-15",
        end: "2026-10-18",
        summary: "Reserved",
      },
      { uid: "7f3e5c2a-blocked@airbnb.com", start: "2026-10-30", end: "2026-11-01", summary: "Airbnb (Not available)" },
    ]);
  });

  it("aceita data-hora e evento sem DTEND (1 dia)", () => {
    const ics = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nDTSTART:20261020T150000Z\nEND:VEVENT\nEND:VCALENDAR";
    expect(parseIcal(ics)).toEqual([{ uid: "a", start: "2026-10-20", end: "2026-10-21", summary: undefined }]);
  });

  it("ignora eventos sem data válida", () => {
    expect(parseIcal("BEGIN:VEVENT\nUID:x\nDTSTART:lixo\nEND:VEVENT")).toEqual([]);
  });
});

describe("buildIcal", () => {
  it("gera calendário com dias inteiros e CRLF, e lê de volta", () => {
    const ics = buildIcal({
      prodId: "-//Teste//PT",
      name: "Reservas",
      now: new Date("2026-10-08T12:00:00Z"),
      events: [{ uid: "b1@reservas", start: "2026-10-10", end: "2026-10-12", summary: "Reservado (site)" }],
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261012\r\n");
    expect(ics).toContain("DTSTAMP:20261008T120000Z");
    expect(parseIcal(ics)).toEqual([{ uid: "b1@reservas", start: "2026-10-10", end: "2026-10-12", summary: "Reservado (site)" }]);
  });
});

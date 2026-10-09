import { describe, expect, it } from "vitest";
import { formatDateRangeShort } from "@/lib/dates";

describe("formatDateRangeShort", () => {
  it("omite o ano na primeira data quando o intervalo fica no mesmo ano", () => {
    expect(formatDateRangeShort("2026-10-10", "2026-10-12")).toBe("10 out a 12 out 2026");
  });

  it("mostra os dois anos quando o intervalo cruza o ano", () => {
    expect(formatDateRangeShort("2026-12-30", "2027-01-02")).toBe("30 dez 2026 a 2 jan 2027");
  });
});

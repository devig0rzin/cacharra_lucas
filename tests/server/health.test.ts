import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { blockedNights } = vi.hoisted(() => ({ blockedNights: vi.fn() }));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/container", () => ({
  getServices: async () => ({ bookings: { blockedNights } }),
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://site.test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@db.test:6543/postgres");
    vi.stubEnv("PAYMENTS_PROVIDER", "mercadopago");
    vi.stubEnv("MP_ACCESS_TOKEN", "token-secreto");
    vi.stubEnv("MP_WEBHOOK_SECRET", "webhook-secreto");
    vi.stubEnv("ICAL_EXPORT_TOKEN", "a".repeat(48));
    vi.stubEnv("CRON_SECRET", "b".repeat(48));
    vi.stubEnv("ADMIN_PASSWORD", "SenhaForte2026");
    vi.stubEnv("ADMIN_SESSION_SECRET", "c".repeat(64));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("não expõe detalhes internos quando o banco falha", async () => {
    blockedNights.mockRejectedValueOnce(new Error("falha em postgresql://user:senha@host-interno"));

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.banco).toBe("falhou");
    expect(serialized).not.toContain("host-interno");
    expect(serialized).not.toContain("senha");
  });
});

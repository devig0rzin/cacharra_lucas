import { describe, expect, it } from "vitest";
import { envStatus } from "@/server/env";

const complete = {
  NODE_ENV: "production",
  SITE_URL: "https://cacharra-lucas-2iy2.vercel.app",
  DATABASE_URL: "postgresql://u:p@host:6543/postgres",
  PAYMENTS_PROVIDER: "mercadopago",
  MP_ACCESS_TOKEN: "TEST-123",
  MP_WEBHOOK_SECRET: "segredo",
  ICAL_EXPORT_TOKEN: "a".repeat(48),
  CRON_SECRET: "b".repeat(48),
  ADMIN_PASSWORD: "SenhaForte2026",
  ADMIN_SESSION_SECRET: "c".repeat(64),
} as unknown as NodeJS.ProcessEnv;

function without(...keys: string[]): NodeJS.ProcessEnv {
  const copy = { ...complete };
  for (const k of keys) delete copy[k];
  return copy;
}

describe("envStatus (diagnóstico da Vercel)", () => {
  it("configuração completa de produção passa", () => {
    const s = envStatus(complete);
    expect(s.ok).toBe(true);
    expect(s.issues).toEqual([]);
  });

  it("reproduz o erro do deploy antigo: sem banco e com pagamento simulado", () => {
    const s = envStatus(without("DATABASE_URL", "PAYMENTS_PROVIDER", "MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"));
    expect(s.ok).toBe(false);
    expect(s.issues).toContain("DATABASE_URL é obrigatório em produção");
    expect(s.issues).toContain("Pagamento simulado não pode rodar em produção");
  });

  it("aponta a assinatura secreta do webhook quando falta", () => {
    const s = envStatus(without("MP_WEBHOOK_SECRET"));
    expect(s.issues.join(" ")).toMatch(/MP_WEBHOOK_SECRET/);
    expect(s.present.MP_WEBHOOK_SECRET).toBe(false);
  });

  it("nomeia a variável com formato errado", () => {
    const s = envStatus({ ...complete, SITE_URL: "cacharra-lucas.vercel.app" });
    expect(s.issues.join(" ")).toMatch(/SITE_URL/);
  });

  it("não expõe nenhum valor secreto", () => {
    const text = JSON.stringify(envStatus(complete));
    for (const secret of ["TEST-123", "segredo", "SenhaForte2026", "postgresql://"]) {
      expect(text).not.toContain(secret);
    }
  });
});

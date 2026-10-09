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
  for (const key of keys) delete copy[key];
  return copy;
}

describe("envStatus (diagnóstico da Vercel)", () => {
  it("aceita uma configuração completa de produção", () => {
    const status = envStatus(complete);
    expect(status.ok).toBe(true);
    expect(status.issues).toEqual([]);
  });

  it("reproduz o erro do deploy antigo sem banco e com pagamento simulado", () => {
    const status = envStatus(without("DATABASE_URL", "PAYMENTS_PROVIDER", "MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"));
    expect(status.ok).toBe(false);
    expect(status.issues).toContain("DATABASE_URL é obrigatório em produção");
    expect(status.issues).toContain("Pagamento simulado não pode rodar em produção");
  });

  it("aponta a assinatura secreta do webhook quando falta", () => {
    const status = envStatus(without("MP_WEBHOOK_SECRET"));
    expect(status.issues.join(" ")).toMatch(/MP_WEBHOOK_SECRET/);
    expect(status.present.MP_WEBHOOK_SECRET).toBe(false);
  });

  it("nomeia a variável com formato errado", () => {
    const status = envStatus({ ...complete, SITE_URL: "cacharra-lucas.vercel.app" });
    expect(status.issues.join(" ")).toMatch(/SITE_URL/);
  });

  it("não expõe nenhum valor secreto", () => {
    const text = JSON.stringify(envStatus(complete));
    for (const secret of ["TEST-123", "segredo", "SenhaForte2026", "postgresql://"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("não devolve o valor bruto de um provedor inválido", () => {
    const status = envStatus({ ...complete, PAYMENTS_PROVIDER: "valor-secreto-colado-por-engano" });
    expect(status.paymentsProvider).toBe("inválido");
    expect(JSON.stringify(status)).not.toContain("valor-secreto-colado-por-engano");
  });
});

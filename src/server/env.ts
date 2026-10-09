import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SITE_URL: z.url().default("http://localhost:3000"),

    // Banco: sem DATABASE_URL usa Postgres embutido (PGlite) em .data/ — só para dev.
    DATABASE_URL: z.string().optional(),
    PGLITE_DIR: z.string().default(".data/pglite"),

    // Pagamento
    PAYMENTS_PROVIDER: z.enum(["mock", "mercadopago"]).default("mock"),
    ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: z.stringbool().default(false),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_WEBHOOK_SECRET: z.string().optional(),

    // E-mail
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Chácara Serra Verde <reservas@exemplo.com.br>"),
    OWNER_EMAIL: z.string().default("proprietario@exemplo.com.br"),

    // Airbnb (link "Exportar calendário" do anúncio)
    AIRBNB_ICAL_URL: z.url().optional(),
    // Token secreto na URL do calendário que o Airbnb importa
    ICAL_EXPORT_TOKEN: z.string().min(16).default("dev-token-troque-em-producao"),

    // Agendador (cron) e painel
    CRON_SECRET: z.string().min(16).default("dev-cron-secret-troque"),
    ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
    ADMIN_SESSION_SECRET: z.string().min(32).default("dev-session-secret-troque-em-producao-0000"),
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENTS_PROVIDER === "mercadopago" && (!env.MP_ACCESS_TOKEN || !env.MP_WEBHOOK_SECRET)) {
      ctx.addIssue({ code: "custom", message: "MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET são obrigatórios com Mercado Pago" });
    }
    if (env.NODE_ENV === "production") {
      if (!env.DATABASE_URL) ctx.addIssue({ code: "custom", message: "DATABASE_URL é obrigatório em produção" });
      if (env.PAYMENTS_PROVIDER === "mock" && !env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION) {
        ctx.addIssue({ code: "custom", message: "Pagamento simulado não pode rodar em produção" });
      }
      for (const key of ["ICAL_EXPORT_TOKEN", "CRON_SECRET", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"] as const) {
        if (String(env[key]).includes("dev-") || env[key] === "admin1234") {
          ctx.addIssue({ code: "custom", message: `${key} precisa ser trocado em produção` });
        }
      }
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Configuração inválida:\n${parsed.error.issues.map((i) => `- ${i.message}`).join("\n")}`);
    }
    cached = parsed.data;
  }
  return cached;
}

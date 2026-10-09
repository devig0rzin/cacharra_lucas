import { connection } from "next/server";
import { envStatus } from "@/server/env";

/**
 * GET /api/health — confere a configuração publicada (Vercel) sem expor
 * nenhum valor secreto: só diz o que está presente e o que falta.
 * Se a configuração estiver ok, testa também a conexão com o banco.
 */
export async function GET() {
  await connection();
  const status = envStatus();
  let database: "ok" | "não testado" | string = "não testado";
  if (status.ok) {
    try {
      const { getServices } = await import("@/server/container");
      const { bookings } = await getServices();
      await bookings.blockedNights("2000-01-01", "2000-01-02");
      database = "ok";
    } catch (err) {
      database = `falhou: ${err instanceof Error ? err.message.split("\n")[0].slice(0, 160) : "erro"}`;
    }
  }
  return Response.json(
    {
      configuracao: status.ok ? "ok" : "incompleta",
      faltando: status.issues,
      variaveis_presentes: status.present,
      pagamento: status.paymentsProvider,
      banco: database,
    },
    { status: status.ok && database === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}

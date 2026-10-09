import { connection } from "next/server";
import { envStatus } from "@/server/env";

/**
 * Confere a configuração publicada sem expor valores secretos e, quando ela
 * está completa, testa também uma consulta mínima ao banco.
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
    } catch (error) {
      console.error("[health] falha ao consultar o banco", error);
      database = "falhou";
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
    {
      status: status.ok && database === "ok" ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}

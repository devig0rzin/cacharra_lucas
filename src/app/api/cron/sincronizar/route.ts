import { timingSafeEqual } from "node:crypto";
import { getServices } from "@/server/container";
import { env } from "@/server/env";

/**
 * Tarefa agendada (a cada ~15 min): puxa o calendário do Airbnb, libera holds
 * vencidos e avisa sobre reservas duplas. Chamada pelo GitHub Actions
 * (.github/workflows/sincronizar-calendarios.yml) ou pelo Vercel Cron, com
 * `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env().CRON_SECRET}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("não autorizado", { status: 401 });

  const { channels, bookings } = await getServices();
  const expired = await bookings.expireStaleHolds();
  const results = await channels.syncAll();
  const ok = results.every((r) => r.ok);
  return Response.json({ ok, expiredHolds: expired, channels: results }, { status: ok ? 200 : 502 });
}

export const GET = handle;
export const POST = handle;

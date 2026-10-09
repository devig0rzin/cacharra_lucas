import { timingSafeEqual } from "node:crypto";
import { getServices } from "@/server/container";
import { env } from "@/server/env";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Calendário do site para o Airbnb importar:
 *   {SITE_URL}/api/calendario/{ICAL_EXPORT_TOKEN}.ics
 * No Airbnb: Calendário → Disponibilidade → Conectar a outro site → colar este link.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/calendario/[arquivo]">) {
  const { arquivo } = await ctx.params;
  const token = arquivo.replace(/\.ics$/, "");
  if (!sameSecret(token, env().ICAL_EXPORT_TOKEN)) return new Response("não encontrado", { status: 404 });

  const { channels } = await getServices();
  const ics = await channels.exportIcal();
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="reservas.ics"',
      "cache-control": "no-store",
    },
  });
}

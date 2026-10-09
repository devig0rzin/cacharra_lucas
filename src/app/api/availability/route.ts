import { isIsoDate, nightsBetween } from "@/lib/dates";
import { getServices } from "@/server/container";

/** GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD → noites ocupadas no intervalo. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isIsoDate(from) || !isIsoDate(to) || to <= from || nightsBetween(from, to) > 400) {
    return Response.json({ error: "Informe from e to (YYYY-MM-DD), até 400 dias." }, { status: 400 });
  }
  const { bookings } = await getServices();
  const blockedNights = await bookings.blockedNights(from, to);
  return Response.json(
    { from, to, blockedNights },
    { headers: { "cache-control": "no-store" } },
  );
}

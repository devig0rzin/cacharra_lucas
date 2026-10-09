import { describe, expect, it } from "vitest";
import type { Booking } from "@/modules/booking/domain";
import { parseIcal, type CalendarEvent } from "@/modules/channels/ical";
import { ChannelRepository } from "@/modules/channels/repository";
import { ChannelSyncService, IcalUrlSource, type ChannelSource } from "@/modules/channels/service";
import { holdRequest, setup } from "../helpers";

class FakeSource implements ChannelSource {
  channel = "airbnb";
  calls = 0;
  constructor(public events: CalendarEvent[] = [], public fail = false) {}
  async fetchEvents() {
    this.calls++;
    if (this.fail) throw new Error("Airbnb fora do ar");
    return this.events;
  }
}

async function setupSync(source: ChannelSource) {
  const ctx = await setup();
  const channelRepo = new ChannelRepository(ctx.db);
  const alerts: Array<{ booking: Booking; channel: string }> = [];
  const sync = new ChannelSyncService({
    sources: [source],
    channels: channelRepo,
    bookings: ctx.repo,
    notifier: { doubleBooking: async (booking, channel) => void alerts.push({ booking, channel }) },
    timeZone: "America/Sao_Paulo",
    siteName: "Chácara Serra Verde",
    clock: ctx.clock.now,
  });
  return { ...ctx, channelRepo, sync, alerts };
}

describe("sincronização com o Airbnb", () => {
  it("importa bloqueios e eles aparecem como ocupados no site", async () => {
    const source = new FakeSource([{ uid: "r1@airbnb.com", start: "2026-10-15", end: "2026-10-18" }]);
    const { sync, service } = await setupSync(source);

    const [result] = await sync.syncAll();
    expect(result).toMatchObject({ ok: true, events: 1 });
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual(["2026-10-15", "2026-10-16", "2026-10-17"]);
  });

  it("reserva cancelada no Airbnb libera as datas na próxima sincronização", async () => {
    const source = new FakeSource([{ uid: "r1@airbnb.com", start: "2026-10-15", end: "2026-10-18" }]);
    const { sync, service } = await setupSync(source);
    await sync.syncAll();
    source.events = [];
    await sync.syncAll();
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toEqual([]);
  });

  it("falha ao baixar NÃO apaga os bloqueios já conhecidos", async () => {
    const source = new FakeSource([{ uid: "r1@airbnb.com", start: "2026-10-15", end: "2026-10-18" }]);
    const { sync, service, channelRepo } = await setupSync(source);
    await sync.syncAll();
    source.fail = true;
    const [result] = await sync.syncAll();
    expect(result.ok).toBe(false);
    expect(await service.blockedNights("2026-10-01", "2026-10-31")).toHaveLength(3);
    expect((await channelRepo.lastRun("airbnb"))?.ok).toBe(false);
  });

  it("detecta reserva dupla (site × Airbnb) e avisa uma única vez", async () => {
    const source = new FakeSource();
    const { sync, service, alerts } = await setupSync(source);
    const { booking } = await service.createHold(holdRequest());
    await service.confirmPayment(booking.id, "mock", "p1");

    source.events = [{ uid: "r9@airbnb.com", start: "2026-10-11", end: "2026-10-13" }];
    await sync.syncAll();
    await sync.syncAll();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].booking.id).toBe(booking.id);
  });

  it("refreshIfStale não consulta o Airbnb de novo se acabou de sincronizar", async () => {
    const source = new FakeSource();
    const { sync, clock } = await setupSync(source);
    await sync.refreshIfStale();
    await sync.refreshIfStale();
    expect(source.calls).toBe(1);
    clock.advanceMinutes(2);
    await sync.refreshIfStale();
    expect(source.calls).toBe(2);
  });

  it("exporta só reservas do site, sem dados pessoais", async () => {
    const source = new FakeSource([{ uid: "r1@airbnb.com", start: "2026-10-20", end: "2026-10-22" }]);
    const { sync, service } = await setupSync(source);
    await sync.syncAll();
    const { booking } = await service.createHold(holdRequest());

    const ics = await sync.exportIcal();
    expect(parseIcal(ics)).toEqual([
      { uid: `${booking.id}@reservas`, start: "2026-10-10", end: "2026-10-12", summary: "Reservado (site)" },
    ]);
    expect(ics).not.toContain("Maria");
    expect(ics).not.toContain("maria@example.com");
  });
});

describe("IcalUrlSource", () => {
  it("recusa resposta que não é calendário (ex.: página de erro)", async () => {
    const fakeFetch = (async () => new Response("<html>erro</html>", { status: 200 })) as typeof fetch;
    await expect(new IcalUrlSource("airbnb", "https://x", fakeFetch).fetchEvents()).rejects.toThrow(/não é um calendário/);
  });

  it("recusa HTTP de erro", async () => {
    const fakeFetch = (async () => new Response("", { status: 503 })) as typeof fetch;
    await expect(new IcalUrlSource("airbnb", "https://x", fakeFetch).fetchEvents()).rejects.toThrow(/503/);
  });
});

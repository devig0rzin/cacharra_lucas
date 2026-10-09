import { addDays, todayIn } from "@/lib/dates";
import type { Booking } from "@/modules/booking/domain";
import type { BookingRepository } from "@/modules/booking/repository";
import { buildIcal, parseIcal, type CalendarEvent } from "./ical";
import type { ChannelRepository } from "./repository";

/** Um canal externo que publica datas ocupadas (hoje: Airbnb via iCal). */
export interface ChannelSource {
  channel: string;
  fetchEvents(): Promise<CalendarEvent[]>;
}

export class IcalUrlSource implements ChannelSource {
  constructor(
    public readonly channel: string,
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async fetchEvents(): Promise<CalendarEvent[]> {
    const res = await this.fetchImpl(this.url, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { accept: "text/calendar" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${this.channel}: HTTP ${res.status} ao baixar o calendário`);
    const text = await res.text();
    // Proteção: se vier uma página de erro, NÃO apagamos os bloqueios existentes.
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error(`${this.channel}: resposta não é um calendário iCal`);
    return parseIcal(text);
  }
}

export interface ChannelNotifier {
  doubleBooking(booking: Booking, channel: string): Promise<void>;
}

export interface SyncResult {
  channel: string;
  ok: boolean;
  events?: number;
  error?: string;
  newConflicts: number;
}

export interface ChannelSyncDeps {
  sources: ChannelSource[];
  channels: ChannelRepository;
  bookings: BookingRepository;
  notifier: ChannelNotifier;
  timeZone: string;
  siteName: string;
  /** Não consulta o canal de novo se a última sincronização for mais recente que isso. */
  freshnessMs?: number;
  clock?: () => Date;
}

export class ChannelSyncService {
  private readonly clock: () => Date;

  constructor(private readonly deps: ChannelSyncDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  get configuredChannels(): string[] {
    return this.deps.sources.map((s) => s.channel);
  }

  /** Sincroniza todos os canais (rodado pelo agendador a cada ~15 min). */
  async syncAll(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    for (const source of this.deps.sources) results.push(await this.syncOne(source));
    return results;
  }

  /** Usado logo antes de segurar datas: só consulta o canal se os dados estiverem velhos. */
  async refreshIfStale(): Promise<void> {
    const freshness = this.deps.freshnessMs ?? 60_000;
    for (const source of this.deps.sources) {
      const last = await this.deps.channels.lastSuccessAt(source.channel);
      if (last && this.clock().getTime() - last.getTime() < freshness) continue;
      const r = await this.syncOne(source);
      if (!r.ok) throw new Error(r.error);
    }
  }

  private async syncOne(source: ChannelSource): Promise<SyncResult> {
    const runId = await this.deps.channels.startRun(source.channel);
    try {
      const events = await source.fetchEvents();
      await this.deps.channels.replaceBlocks(source.channel, events);
      await this.deps.channels.finishRun(runId, this.clock(), { ok: true, events: events.length });
      const newConflicts = await this.alertConflicts();
      return { channel: source.channel, ok: true, events: events.length, newConflicts };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.deps.channels.finishRun(runId, this.clock(), { ok: false, error: message });
      return { channel: source.channel, ok: false, error: message, newConflicts: 0 };
    }
  }

  private async alertConflicts(): Promise<number> {
    let count = 0;
    for (const c of await this.deps.bookings.findChannelConflicts(this.clock())) {
      if (await this.deps.channels.recordConflictAlert(c.booking.id, c.channel, c.channelUid)) {
        await this.deps.notifier.doubleBooking(c.booking, c.channel);
        count++;
      }
    }
    return count;
  }

  /**
   * Calendário que o Airbnb importa: reservas do SITE (confirmadas e aguardando
   * pagamento). Bloqueios vindos do próprio Airbnb não entram, para não fazer eco.
   * Nenhum dado pessoal do hóspede é publicado.
   */
  async exportIcal(): Promise<string> {
    const now = this.clock();
    const from = addDays(todayIn(this.deps.timeZone, now), -1);
    const bookings = await this.deps.bookings.listExportable(from, now);
    return buildIcal({
      prodId: "-//Chacara Serra Verde//Reservas//PT-BR",
      name: `${this.deps.siteName} — reservas do site`,
      now,
      events: bookings.map((b) => ({
        uid: `${b.id}@reservas`,
        start: b.checkIn,
        end: b.checkOut,
        summary: "Reservado (site)",
      })),
    });
  }
}

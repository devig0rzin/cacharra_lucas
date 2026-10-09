import type { Db } from "@/lib/db/types";
import type { CalendarEvent } from "./ical";

export interface ChannelBlock {
  channel: string;
  externalUid: string;
  summary: string | null;
  startDate: string;
  endDate: string;
}

export interface SyncRun {
  channel: string;
  startedAt: string;
  finishedAt: string | null;
  ok: boolean | null;
  events: number | null;
  error: string | null;
}

export class ChannelRepository {
  constructor(private readonly db: Db) {}

  /** Substitui todos os bloqueios do canal pelo conteúdo atual do calendário dele. */
  async replaceBlocks(channel: string, events: CalendarEvent[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query(`delete from channel_blocks where channel = $1`, [channel]);
      for (const e of events) {
        await tx.query(
          `insert into channel_blocks (channel, external_uid, summary, start_date, end_date)
           values ($1, $2, $3, $4, $5)
           on conflict (channel, external_uid)
           do update set summary = excluded.summary, start_date = excluded.start_date,
                         end_date = excluded.end_date, updated_at = now()`,
          [channel, e.uid, e.summary ?? null, e.start, e.end],
        );
      }
    });
  }

  async listBlocks(fromDate: string): Promise<ChannelBlock[]> {
    return this.db.query<ChannelBlock>(
      `select channel, external_uid as "externalUid", summary,
              start_date::text as "startDate", end_date::text as "endDate"
         from channel_blocks where end_date >= $1::date order by start_date`,
      [fromDate],
    );
  }

  async startRun(channel: string): Promise<number> {
    const rows = await this.db.query<{ id: number }>(
      `insert into channel_sync_runs (channel) values ($1) returning id`,
      [channel],
    );
    return Number(rows[0].id);
  }

  async finishRun(id: number, finishedAt: Date, result: { ok: boolean; events?: number; error?: string }): Promise<void> {
    await this.db.query(
      `update channel_sync_runs set finished_at = $5, ok = $2, events = $3, error = $4 where id = $1`,
      [id, result.ok, result.events ?? null, result.error ?? null, finishedAt.toISOString()],
    );
  }

  async lastRun(channel: string): Promise<SyncRun | null> {
    const rows = await this.db.query<SyncRun>(
      `select channel,
              to_char(started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "startedAt",
              to_char(finished_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "finishedAt",
              ok, events, error
         from channel_sync_runs where channel = $1 order by started_at desc, id desc limit 1`,
      [channel],
    );
    return rows[0] ?? null;
  }

  /** Registra o alerta de conflito; retorna false se já tinha sido avisado. */
  async recordConflictAlert(bookingId: string, channel: string, externalUid: string): Promise<boolean> {
    const rows = await this.db.query(
      `insert into channel_conflict_alerts (booking_id, channel, external_uid) values ($1, $2, $3)
       on conflict do nothing returning booking_id`,
      [bookingId, channel, externalUid],
    );
    return rows.length > 0;
  }

  async lastSuccessAt(channel: string): Promise<Date | null> {
    const rows = await this.db.query<{ at: string | null }>(
      `select to_char(max(finished_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "at"
         from channel_sync_runs where channel = $1 and ok`,
      [channel],
    );
    return rows[0]?.at ? new Date(rows[0].at) : null;
  }
}

import type { Db } from "@/lib/db/types";
import { PG_EXCLUSION_VIOLATION, pgErrorCode } from "@/lib/db/types";
import type { IsoDate } from "@/lib/dates";
import type { Booking, BookingSource, BookingStatus } from "./domain";
import { DatesUnavailableError } from "./errors";

const BOOKING_COLUMNS = `
  id::text as "id", code, status, source,
  check_in::text as "checkIn", check_out::text as "checkOut",
  guests, guest_name as "guestName", guest_email as "guestEmail", guest_phone as "guestPhone",
  notes, total_cents as "totalCents",
  to_char(hold_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "holdExpiresAt",
  payment_provider as "paymentProvider", payment_ref as "paymentRef",
  to_char(confirmed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "confirmedAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
`;

/** Reserva ocupa a agenda? (confirmada, ou aguardando pagamento dentro do prazo) */
const ACTIVE = `(status = 'confirmed' or (status = 'pending_payment' and hold_expires_at > $NOW))`;

export interface OccupiedRange {
  start: IsoDate;
  end: IsoDate;
  kind: "booking" | "channel";
}

export interface NewHold {
  code: string;
  source: BookingSource;
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string | null;
  totalCents: number;
  holdExpiresAt: Date;
}

export type MarkPaidOutcome = "confirmed" | "already_confirmed" | "conflict" | "not_found";

export class BookingRepository {
  constructor(private readonly db: Db) {}

  /** Faixas ocupadas (reservas do site + bloqueios de canais) que tocam [from, to). */
  async occupiedRanges(from: IsoDate, to: IsoDate, now: Date): Promise<OccupiedRange[]> {
    return this.db.query<OccupiedRange>(
      `select check_in::text as "start", check_out::text as "end", 'booking' as "kind"
         from bookings
        where ${ACTIVE.replace("$NOW", "$3")}
          and stay && daterange($1::date, $2::date, '[)')
       union all
       select start_date::text, end_date::text, 'channel'
         from channel_blocks
        where stay && daterange($1::date, $2::date, '[)')`,
      [from, to, now.toISOString()],
    );
  }

  /**
   * Segura as datas para um hóspede. Lança DatesUnavailableError se qualquer
   * noite já estiver ocupada — a checagem final é do Postgres (exclusion constraint).
   */
  async createHold(hold: NewHold, now: Date): Promise<Booking> {
    try {
      return await this.db.transaction(async (tx) => {
        // 1. Libera holds vencidos que estejam no caminho.
        await tx.query(
          `update bookings set status = 'expired', updated_at = now()
            where status = 'pending_payment' and hold_expires_at <= $3
              and stay && daterange($1::date, $2::date, '[)')`,
          [hold.checkIn, hold.checkOut, now.toISOString()],
        );
        // 2. Bloqueios vindos do Airbnb (outra tabela, então checamos explicitamente).
        const blocked = await tx.query(
          `select 1 from channel_blocks where stay && daterange($1::date, $2::date, '[)') limit 1`,
          [hold.checkIn, hold.checkOut],
        );
        if (blocked.length > 0) throw new DatesUnavailableError();
        // 3. Insere. Se outra reserva ativa ocupar alguma noite, o Postgres recusa.
        const rows = await tx.query<Booking>(
          `insert into bookings
             (code, status, source, check_in, check_out, guests, guest_name, guest_email, guest_phone,
              notes, total_cents, hold_expires_at)
           values ($1, 'pending_payment', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           returning ${BOOKING_COLUMNS}`,
          [
            hold.code, hold.source, hold.checkIn, hold.checkOut, hold.guests, hold.guestName,
            hold.guestEmail, hold.guestPhone, hold.notes, hold.totalCents, hold.holdExpiresAt.toISOString(),
          ],
        );
        return rows[0];
      });
    } catch (err) {
      if (pgErrorCode(err) === PG_EXCLUSION_VIOLATION) throw new DatesUnavailableError();
      throw err;
    }
  }

  async findById(id: string): Promise<Booking | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const rows = await this.db.query<Booking>(`select ${BOOKING_COLUMNS} from bookings where id = $1`, [id]);
    return rows[0] ?? null;
  }

  async setPaymentRef(id: string, provider: string, ref: string): Promise<void> {
    await this.db.query(
      `update bookings set payment_provider = $2, payment_ref = $3, updated_at = now() where id = $1`,
      [id, provider, ref],
    );
  }

  /**
   * Marca a reserva como paga. Idempotente (o Mercado Pago pode avisar mais de uma vez).
   * Se o prazo tinha vencido e alguém pegou as datas, vira 'payment_conflict' (reembolsar).
   */
  async markPaid(id: string, provider: string, ref: string): Promise<{ outcome: MarkPaidOutcome; booking: Booking | null }> {
    return this.db.transaction(async (tx) => {
      const rows = await tx.query<{ status: BookingStatus }>(
        `select status from bookings where id = $1 for update`,
        [id],
      );
      if (rows.length === 0) return { outcome: "not_found" as const, booking: null };
      const { status } = rows[0];

      if (status === "confirmed" || status === "payment_conflict") {
        const booking = await this.findByIdTx(tx, id);
        return { outcome: status === "confirmed" ? ("already_confirmed" as const) : ("conflict" as const), booking };
      }

      if (status === "pending_payment" || status === "expired") {
        try {
          // savepoint: se a exclusion constraint recusar, a transação continua utilizável
          await tx.query(`savepoint confirm_attempt`);
          await tx.query(
            `update bookings
                set status = 'confirmed', confirmed_at = now(), hold_expires_at = null,
                    payment_provider = $2, payment_ref = $3, updated_at = now()
              where id = $1`,
            [id, provider, ref],
          );
          await tx.query(`release savepoint confirm_attempt`);
          return { outcome: "confirmed" as const, booking: await this.findByIdTx(tx, id) };
        } catch (err) {
          if (pgErrorCode(err) !== PG_EXCLUSION_VIOLATION) throw err;
          await tx.query(`rollback to savepoint confirm_attempt`);
        }
      }

      // cancelada, ou expirada com as datas já tomadas por outra reserva
      await tx.query(
        `update bookings set status = 'payment_conflict', payment_provider = $2, payment_ref = $3, updated_at = now()
          where id = $1`,
        [id, provider, ref],
      );
      return { outcome: "conflict" as const, booking: await this.findByIdTx(tx, id) };
    });
  }

  /** Bloqueio feito pelo proprietário (uso próprio, manutenção...). Também vai para o Airbnb. */
  async createManualBlock(code: string, checkIn: IsoDate, checkOut: IsoDate, note: string | null): Promise<Booking> {
    try {
      const rows = await this.db.query<Booking>(
        `insert into bookings
           (code, status, source, check_in, check_out, guests, guest_name, guest_email, guest_phone, notes,
            total_cents, confirmed_at)
         values ($1, 'confirmed', 'manual', $2, $3, 1, 'Bloqueio do proprietário', '-', '-', $4, 0, now())
         returning ${BOOKING_COLUMNS}`,
        [code, checkIn, checkOut, note],
      );
      return rows[0];
    } catch (err) {
      if (pgErrorCode(err) === PG_EXCLUSION_VIOLATION) throw new DatesUnavailableError();
      throw err;
    }
  }

  async cancel(id: string): Promise<void> {
    await this.db.query(`update bookings set status = 'cancelled', updated_at = now() where id = $1`, [id]);
  }

  async expireStaleHolds(now: Date): Promise<number> {
    const rows = await this.db.query(
      `update bookings set status = 'expired', updated_at = now()
        where status = 'pending_payment' and hold_expires_at <= $1 returning id`,
      [now.toISOString()],
    );
    return rows.length;
  }

  /** Reservas que devem aparecer como ocupadas para os canais externos (export iCal). */
  async listExportable(fromDate: IsoDate, now: Date): Promise<Booking[]> {
    return this.db.query<Booking>(
      `select ${BOOKING_COLUMNS} from bookings
        where ${ACTIVE.replace("$NOW", "$2")} and check_out >= $1::date
        order by check_in`,
      [fromDate, now.toISOString()],
    );
  }

  async listUpcoming(fromDate: IsoDate, limit = 100): Promise<Booking[]> {
    return this.db.query<Booking>(
      `select ${BOOKING_COLUMNS} from bookings
        where check_out >= $1::date and status in ('pending_payment', 'confirmed', 'payment_conflict')
        order by check_in limit $2`,
      [fromDate, limit],
    );
  }

  /** Reservas do site que batem com bloqueios do canal (aconteceu reserva dupla). */
  async findChannelConflicts(now: Date): Promise<Array<{ booking: Booking; channel: string; channelUid: string }>> {
    const rows = await this.db.query<Booking & { channel: string; channelUid: string }>(
      `select ${BOOKING_COLUMNS}, c.channel as "channel", c.uid as "channelUid"
         from bookings
         join (select channel, external_uid as uid, stay as cstay from channel_blocks) c
           on bookings.stay && c.cstay
        where ${ACTIVE.replace("$NOW", "$1")}`,
      [now.toISOString()],
    );
    return rows.map(({ channel, channelUid, ...booking }) => ({ booking, channel, channelUid }));
  }

  private async findByIdTx(tx: Db, id: string): Promise<Booking | null> {
    const rows = await tx.query<Booking>(`select ${BOOKING_COLUMNS} from bookings where id = $1`, [id]);
    return rows[0] ?? null;
  }
}

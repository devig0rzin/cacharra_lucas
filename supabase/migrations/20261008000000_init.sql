-- Chácara Serra Verde — esquema inicial do motor de reservas.
--
-- Garantia principal: duas reservas ativas NUNCA ocupam a mesma noite.
-- Isso é imposto pelo próprio Postgres (exclusion constraint), não pelo código,
-- então vale mesmo com dois hóspedes clicando "reservar" no mesmo segundo.

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  status           text not null
                   check (status in ('pending_payment', 'confirmed', 'cancelled', 'expired', 'payment_conflict')),
  source           text not null default 'site' check (source in ('site', 'manual')),
  check_in         date not null,
  check_out        date not null,
  -- intervalo semiaberto [check_in, check_out): a noite do check-out não é ocupada
  stay             daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  guests           integer not null check (guests > 0),
  guest_name       text not null,
  guest_email      text not null,
  guest_phone      text not null,
  notes            text,
  total_cents      integer not null check (total_cents >= 0),
  hold_expires_at  timestamptz,
  payment_provider text,
  payment_ref      text,
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint bookings_dates_order check (check_out > check_in),
  constraint bookings_no_overlap
    exclude using gist (stay with &&)
    where (status in ('pending_payment', 'confirmed'))
);

create index if not exists bookings_status_check_in_idx on bookings (status, check_in);
create unique index if not exists bookings_payment_ref_idx on bookings (payment_provider, payment_ref)
  where payment_ref is not null;

-- Datas bloqueadas vindas de canais externos (Airbnb via iCal).
-- Ficam separadas das reservas do site: são substituídas a cada sincronização.
create table if not exists channel_blocks (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null,
  external_uid  text not null,
  summary       text,
  start_date    date not null,
  end_date      date not null,
  stay          daterange generated always as (daterange(start_date, end_date, '[)')) stored,
  updated_at    timestamptz not null default now(),
  constraint channel_blocks_dates_order check (end_date > start_date),
  constraint channel_blocks_uid unique (channel, external_uid)
);

create index if not exists channel_blocks_stay_idx on channel_blocks using gist (stay);

-- Histórico das sincronizações (para o painel mostrar "última sincronização").
create table if not exists channel_sync_runs (
  id           bigint generated always as identity primary key,
  channel      text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  events       integer,
  error        text
);

create index if not exists channel_sync_runs_channel_idx on channel_sync_runs (channel, started_at desc);

-- Reserva dupla detectada (site × canal): registra para avisar o proprietário uma única vez.
create table if not exists channel_conflict_alerts (
  booking_id   uuid not null references bookings (id) on delete cascade,
  channel      text not null,
  external_uid text not null,
  alerted_at   timestamptz not null default now(),
  primary key (booking_id, channel, external_uid)
);

-- No Supabase, tabelas do schema public ficam expostas pela API REST.
-- O site acessa o banco pelo servidor (conexão direta), então ligamos RLS
-- SEM políticas: a chave pública (anon) não lê nem escreve nada.
alter table bookings enable row level security;
alter table channel_blocks enable row level security;
alter table channel_sync_runs enable row level security;
alter table channel_conflict_alerts enable row level security;

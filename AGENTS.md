<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Chácara Serra Verde — instruções para agentes (Codex e outros)

Site institucional + motor de reservas próprio de uma chácara para temporada.
Hóspede escolhe datas → paga no Mercado Pago → recebe confirmação por e-mail.
Disponibilidade sincronizada com o Airbnb por iCal. Spec completa em
`docs/superpowers/specs/2026-10-08-sistema-reservas-design.md`.

## Comandos

| O quê | Comando |
|---|---|
| Rodar local (sem nenhuma conta externa) | `npm run dev` → http://localhost:3000 |
| Testes de unidade/integração (Postgres real via PGlite) | `npm test` |
| Testes no navegador (fluxo completo) | `npm run test:e2e` |
| Tudo antes de abrir PR | `npm run check` (lint + tipos + testes + build) |

Sem `.env.local`, o projeto roda com: banco PGlite em `.data/`, pagamento simulado
(`/pagamento-simulado`) e e-mails impressos no terminal. Painel: `/admin`, senha `admin1234`.

## Arquitetura (respeite as fronteiras)

```
src/config/property.ts      ← TODOS os valores de negócio (preço, mín. noites, horários, textos)
src/lib/                    ← utilitários puros (datas ISO, interface Db)
src/modules/
  booking/                  ← regras, disponibilidade, reservas (núcleo)
  channels/                 ← iCal: importar Airbnb, exportar reservas do site
  payments/                 ← PaymentProvider: Mercado Pago | mock
  notifications/            ← e-mails (Resend | console)
src/server/
  container.ts              ← ÚNICO lugar que escolhe implementações (raiz de composição)
  reservations.ts           ← casos de uso que cruzam módulos (reserva + pagamento)
  env.ts, admin-auth.ts
src/app/                    ← páginas, server actions e rotas HTTP (finas: chamam getServices())
supabase/migrations/        ← SQL versionado (Supabase em produção, PGlite em dev/testes)
tests/                      ← vitest (unidade + integração) e tests/e2e (Playwright)
```

Regras:
- Um módulo **não importa a implementação** de outro; depende de interfaces
  (`BookingNotifier`, `ChannelSource`, `PaymentProvider`, `Db`). Ligação só em `src/server/container.ts`.
- `src/modules/booking/domain.ts` é puro (sem I/O) e roda no navegador também.
- Páginas e rotas não falam com o banco diretamente: usam `getServices()`.

## Invariantes que NÃO podem quebrar

1. **Duas reservas ativas nunca ocupam a mesma noite.** Garantido pela exclusion
   constraint `bookings_no_overlap` no Postgres. Nunca remova/afrouxe sem teste equivalente.
2. Datas são strings ISO `YYYY-MM-DD`, intervalos **semiabertos** `[check_in, check_out)`:
   o dia de saída pode ser o dia de entrada de outro hóspede. "Hoje" = fuso `America/Sao_Paulo`.
3. Dinheiro sempre em **centavos inteiros** (`totalCents`).
4. Webhook do Mercado Pago: **verificar assinatura** e **reconsultar o pagamento na API**
   antes de confirmar. Confirmação é idempotente.
5. O iCal exportado para o Airbnb **não contém dados pessoais** do hóspede.
6. Falha ao baixar o calendário do Airbnb **não apaga** bloqueios já conhecidos.
7. Valores de negócio só em `src/config/property.ts` — nada de número mágico espalhado.

## Banco de dados

- Mudança de esquema = **novo arquivo** em `supabase/migrations/` (`AAAAMMDDHHMMSS_descricao.sql`).
  Nunca edite uma migration já aplicada em produção.
- Toda tabela nova: `alter table ... enable row level security;` (o site acessa pelo servidor;
  a API pública do Supabase não deve ler nada).
- O mesmo SQL precisa rodar no PGlite (os testes provam isso).

## Como trabalhar (skills em `.agents/skills/`)

- Funcionalidade nova ou mudança de comportamento → `brainstorming` antes de codar;
  depois `writing-plans`.
- Implementação → `test-driven-development` (teste falhando primeiro).
- Bug → `systematic-debugging` (causa raiz antes de corrigir).
- Antes de dizer "pronto" → `verification-before-completion` (rode `npm run check`).
- Mudou pagamento, painel, webhooks ou dados pessoais → `security-review`.
- SQL / migrations → `supabase-postgres-best-practices`.
- UI → `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices`,
  `vercel-composition-patterns`; componentes com `shadcn` se for adicionar biblioteca de UI.
- Animações (topo, galeria) → `gsap-*`, `scroll-cinema`, `animate`; revisar com `review-animations`.
  Respeitar `prefers-reduced-motion`.
- Testes no navegador → `webapp-testing`.

## Convenções

- Textos da interface em **português do Brasil**; código (nomes de variáveis, funções) em inglês;
  comentários em português.
- Sem dependência nova sem motivo claro (o projeto é pequeno e deve continuar barato de manter).
- Commits pequenos, mensagem no imperativo (`feat: ...`, `fix: ...`, `docs: ...`).

## Definição de pronto

`npm run check` passa, `npm run test:e2e` passa, e o comportamento novo tem teste.

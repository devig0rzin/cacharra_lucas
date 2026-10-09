# Chácara Serra Verde

Site + sistema de reservas: o hóspede escolhe as datas, paga no Mercado Pago (Pix ou
cartão) e recebe a confirmação por e-mail. A agenda é sincronizada com o Airbnb.

## Rodar na sua máquina

Precisa de Node 22+.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem configurar nada, tudo funciona em modo local:

- **Banco:** Postgres embutido (PGlite) salvo em `.data/`. Para zerar, apague a pasta.
- **Pagamento:** tela de pagamento simulado (botão "Aprovar pagamento").
- **E-mails:** aparecem no terminal.
- **Painel do proprietário:** http://localhost:3000/admin, senha `admin1234`.

## Testes

```bash
npm test            # regras de reserva, banco, Airbnb e Mercado Pago (sem internet)
npm run test:e2e    # navegador: reserva completa, bloqueio de datas, Airbnb, painel
npm run check       # lint + tipos + testes + build
```

No primeiro uso do `test:e2e`: `npx playwright install chromium`.

## Como funciona

| Peça | Onde |
|---|---|
| Valores e textos (preço, mínimo de noites, horários, regras) | `src/config/property.ts` |
| Motor de reservas | `src/modules/booking/` |
| Airbnb (iCal) | `src/modules/channels/` |
| Mercado Pago | `src/modules/payments/` |
| E-mails | `src/modules/notifications/` |
| Banco (SQL) | `supabase/migrations/` |

Garantia principal: o próprio Postgres recusa duas reservas na mesma noite, mesmo se
dois hóspedes clicarem ao mesmo tempo.

### Endereços úteis

| URL | Para quê |
|---|---|
| `/reservar` | Calendário e reserva |
| `/reserva/{id}` | Situação da reserva (o hóspede volta para cá depois de pagar) |
| `/admin` | Painel: reservas, bloquear datas, status do Airbnb |
| `/api/calendario/{ICAL_EXPORT_TOKEN}.ics` | Link para colar no Airbnb |
| `/api/webhooks/mercadopago` | Configurar como webhook no Mercado Pago |
| `/api/cron/sincronizar` | Chamado a cada 15 min pelo GitHub Actions |

## Publicar

Passo a passo em [`docs/ROADMAP.md`](docs/ROADMAP.md) (Fase 2) e variáveis em
[`.env.example`](.env.example). Decisões de arquitetura em
[`docs/superpowers/specs/`](docs/superpowers/specs/).

## Trabalhando com o Codex

`AGENTS.md` traz as regras do projeto e `.agents/skills/` as skills de
desenvolvimento (o Codex lê essa pasta automaticamente).

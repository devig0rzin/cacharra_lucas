# Chácara Serra Verde — site + sistema de reservas (design)

Data: 2026-10-08 · Status: esqueleto implementado, valores de negócio provisórios

## Objetivo

Site da chácara que apresenta a propriedade e permite ao hóspede escolher datas,
pagar (Pix/cartão via Mercado Pago) e receber confirmação por e-mail, sem conta
nem login. A agenda do site e a do Airbnb não podem gerar reserva dupla.

Base: Proposta Comercial ATY (R$ 3.500, escopo fechado). Mockup aprovado define a
direção visual (verde-floresta, creme, título serifado, busca de datas no topo).

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Motor de reservas | Próprio (opção A) | Sem mensalidade de channel manager; controle total; Mercado Pago nativo |
| Stack | Next.js 16 (App Router) + TypeScript + Tailwind 4 | Padrão das skills do time; deploy simples |
| Banco | Supabase Postgres (plano gratuito) | 500 MB sobram por décadas; projeto não pausa porque o sync roda a cada 15 min |
| Banco local/testes | PGlite (Postgres em WASM) | Mesmo SQL de produção, zero instalação |
| Airbnb | iCal nos dois sentidos | Airbnb não abre API para novos parceiros |
| Pagamento | Mercado Pago Checkout Pro + webhook | Pix e cartão sem lidar com dados de cartão |
| E-mail | Resend (plano gratuito) | API simples; console em dev |
| Hospedagem | Vercel Pro (US$ 20/mês) ou Cloudflare Workers pago | Plano Hobby da Vercel proíbe uso comercial |
| Agendador | GitHub Actions a cada 15 min | Gratuito e independe da hospedagem |

## Regras de reserva (provisórias — `src/config/property.ts`)

- Diária com pernoite; entrada 14h, saída 12h; **mínimo 2 noites**, máximo 30.
- R$ 600/noite, sem taxa de limpeza, até 15 hóspedes, reservas até 365 dias à frente.
- Datas seguradas por 30 min enquanto o hóspede paga.

## Fluxo

1. Hóspede escolhe datas no calendário (`/reservar`), que mostra noites ocupadas
   (reservas do site + bloqueios do Airbnb).
2. Ao enviar os dados: valida regras → atualiza o calendário do Airbnb se estiver com
   mais de 1 min → cria reserva `pending_payment` com prazo → cria checkout no Mercado Pago.
3. Mercado Pago chama `/api/webhooks/mercadopago` → assinatura verificada → pagamento
   reconsultado na API → reserva `confirmed` → e-mail para hóspede e proprietário.
4. A cada 15 min (`/api/cron/sincronizar`): importa o iCal do Airbnb, expira holds
   vencidos e avisa o proprietário se detectar sobreposição site × Airbnb.
5. O Airbnb importa `/api/calendario/{token}.ics` (reservas do site, sem dados pessoais).

Estados: `pending_payment → confirmed | expired | cancelled`; pagamento que chega
após o prazo com datas já tomadas → `payment_conflict` (proprietário reembolsa).

## Dados

- `bookings` — reservas do site e bloqueios manuais. Exclusion constraint
  `exclude using gist (stay with &&) where status in ('pending_payment','confirmed')`.
- `channel_blocks` — datas ocupadas vindas do Airbnb, substituídas a cada sync.
- `channel_sync_runs` — histórico de sincronizações (painel mostra a última).
- `channel_conflict_alerts` — evita avisar o mesmo conflito duas vezes.
- RLS ligado em tudo, sem políticas (acesso só pelo servidor).

## Riscos conhecidos

- **Atraso do Airbnb (até ~3 h para importar nosso calendário).** Uma reserva feita no
  site pode não aparecer no Airbnb imediatamente. Mitigações: anúncio do Airbnb em
  "pedido de reserva" (não instantânea); alerta automático de reserva dupla; no futuro,
  trocar o `ChannelSource` por um channel manager com API oficial, sem mexer no resto.
- **Dados pessoais (LGPD):** nome, e-mail e telefone ficam no banco do cliente. Backup
  criptografado; página de política de privacidade ainda a escrever.

## Pendências com o cliente

Preço por noite (e se muda em fim de semana/feriado/temporada), taxa de limpeza,
capacidade, horários, política de cancelamento e reembolso, caução, pets, day use,
endereço, contatos, fotos e vídeos, domínio, contas (Supabase, Mercado Pago, Resend,
Vercel, GitHub) em nome do cliente.

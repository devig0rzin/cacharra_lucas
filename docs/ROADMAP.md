# Próximos passos

Cada item abaixo deve passar por `brainstorming` → `writing-plans` → TDD (ver AGENTS.md).

## Fase 1 — fechar com o cliente (bloqueia publicação)
- [ ] Valores reais em `src/config/property.ts` (preço, limpeza, capacidade, horários, regras, contatos)
- [ ] Preço variável: fim de semana / feriado / temporada (`quoteStay` em `modules/booking/domain.ts`)
- [ ] Política de cancelamento + página de termos e privacidade (LGPD)
- [ ] Fotos e vídeo reais no lugar dos placeholders (`next/image`, vídeo no YouTube/Vimeo)

## Fase 2 — colocar no ar
- [ ] Criar contas em nome do cliente: Supabase, Mercado Pago, Resend, Vercel, GitHub
- [ ] Aplicar `supabase/migrations/*` no Supabase (SQL Editor ou `supabase db push`)
- [ ] Variáveis de ambiente na hospedagem (ver `.env.example`)
- [ ] Mercado Pago: credenciais de TESTE → compra de teste → webhook → credenciais de produção
- [ ] Airbnb: colar o link de exportação do site; copiar o link do Airbnb para `AIRBNB_ICAL_URL`
- [ ] Anúncio do Airbnb em "pedido de reserva" (reduz risco de reserva dupla)
- [ ] Secrets do GitHub: `SITE_URL`, `CRON_SECRET`, `DATABASE_URL`, `BACKUP_PASSPHRASE`
- [ ] Domínio + e-mail remetente verificado no Resend

## Fase 3 — acabamento
- [ ] Animação do topo (GSAP / scroll-cinema) com `prefers-reduced-motion`
- [ ] SEO: sitemap, Open Graph, dados estruturados (LodgingBusiness)
- [ ] Limite de tentativas no formulário de reserva e no login do painel
- [ ] Painel: reenviar e-mail de confirmação, editar reserva, exportar CSV
- [ ] Lembrete por e-mail 2 dias antes do check-in

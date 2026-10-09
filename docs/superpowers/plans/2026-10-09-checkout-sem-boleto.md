# Checkout sem boleto e título legível Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir meios de pagamento incompatíveis com a retenção de 30 minutos e tornar o título da cobrança legível.

**Architecture:** Uma função pura em `src/lib/dates.ts` formata intervalos para exibição externa; o adaptador Mercado Pago usa essa função e envia a exclusão documentada de `ticket` e `atm`. Nenhuma regra de reserva muda.

**Tech Stack:** TypeScript, Vitest, API Checkout Pro do Mercado Pago.

**Spec:** seção “Tarefa extra” do briefing anexado.

## Global Constraints

- Confirmar ids na documentação oficial atual do Mercado Pago.
- Manter Pix e cartão disponíveis.
- Implementar com teste falhando primeiro e em commit separado da interface.

## Review Focus

- Intervalos no mesmo ano omitem o ano na primeira data.
- Intervalos entre anos mostram ambos os anos.
- A exclusão contém exatamente `ticket` e `atm`, sem `bank_transfer`.
- Datas inválidas não entram na função por contrato `IsoDate` já validado nas fronteiras.
- O valor e a referência externa da preferência permanecem inalterados.

---

### Task 1: Formatação legível do intervalo

**Files:**
- Modify: `src/lib/dates.ts`
- Create: `tests/lib/dates.test.ts`

**Interfaces:**
- Produces: `formatDateRangeShort(checkIn: IsoDate, checkOut: IsoDate): string`.

- [ ] Criar testes para `2026-10-10`–`2026-10-12` → `10 out a 12 out 2026` e `2026-12-30`–`2027-01-02` → `30 dez 2026 a 2 jan 2027`; confirmar falha.
- [ ] Implementar com `Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" })` ou mapeamento estável equivalente.
- [ ] Rodar o arquivo de teste e a suíte.

### Task 2: Preferência sem boleto

**Files:**
- Modify: `src/modules/payments/mercadopago.ts`, `tests/payments/mercadopago.test.ts`

**Interfaces:**
- Consumes: `formatDateRangeShort` da Task 1.

- [ ] Adicionar asserções do título e de `payment_methods.excluded_payment_types`; confirmar falha.
- [ ] Usar o título formatado e enviar ids `ticket` e `atm`.
- [ ] Rodar teste direcionado, `npm run check` e `npm run test:e2e`.
- [ ] Fazer revisão de segurança do diff de pagamento.
- [ ] Commit: `fix: checkout sem boleto e título legível`.
- [ ] Fazer push da branch publicada pela Vercel.


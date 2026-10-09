# Chácara Serra Verde UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduzir o mockup aprovado em todas as páginas visíveis sem alterar o comportamento do motor de reservas.

**Architecture:** A home permanece um Server Component composto por seções pequenas; menu, vídeo e calendário ficam em ilhas client-side. Conteúdo e mídia saem de manifestos tipados, e os contratos atuais de rotas e testes permanecem estáveis.

**Tech Stack:** Next.js 16.4 App Router com Cache Components, React 19, Tailwind CSS 4, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-ui-redesign.md`

## Global Constraints

- Textos de interface em português do Brasil; nomes de código em inglês.
- Não alterar `src/modules/**`, `src/server/**`, APIs, migrations ou `bookingRules` nesta fase.
- Manter a home majoritariamente server-side e toda leitura de runtime dentro de `Suspense`.
- Usar `next/image`, dimensões explícitas, `sizes` e `priority` apenas no hero quando houver arquivo real.
- Preservar todos os seletores listados na tarefa e respeitar `prefers-reduced-motion`.
- Nenhuma dependência nova é necessária.

## Review Focus

- Larguras de 360px não podem criar rolagem horizontal; validar na captura mobile.
- Sem vídeo configurado, o botão de reprodução deve desaparecer; cobrir com teste de componente/configuração.
- Falha da disponibilidade deve oferecer “Tentar de novo” sem recarregar a página; cobrir no fluxo client-side.
- O calendário deve manter somente um dia no `tabIndex=0` e aceitar setas/Enter/Espaço; cobrir em teste de navegador.
- A barra mobile “Continuar” deve rolar ao formulário e não duplicar “Ir para o pagamento”; cobrir no E2E.

---

### Task 1: Fundamentos visuais, mídia, cabeçalho e rodapé

**Files:**
- Create: `src/config/content.ts`, `src/config/media.ts`, `src/components/site/BrandMark.tsx`, `src/components/site/MobileNavigation.tsx`, `src/components/site/MediaFrame.tsx`, `public/media/LEIA-ME.md`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/site/SiteHeader.tsx`, `src/components/site/SiteFooter.tsx`, `src/components/site/WhatsAppButton.tsx`
- Test: `tests/e2e/reserva.spec.ts`

**Interfaces:**
- Produces: `MediaAsset`, `media`, `homeContent`, `MediaFrame({ asset, sizes, priority, className })`.

- [ ] Adicionar asserções E2E para link de salto, navegação mobile e foco contido; executar o teste e confirmar falha.
- [ ] Implementar tokens, marca, navegação acessível, rodapé e manifesto/placeholder de mídia.
- [ ] Executar os testes direcionados e `npm run check`; corrigir somente falhas relacionadas.
- [ ] Commit: `feat: cria base visual e navegação do site`.

### Task 2: Hero, busca e seções da home

**Files:**
- Create: `src/components/site/HomeSections.tsx`, `src/components/site/VideoDialog.tsx`
- Modify: `src/app/page.tsx`, `src/components/booking/DateSearchForm.tsx`, `src/components/site/HeroLandscape.tsx`, `src/config/content.ts`
- Test: `tests/e2e/reserva.spec.ts`

**Interfaces:**
- Consumes: `media`, `homeContent`, `MediaFrame` da Task 1.
- Produces: seções com ids `a-chacara`, `acomodacoes`, `experiencias`, `galeria`, `localizacao`.

- [ ] Estender E2E com títulos/âncoras, campos nativos de data e ausência de overflow; executar e confirmar falha.
- [ ] Implementar hero, selos, barra de reserva, confiança e seções na ordem do briefing.
- [ ] Implementar apenas a animação de entrada do hero e as microinterações previstas em CSS.
- [ ] Executar testes direcionados e `npm run check`.
- [ ] Commit: `feat: redesenha home conforme mockup aprovado`.

### Task 3: Calendário e fluxo de reserva

**Files:**
- Modify: `src/app/reservar/page.tsx`, `src/components/booking/BookingFlow.tsx`, `src/components/booking/AvailabilityCalendar.tsx`
- Test: `tests/e2e/reserva.spec.ts`

**Interfaces:**
- Produces: calendário responsivo, `retryAvailability()`, roving tabindex e prévia de intervalo via `hoverDate`.

- [ ] Escrever E2E para 1/2 meses, roving tabindex, teclado, retry e barra “Continuar”; executar e confirmar falha.
- [ ] Implementar o calendário responsivo sem alterar a semântica `data-state`.
- [ ] Implementar skeleton, retry, resumo fixo e barra mobile que rola até `#booking-form`.
- [ ] Executar testes direcionados e `npm run check`.
- [ ] Commit: `feat: aprimora experiência de seleção e reserva`.

### Task 4: Status, painel e pagamento simulado

**Files:**
- Modify: `src/app/reserva/[id]/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/BlockDatesForm.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/login/LoginForm.tsx`, `src/app/pagamento-simulado/page.tsx`
- Test: `tests/e2e/reserva.spec.ts`

**Interfaces:**
- Consumes: componentes do site e tokens globais.

- [ ] Estender E2E com horários, “Como chegar” e WhatsApp no status; executar e confirmar falha.
- [ ] Aplicar a linguagem visual comum e preservar textos/data-testids existentes.
- [ ] Executar testes direcionados e `npm run check`.
- [ ] Commit: `feat: alinha páginas operacionais à nova interface`.

### Task 5: Revisão visual e entrega da interface

**Files:**
- Modify: `tests/e2e/reserva.spec.ts`
- Create: `docs/design/capturas/*.png`

- [ ] Rodar `npm run test:e2e`.
- [ ] Rodar capturas com `SCREENSHOT_DIR=docs/design/capturas` nos viewports exigidos, incluindo confirmação.
- [ ] Comparar com os mockups e corrigir contraste, foco, overflow e ritmo visual.
- [ ] Rodar `npm run check` e `npm run test:e2e` novamente.


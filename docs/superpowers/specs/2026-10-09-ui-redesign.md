# Redesign da interface da Chácara Serra Verde

## Objetivo

Reproduzir a direção visual aprovada nos mockups desktop e mobile sem alterar regras de reserva, integrações ou contratos usados pelos testes. A experiência deve transmitir refúgio rural acolhedor e sofisticado, levar o hóspede rapidamente à consulta de datas e manter a operação do proprietário legível em qualquer tela.

## Sistema visual

### Cores

- `forest`: `#174C32` — ações principais, ícones e títulos de apoio.
- `forest-deep`: `#0D3423` — rodapé, texto de alto contraste e estados pressionados.
- `moss`: `#5F765D` — apoio, estados suaves e ilustrações.
- `cream`: `#F7F4EC` — fundo editorial da home.
- `sand`: `#E7DDC9` — divisores e superfícies secundárias.
- `sun`: `#D49B45` — foco e pequenos acentos, nunca grandes áreas.
- `ink`: `#17231C`; `muted`: `#5E6B62`; `danger`: `#A53B32`.

### Tipografia

- Títulos: Fraunces Variable, peso 520–650, escala fluida de `2rem` a `4.75rem`, entrelinha de `0.98–1.1`.
- Interface e corpo: Inter Variable, `0.875rem–1.125rem`, entrelinha de `1.45–1.7`.
- Texto corrido limitado a aproximadamente 68 caracteres; botões em sentence case.

### Forma, espaço e elevação

- Conteúdo central: máximo de `76rem`; navegação flutuante: máximo de `88rem`.
- Raios: `0.75rem` em campos, `1.125rem` em cartões internos, `1.75rem` em cartões principais e `999px` apenas em ações-pílula.
- Sombras: baixa `0 8px 28px rgba(13,52,35,.08)`; flutuante `0 18px 55px rgba(13,36,25,.18)`.
- Espaçamento de seção: `4.5rem–7rem`, com sobreposição controlada da barra de reserva sobre o hero.

## Princípios

1. A fotografia da propriedade é o momento memorável; placeholders preservam a proporção e informam o arquivo esperado sem fingir material real.
2. Superfícies brancas só aparecem quando comunicam ação ou agrupamento; o restante usa ritmo editorial e áreas abertas.
3. Movimento não compete com o conteúdo: uma entrada orquestrada no hero e microinterações de resposta, todas anuladas por `prefers-reduced-motion`.
4. A home permanece majoritariamente no servidor; somente menu, modal e reserva/calendário hidratam no cliente.

## Wireframes

### Home — desktop

```text
┌──────────────── foto/hero em largura total ────────────────┐
│  [logo]       navegação                         [reservar] │
│                                                            │
│  contexto                                                   │
│  H1 grande                                                  │
│  descrição                                                  │
│  [selo] [selo] [selo]                                      │
│       ┌ check-in | check-out | hóspedes | disponibilidade ┐ │
└───────┴────────────────────────────────────────────────────┴─┘
          confiança / Mercado Pago / confirmação

┌──────── vídeo 7/12 ───────┐   ┌──── apresentação 5/12 ────┐
└────────────────────────────┘   └────────────────────────────┘

Destaques                                     ver comodidades
[foto] [foto] [foto] [foto]

Acomodações: texto + mosaico de fotos
Experiências: três faixas editoriais
Galeria: mosaico assimétrico
Localização + como chegar | regras da casa
Contato/WhatsApp
Rodapé
```

### Home — celular

```text
┌ logo                         menu ┐
│ hero/foto                         │
│ contexto                          │
│ H1                                │
│ texto                             │
│ selos em três colunas             │
│ ┌ check-in ─────────────────────┐ │
│ ├ check-out ────────────────────┤ │
│ ├ hóspedes ─────────────────────┤ │
│ └ disponibilidade ──────────────┘ │
└────────────────────────────────────┘
 confiança
[vídeo]
apresentação
destaques em grade/rolagem natural
demais seções empilhadas
```

### Reserva — desktop e celular

```text
desktop: [ calendário de 2 meses ] [ resumo/formulário fixo ]
mobile:  [ calendário de 1 mês ]
         [ resumo/formulário ]
         [ total | Continuar ] barra fixa após cotação
```

### Páginas operacionais

```text
status:      cabeçalho + cartão de estado + datas/horários + ações
admin:       cabeçalho + sincronização + bloqueio + lista de reservas
pagamento:   cabeçalho + resumo central + ação Aprovar pagamento
```

## Componentes

- `BrandMark`, `SiteHeader`, `MobileNavigation`, `SiteFooter`, `WhatsAppButton`.
- `MediaFrame` e manifesto `media` como fonte única de imagens e vídeo.
- `HeroSection`, `TrustStrip`, `VideoCard`, `VideoDialog`, `SectionHeading`, `FeatureIcon`.
- Seções server-side: `WelcomeSection`, `HighlightsSection`, `AccommodationsSection`, `ExperiencesSection`, `GallerySection`, `LocationRulesSection`, `ContactSection`.
- Reserva: `DateSearchForm`, `BookingFlow`, `AvailabilityCalendar`, `BookingSummary`, `MobileBookingBar`.

## Acessibilidade e responsividade

- Link “Pular para o conteúdo”, um `h1` por página, foco visível e alvos mínimos de 44px.
- Menu modal com `aria-expanded`, fechamento por Esc, bloqueio de rolagem e ciclo de foco.
- Modal de vídeo com rótulo, fechamento por Esc, retorno de foco e iframe sem autoplay com som.
- Calendário com roving tabindex; setas movem foco, Enter/Espaço selecionam e hover antecipa o intervalo apenas onde existe ponteiro preciso.
- Nenhuma rolagem horizontal a 360px; mídia mantém razão de aspecto antes do carregamento.

## Conteúdo e mídia

`src/config/media.ts` contém `id`, `src`, `alt`, `width`, `height`, `focalPoint` e `blurDataURL` opcional. Se o arquivo não existir no manifesto, `MediaFrame` mostra um placeholder editorial com o nome solicitado. A troca futura exige apenas adicionar o arquivo em `public/media/` e atualizar o `src` correspondente no manifesto.

## Critérios de aceite

- Seletores e textos exigidos por `tests/e2e/reserva.spec.ts` continuam válidos.
- `npm run check` e `npm run test:e2e` passam.
- Capturas em 1440×900 e 390×844 cobrem home, reserva e confirmação.
- A diferença inevitável para o mockup fica limitada às fotografias ainda não fornecidas e aos dados provisórios de endereço/contato.


# Frames A/B e vídeo de transição gerados por IA

Cada cena de scroll cinema tem três peças: **frame A** (primeiro quadro), **frame B** (último quadro) e **vídeo de transição** entre os dois. Tudo o que não faz parte da jornada precisa ficar idêntico entre A e B. Se algo mudar, o vídeo "derrete" no meio da cena.

## A ordem, que não pode ser trocada

1. **Frame A.** Gere e aprove. Se sair errado, regenere o A; não siga adiante com um A ruim.
2. **Frame B.** Numa conversa nova, com o A aprovado como **referência única**, peça para reproduzir a imagem mudando só o que a jornada muda (chão, luz, estação, estágio da obra).
   - Nunca coloque candidatos descartados na mesma conversa. O modelo mistura tudo e inventa um objeto novo.
   - Nunca use um B antigo como referência para um B novo. Os erros se acumulam.
3. **Zoom.** Amplie A e B lado a lado nos pontos fixos: portas, escadas, divisões de janela, proporções, cor de materiais. Texto inventado, marca d'água e janela torta só aparecem no zoom, e é aqui que se economiza crédito de vídeo.
4. **Resolução.** Leve A e B a 1920 px de largura antes de mandar ao gerador de vídeo. Vários geradores devolvem o vídeo na resolução da entrada.
5. **Vídeo.** Frame A como primeiro quadro, frame B como último, 5–10 s, câmera fixa (ou um único movimento contínuo).
6. **Encoding.** `bash scripts/build-videos.sh <nome> <fps> <crf>` e só depois teste o scroll.

## Template de prompt do frame A

```
Ultra-photorealistic [tipo de foto], single fixed camera, [lente]mm lens,
camera height [altura] meters, [posição da câmera], looking [direção].

THE [OBJETO PRINCIPAL] (must stay identical in every frame): [descrição com
medidas, materiais, cores, quantidades — ex.: "5-step travertine stair",
"dark bronze frames", "26 meters wide"]. No [elementos proibidos].

THE [ELEMENTO QUE VAI MUDAR] (this is the state that will change): [estado inicial].

LIGHT: [hora do dia, direção do sol, clima].

NEGATIVE: no text, no letters, no numbers, no logos, no watermarks, no people.
```

## Template de prompt do frame B

```
Reproduce this exact image with only [N] changes. Everything else must stay
pixel-identical: the same camera position, distance, focal length, framing,
horizon line, and the same [objeto principal] at the same size in the frame.

THE [OBJETO PRINCIPAL] MUST NOT CHANGE IN ANY WAY. [Repita os detalhes fixos
que mais derivam: porta, escada, divisões de vidro, materiais.]

CHANGE ONLY THESE THINGS:
1. [mudança 1, descrita em detalhe]
2. [mudança 2]

NEGATIVE: no text, no letters, no numbers, no logos, no watermarks, no people,
no change to the [objeto], no camera movement, no zoom, no new architecture.
```

## Quando o gerador insiste em colocar texto na imagem

Não recomponha a cena. Peça uma edição mínima usando **uma** referência:

```
Reproduce this exact image with only ONE minimal change: remove the text in the
[posição]. Everything else identical.
```

## Template de prompt do vídeo

```
Fixed camera, no camera movement. Start exactly on the first frame and end
exactly on the last frame. [Descreva a transformação em ordem cronológica:
o que muda primeiro, o que muda depois.] The [objeto principal] never changes.
Smooth, continuous, no cuts, no flicker, no new objects appearing.
```

## Aprovação do par A/B

Antes de gastar crédito de vídeo, abra A e B ampliados e confira só os 2–3 pontos que mais derivam naquele objeto. Exemplo numa fachada: a cor da porta e o número de degraus. Se estiverem iguais, aprove.

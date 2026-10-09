#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# scroll-cinema · prepara vídeos para scrub por scroll
#
# Uso:
#   1. coloque os mp4 crus do gerador em  raw/  (ex.: raw/hero.mp4)
#   2. bash build-videos.sh hero 30 18   [nome] [fps] [crf]
#      bash build-videos.sh cena2 60 21
#   3. o arquivo pronto sai em assets/video/<nome>.mp4
#
#   fps: quantos quadros no total = fps x duração. 240–300 quadros bastam.
#        vídeo de 8–10 s -> 30 fps | vídeo de 5 s -> 60 fps
#   crf: 18 para cena em tela cheia, 21 para cena em caixa menor
#
# Windows: rode no "Git Bash" (vem junto com o Git) com o ffmpeg no PATH.
#
# O que faz:
#   a) interpola para o fps pedido (minterpolate, local e grátis)
#   b) reencoda com keyint=1: TODO quadro vira keyframe
#   c) confere frames == keyframes e largura >= 1920, e falha alto se não
# ══════════════════════════════════════════════════════════════
set -euo pipefail

NOME="${1:?uso: build-videos.sh <nome> [fps] [crf]}"
FPS="${2:-30}"
CRF="${3:-18}"
RAW="${RAW:-raw}"
OUT="${OUT:-assets/video}"
LARGURA=1920

command -v ffmpeg  >/dev/null || { echo "ffmpeg não encontrado. Instale antes."; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe não encontrado. Instale antes."; exit 1; }

ENTRADA="$RAW/$NOME.mp4"
[ -f "$ENTRADA" ] || { echo "Arquivo não encontrado: $ENTRADA"; exit 1; }

mkdir -p "$OUT" tmp
INTERP="tmp/${NOME}-${FPS}fps.mp4"
SAIDA="$OUT/$NOME.mp4"

echo "── $NOME ──"
echo "  1/3 interpolando para ${FPS}fps"
ffmpeg -y -loglevel error -i "$ENTRADA" \
  -vf "minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1:me_mode=bidir:search_param=32" \
  -c:v libx264 -crf 16 -preset medium -an "$INTERP"

ORIGW=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$ENTRADA")
NITIDEZ=""
if [ "$ORIGW" -lt "$LARGURA" ]; then
  # fonte ampliada: detalhe fino é inventado pelo redimensionador,
  # então um CRF mais alto corta peso sem custo visível
  NITIDEZ=",unsharp=5:5:0.40:5:5:0.0"
  CRF=$(( CRF + 8 ))
  echo "      fonte em ${ORIGW}px: ampliando para ${LARGURA}px com realce, crf ajustado para $CRF"
fi

echo "  2/3 reencodando com keyint=1 (crf $CRF)"
ffmpeg -y -loglevel error -i "$INTERP" \
  -vf "scale=${LARGURA}:-2:flags=lanczos${NITIDEZ}" \
  -c:v libx264 -x264-params keyint=1:min-keyint=1:scenecut=0 \
  -g 1 -crf "$CRF" -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  "$SAIDA"

echo "  3/3 conferindo"
TOTAL=$(ffmpeg -i "$SAIDA" -f null - 2>&1 | grep -oE 'frame= *[0-9]+' | tail -1 | grep -oE '[0-9]+')
KEYS=$(ffmpeg -i "$SAIDA" -vf "select=eq(pict_type\,I)" -f null - 2>&1 | grep -oE 'frame= *[0-9]+' | tail -1 | grep -oE '[0-9]+')
W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$SAIDA")
MB=$(( $(wc -c < "$SAIDA") / 1048576 ))
echo "      frames: $TOTAL | keyframes: $KEYS | largura: ${W}px | peso: ${MB}MB"

rm -rf tmp
[ "$TOTAL" = "$KEYS" ] || { echo "      ✗ FALHOU: keyframes != frames. O scroll vai engasgar."; exit 1; }
[ "$W" -ge "$LARGURA" ] || { echo "      ✗ FALHOU: largura abaixo de ${LARGURA}px."; exit 1; }
[ "$MB" -le 25 ] || echo "      ⚠ ${MB}MB é pesado. Ordem para aliviar: encurtar > baixar fps > subir CRF."
echo "      ✓ ok: $SAIDA"

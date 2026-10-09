---
name: scroll-cinema
description: Build "scroll cinema" websites where a video (usually AI-generated from a start frame A and end frame B) is scrubbed frame by frame by the page scroll, giving a 3D/cinematic feel without WebGL. Use when the user wants an Apple-style scroll-driven video, a hero where scrolling transforms the scene, a sticky section whose animation follows scroll up and down, or asks why a scroll-scrubbed video stutters, looks frozen or does not move. Also covers the ffmpeg encoding the effect depends on and the A/B frame workflow for image and video generators. Vanilla HTML/CSS/JS, no dependencies.
---

# Scroll cinema: video amarrado ao scroll

Uma seção alta (ex.: `340vh`) tem dentro um bloco `position: sticky` de `100vh`. Enquanto a seção atravessa a tela, calcula-se um progresso `p` de 0 a 1 e aplica-se `video.currentTime = p * duration`. Desce, a cena avança; sobe, ela volta. Não é vídeo tocando: cada quadro é função da posição da página.

O mesmo `p` alimenta todo o resto da cena (troca de headline, ponteiros, traços SVG se desenhando, réguas). É isso que faz a página parecer uma coisa só.

Leia esta skill inteira antes de escrever código. Os três erros da seção "Armadilhas" fazem o efeito parecer quebrado mesmo com o código certo.

## Quando usar e quando não usar

- **Use** para transformações de uma cena fixa (terreno vira jardim, planta vira casa, dia vira noite, câmera descendo por uma copa).
- **Não use** para interação livre, como girar um objeto com o mouse ou escolher cor de produto. Isso é WebGL (Three.js / React Three Fiber).
- **Não precisa de vídeo** quando a jornada é só aproximar ou afastar: um `transform: scale()` numa foto, guiado pelo mesmo `p`, custa zero MB e passa a mesma sensação.

## Estrutura

```html
<section class="cena" id="hero">                 <!-- altura: 300vh a 400vh -->
  <div class="cena__sticky">                     <!-- sticky; top:0; height:100vh -->
    <video id="heroVideo" src="assets/video/hero.mp4"
           poster="assets/img/hero-a.jpg"
           muted playsinline preload="auto"></video>
    <h1 id="heroH">…</h1>
  </div>
</section>

<!-- cenas abaixo da dobra: data-src + preload="none" (carga sob demanda) -->
<video id="cena2Video" data-src="assets/video/cena2.mp4"
       poster="assets/img/cena2-a.jpg" muted playsinline preload="none"></video>
```

```css
.cena{ position:relative; height:340vh; }
.cena__sticky{
  position:sticky; top:0; height:100vh; overflow:hidden;
  /* frame A também como fundo: se o mp4 falhar, degrada para foto, nunca para preto */
  background:url('../img/hero-a.jpg') center/cover no-repeat, #0b0b0b;
}
.cena video{ width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity .6s; }
.cena video.is-ready{ opacity:1; }
```

O binder pronto, sem dependências, está em `assets/scroll-cinema.js`. Copie para o projeto e chame uma vez por cena:

```js
ScrollCinema.bind({
  section: 'hero', video: 'heroVideo', loader: 'heroLoader',
  onProgress: function (p) { /* headline, ponteiros, SVG… tudo a partir de p */ }
});
```

## Armadilhas (as três que mais custam tempo)

1. **Encoding.** Um mp4 comum tem keyframe a cada ~2 s, e o navegador só salta suave para keyframe. O resultado é um scroll que engasga. **Todo quadro precisa ser keyframe** (`keyint=1`). Use `scripts/build-videos.sh`: ele interpola, reencoda e **falha** se o número de frames for diferente do número de keyframes.
2. **Servidor sem Range (HTTP 206).** `python -m http.server` e abrir o `index.html` com dois cliques não respondem Range, e o vídeo parece morto. Teste com `npx serve .` ou qualquer servidor real (nginx, Vercel, Netlify, Cloudflare Pages).
3. **`loadedmetadata` antes do listener.** Em servidor local o evento dispara antes do bind existir e a duração fica 0 para sempre. Leia `video.readyState >= 1 && video.duration` na hora do bind, além de escutar o evento. O binder já faz isso.

## Outras regras que já custaram caro

- **Peso é proporcional ao número de frames**, não ao fps nominal. Numa rolagem de ~4000 px, 240–300 frames já dão um quadro novo a cada ~15 px. Mais do que isso só pesa.
- **Piso de 1920 px de largura.** Se o gerador entregar 720p, amplie com lanczos e um unsharp leve (o script faz isso). É melhor do que deixar o navegador ampliar.
- **Para aliviar o peso, siga esta ordem:** (1) encurtar o vídeo, (2) baixar para 40 fps, (3) subir o CRF. Só depois disso pense em reduzir a resolução, o que na prática quase nunca é preciso.
- **Só o hero nasce com `preload="auto"`.** As outras cenas carregam via `IntersectionObserver` com `rootMargin: '150% 0px'`. Com preload em todas, a página puxa dezenas de MB antes da primeira rolagem.
- **Timeout de segurança:** revele o vídeo 6 s depois de o arquivo **começar** a carregar, mesmo sem `canplaythrough`. Não conte a partir do load da página.
- **Se o arquivo falhar** (`error`), esconda o loader mas **não** revele o `<video>`. O poster cobriria a camada de fundo que anima no lugar dele.
- **`requestAnimationFrame` não roda em aba ou painel oculto.** Se `document.hidden`, aplique direto.
- **Headlines que trocam com o `p` devem ter comprimentos parecidos.** Senão o bloco muda de altura a cada troca e empurra o layout.
- **`prefers-reduced-motion`:** sem transições de opacidade e sem zoom em fundos. O vídeo continua amarrado ao scroll, porque é o usuário quem controla o movimento.
- **Sem JS:** marque `<html class="js">` no início do script e só esconda blocos (reveals) sob `.js`. Sem JS a página mostra tudo e os posters.

## Pipeline de conteúdo (frames A/B e vídeo gerado por IA)

Resumo; o fluxo completo e um template de prompt estão em `references/ai-frames.md`.

1. Gere e aprove o **frame A**.
2. Gere o **frame B** com o A como **referência única**, mudando só o que a jornada muda. Nunca empilhe candidatos descartados na conversa.
3. **Amplie os dois** e compare os pontos fixos (porta, escada, janelas, proporções). A deriva só aparece no zoom.
4. Gere o vídeo com A como primeiro quadro e B como último (5–10 s).
5. Rode `scripts/build-videos.sh` e só então teste o scroll.

## Verificação antes de dizer "pronto"

- Rodar `npx serve .`, rolar para baixo e para cima em cada cena: o quadro precisa seguir o scroll sem saltos.
- A saída do `build-videos.sh` mostra `frames == keyframes` e largura ≥ 1920 para cada arquivo.
- Renomear um mp4 de propósito: a cena deve mostrar o frame A, nunca um retângulo preto.
- Testar com `prefers-reduced-motion` ativado e com JS desligado.
- Conferir o peso total na aba Network: hero de até ~25 MB e as demais cenas só baixam quando se aproximam.

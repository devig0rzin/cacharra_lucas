/* ══════════════════════════════════════════════════════════════
   scroll-cinema.js · video amarrado ao scroll, sem dependências
   Uso:
     ScrollCinema.bind({
       section: 'hero',            // id da <section> alta (300–400vh)
       video:   'heroVideo',       // id do <video> (src OU data-src)
       loader:  'heroLoader',      // opcional: id do indicador de carga
       onProgress: function (p) {} // opcional: recebe p de 0 a 1
     });
   Helpers expostos: ScrollCinema.range(p, a, b), ScrollCinema.stage(p, cuts)
   ══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  document.documentElement.classList.add('js');

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* mapeia p dentro da faixa [a,b] para 0..1 */
  function range(p, a, b) { return b <= a ? 0 : clamp((p - a) / (b - a), 0, 1); }

  /* índice do estágio atual dados os cortes, ex.: stage(p, [0.34, 0.68]) -> 0,1,2 */
  function stage(p, cuts) {
    var i = 0;
    for (var k = 0; k < cuts.length; k++) { if (p >= cuts[k]) i = k + 1; }
    return i;
  }

  /* cenas abaixo da dobra: baixa o arquivo só quando a seção se aproxima */
  function loadWhenNear(video, section) {
    var src = video.getAttribute('data-src');
    if (!src) return;
    function load() {
      if (video.src) return;
      video.preload = 'auto';
      video.src = src;
      video.load();
    }
    if (!('IntersectionObserver' in window)) { load(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { load(); io.disconnect(); }
    }, { rootMargin: '150% 0px' });
    io.observe(section);
  }

  function bind(opts) {
    var section = document.getElementById(opts.section);
    var video   = document.getElementById(opts.video);
    var loader  = opts.loader ? document.getElementById(opts.loader) : null;
    if (!section || !video) return;

    loadWhenNear(video, section);

    var duration = 0, ready = false, target = 0, pending = false;

    /* em servidor local o loadedmetadata pode ter disparado antes deste bind */
    if (video.readyState >= 1 && video.duration) duration = video.duration;

    function reveal() {
      if (ready) return;
      ready = true;
      duration = video.duration || duration || 0;
      video.classList.add('is-ready');
      if (loader) loader.classList.add('is-gone');
      onScroll();
    }

    /* arquivo ausente/quebrado: some o loader, mas NÃO revela o vídeo,
       para o poster não cobrir a camada de fundo */
    function missing() {
      if (ready) return;
      ready = true;
      if (loader) loader.classList.add('is-gone');
      onScroll();
    }

    video.addEventListener('loadedmetadata', function () { duration = video.duration || duration; });
    video.addEventListener('canplaythrough', reveal);
    video.addEventListener('error', missing);

    /* rede lenta: revela assim mesmo 6 s depois de o arquivo começar a carregar */
    if (video.src) {
      setTimeout(reveal, 6000);
    } else {
      video.addEventListener('loadstart', function () { setTimeout(reveal, 6000); }, { once: true });
    }

    function onScroll() {
      var box = section.getBoundingClientRect();
      var scrollable = section.offsetHeight - window.innerHeight;
      target = clamp(scrollable > 0 ? -box.top / scrollable : 0, 0, 1);
      /* aba/painel oculto não entrega requestAnimationFrame */
      if (document.hidden) { apply(); }
      else if (!pending) { pending = true; requestAnimationFrame(apply); }
    }

    function apply() {
      pending = false;
      if (duration) { try { video.currentTime = target * duration; } catch (e) {} }
      if (opts.onProgress) opts.onProgress(target);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    /* aviso de desenvolvimento: piso de 1920px */
    video.addEventListener('loadedmetadata', function () {
      if (video.videoWidth && video.videoWidth < 1920) {
        console.warn('[scroll-cinema] ' + opts.video + ' tem ' + video.videoWidth + 'px de largura. O piso é 1920.');
      }
    });
  }

  global.ScrollCinema = { bind: bind, range: range, stage: stage, clamp: clamp };
})(window);

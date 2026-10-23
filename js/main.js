/* Barber Chirino — scrollytelling */
(() => {
  const WHATSAPP = '56990106565';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  document.body.classList.add('is-loading');

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduce && hasGsap && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: -20, duration: 1.6 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- split text into characters / words ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c) => `<span class="ch" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    return $$('.ch', el);
  }
  function splitWords(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return $$('.w', el);
  }

  /* ---------- loader ---------- */
  const loader = $('.loader');
  const counter = $('.loader__count span');
  // never keep the loader up for more than 4s, even if an image is slow
  const pageLoaded = Promise.race([
    new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  const minTime = new Promise((r) => setTimeout(r, reduce || !hasGsap ? 0 : 1500));

  if (hasGsap && !reduce) {
    const c = { v: 0 };
    gsap.to(c, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => (counter.textContent = Math.round(c.v)) });
  }

  Promise.all([pageLoaded, minTime]).then(() => {
    document.body.classList.remove('is-loading');
    if (!hasGsap || reduce) { loader.remove(); return; }
    gsap.to(loader, {
      yPercent: -100, duration: 1, ease: 'expo.inOut',
      onComplete: () => { loader.remove(); lenis && lenis.start(); },
    });
    intro();
  });

  if (!hasGsap) { setupBooking(); return; }

  /* ---------- hero intro ---------- */
  const barberChars = splitChars($('.hero__barber'));
  const chirinoChars = splitChars($('.hero__chirino'));

  function intro() {
    gsap.timeline({ delay: 0.45 })
      .from('.hero__crown', { y: -60, rotate: -25, opacity: 0, duration: 1, ease: 'back.out(2)' })
      .from('.hero__eyebrow', { opacity: 0, y: 12, duration: 0.6 }, '-=0.7')
      .from(barberChars, { yPercent: 120, opacity: 0, duration: 1, stagger: 0.05, ease: 'expo.out' }, '-=0.6')
      .from(chirinoChars, { yPercent: 60, rotate: () => gsap.utils.random(-25, 25), scale: 0.4, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'back.out(2.2)' }, '-=0.7')
      .from('.hero__tag > *', { opacity: 0, y: 14, stagger: 0.08, duration: 0.6 }, '-=0.5')
      .from('.float', { opacity: 0, scale: 0.6, y: 80, stagger: 0.12, duration: 1.2, ease: 'expo.out' }, '-=1')
      .from('.hero__cue', { opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.nav', { yPercent: -100, opacity: 0, duration: 0.8, ease: 'expo.out' }, '-=0.8');
  }

  /* ---------- nav state ---------- */
  const nav = $('.nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', y > lastY && y > 600);
      lastY = y;
      $('.pole').style.setProperty('--p', self.progress.toFixed(4));
    },
  });

  /* ---------- custom cursor ---------- */
  if (matchMedia('(pointer: fine)').matches && !reduce) {
    const cur = $('.cursor');
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => { cur.classList.add('is-on'); xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    $$('a, button, .chips label, .shot').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-hover'));
    });
  }

  /* ---------- reduced motion: show everything, no pins ---------- */
  if (reduce) {
    $('.anatomy__photo').style.setProperty('--scan', '100%');
    $$('.anatomy__levels li').forEach((li) => li.classList.add('is-active'));
    setupStory();
    setupCounters(true);
    setupBooking();
    return;
  }

  /* ---------- hero scroll: zoom through into the first photo ---------- */
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=140%', pin: '.hero__stage', scrub: 1 },
  })
    .to('.hero__cue', { opacity: 0, duration: 0.1 }, 0)
    .to('.hero__content', { scale: 1.6, opacity: 0, filter: 'blur(8px)', ease: 'power2.in', duration: 0.6 }, 0)
    .to('.float--1', { x: -300, y: -200, rotate: -30, opacity: 0, duration: 0.6 }, 0)
    .to('.float--2', { x: 300, y: -160, rotate: 25, opacity: 0, duration: 0.6 }, 0)
    .to('.float--3', { x: -200, y: 260, rotate: 20, opacity: 0, duration: 0.6 }, 0)
    .fromTo('.hero__reveal', { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(80% at 50% 55%)', ease: 'power2.inOut', duration: 0.7 }, 0.2)
    .fromTo('.hero__reveal img', { scale: 1.4 }, { scale: 1, duration: 0.9, ease: 'none' }, 0.2)
    .from('.hero__reveal-text > *', { y: 60, opacity: 0, stagger: 0.08, duration: 0.3 }, 0.6);

  /* floating photos drift with the mouse */
  if (matchMedia('(pointer: fine)').matches) {
    const floats = $$('.float');
    addEventListener('pointermove', (e) => {
      const dx = e.clientX / innerWidth - 0.5;
      const dy = e.clientY / innerHeight - 0.5;
      floats.forEach((f, i) => gsap.to(f, { xPercent: dx * (12 + i * 8), yPercent: dy * (12 + i * 8), duration: 1.2, ease: 'power3', overwrite: 'auto' }));
    });
  }

  /* ---------- generic reveals ---------- */
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el.children.length ? el.children : el, {
      y: 50, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  setupStory();

  /* ---------- statement: words light up as you scroll ---------- */
  $$('.scrub').forEach((el) => {
    const words = splitWords(el);
    gsap.to(words, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true },
    });
  });

  /* ---------- marquee speeds up with scroll velocity ---------- */
  const row = $('.marquee__row');
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      const v = Math.min(Math.abs(self.getVelocity()) / 600, 4);
      row.style.animationDuration = `${26 / (1 + v)}s`;
    },
  });

  /* ---------- gallery: horizontal scroll on desktop ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.gallery__track');
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.gallery__pin', start: 'top top', end: () => `+=${dist()}`,
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (s) => gsap.set('.gallery__progress i', { scaleX: s.progress }),
      },
    });
    $$('.shot__img img').forEach((img) => {
      gsap.fromTo(img, { xPercent: -8 }, {
        xPercent: 8, ease: 'none',
        scrollTrigger: { trigger: img.closest('.shot'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
    });
    gsap.from('.shot', { y: 120, opacity: 0, rotate: 4, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.gallery', start: 'top 60%' } });
  });

  /* ---------- anatomy: scan line walks down the fade ---------- */
  const levels = $$('.anatomy__levels li');
  const photo = $('.anatomy__photo');
  mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    ScrollTrigger.create({
      trigger: '.anatomy__pin',
      start: desktop ? 'top top' : 'top 56px',
      end: desktop ? '+=160%' : '+=120%',
      pin: true,
      scrub: true,
      onUpdate: (s) => {
        photo.style.setProperty('--scan', `${(s.progress * 100).toFixed(2)}%`);
        const idx = Math.min(levels.length - 1, Math.floor(s.progress * levels.length));
        levels.forEach((li, i) => li.classList.toggle('is-active', i === idx));
      },
    });
  });

  /* ---------- services: stacked cards push back ---------- */
  const cards = $$('.svc');
  cards.forEach((card, i) => {
    card.style.setProperty('--i', i);
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.92, filter: 'brightness(.45)', ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
    });
  });

  setupCounters(false);
  setupBooking();

  /* footer title */
  gsap.from('.footer__big > *', {
    yPercent: 100, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 85%' },
  });

  addEventListener('load', () => ScrollTrigger.refresh());

  /* =======================================================
     sections shared by full and reduced-motion modes
     ======================================================= */
  function setupStory() {
    const imgs = $$('.story__frame img');
    const steps = $$('.step');
    const badge = $('.story__badge-n');
    const badgeK = $('.story__badge-k');
    const bar = $('.story__bar i');
    let current = -1;

    const setActive = (i) => {
      if (i === current) return;
      current = i;
      imgs.forEach((img, j) => img.classList.toggle('is-active', j === i));
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      const label = steps[i].querySelector('.step__k').textContent;
      const m = label.match(/#\d+/);
      badgeK.textContent = m ? 'Corte' : '';
      badge.textContent = m ? m[0] : label;
      bar.style.width = `${steps[i].dataset.level}%`;
    };

    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step, start: 'top 60%', end: 'bottom 60%',
        onToggle: (self) => self.isActive && setActive(i),
      });
    });
    setActive(0);
  }

  function setupCounters(instant) {
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count;
      if (instant) { el.textContent = end; return; }
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
      });
    });
  }

  function setupBooking() {
    const form = $('#booking');
    const err = $('.ticket__error');
    const dateInput = form.elements.dia;
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dateInput.min = iso(today);

    const prettyDate = (v) => {
      if (!v) return '';
      const [y, m, d] = v.split('-').map(Number);
      const s = new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const read = () => {
      const f = form.elements;
      return {
        nombre: f.nombre.value.trim(),
        servicio: f.servicio.value,
        dia: f.dia.value,
        hora: f.hora.value,
        nota: f.nota.value.trim(),
      };
    };

    const update = () => {
      const d = read();
      $('[data-out="nombre"]').textContent = d.nombre || '—';
      $('[data-out="servicio"]').textContent = d.servicio || '—';
      const when = [prettyDate(d.dia), d.hora && `${d.hora} hrs`].filter(Boolean).join(' · ');
      $('[data-out="cuando"]').textContent = when || '—';
      err.textContent = '';
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = read();
      const missing = [!d.nombre && 'tu nombre', !d.servicio && 'un servicio', !d.dia && 'el día', !d.hora && 'la hora'].filter(Boolean);
      if (missing.length) {
        err.textContent = `Falta: ${missing.join(', ')}.`;
        if (window.gsap && !reduce) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        return;
      }
      const lines = [
        'Hola Barber Chirino! 💈 Quiero agendar una hora:',
        '',
        `👤 Nombre: ${d.nombre}`,
        `✂️ Servicio: ${d.servicio}`,
        `📅 Día: ${prettyDate(d.dia)}`,
        `🕐 Hora: ${d.hora} hrs`,
      ];
      if (d.nota) lines.push(`📝 Comentario: ${d.nota}`);
      lines.push('', '¿Está disponible?');
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
    });
  }
})();

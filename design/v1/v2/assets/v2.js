/*
 * KYA Energy Market — maquette v2 : mouvement et interactions.
 * Les offres et témoignages ci-dessous préfigurent ce que l'admin configurera (éditions, durées,
 * prix, fonctions, témoignages) ; dans le vrai site ils viendront de l'API. Prix et témoignages = EXEMPLES.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const money = (value) => new Intl.NumberFormat('fr-FR').format(value);

  /* ---------------------------------------------------------------- Menu mobile */
  const nav = $('.nav');
  const burger = $('.nav-burger');
  burger?.addEventListener('click', () => burger.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));

  /* ---------------------------------------------------------------- Apparitions au défilement */
  const revealer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    revealer.unobserve(entry.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((element) => revealer.observe(element));

  /* ---------------------------------------------------------------- Héros : l'étude converge vers le dossier */
  // Site → consommations → dossier ← schéma ← fiabilité. Positions sans transformation (offset*) :
  // les nœuds flottent de quelques pixels autour de leur place.
  const stage = $('#stage');
  const wires = $('#wires');
  const drawWires = () => {
    if (!stage || !wires || getComputedStyle(wires).display === 'none') return;
    const rect = (node) => ({ x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight });
    const paths = $$('.node[data-to]', stage).map((node) => {
      const a = rect(node);
      const b = rect($(`.${node.dataset.to}`, stage));
      const x1 = a.x + a.w / 2;
      const y1 = a.y + a.h;
      if (node.dataset.to !== 'n-doc') {
        const x2 = b.x + b.w / 2;
        return `M${x1} ${y1} C ${x1} ${y1 + 40}, ${x2} ${b.y - 40}, ${x2} ${b.y}`;
      }
      const x2 = x1 < b.x ? b.x : b.x + b.w;
      const y2 = b.y + b.h / 2;
      return `M${x1} ${y1} C ${x1} ${y2}, ${x1} ${y2}, ${x2} ${y2}`;
    });
    wires.setAttribute('viewBox', `0 0 ${stage.offsetWidth} ${stage.offsetHeight}`);
    wires.innerHTML = paths.map((d) => `<path d="${d}"/><path class="flow" d="${d}"/>`).join('');
  };
  if (stage) {
    drawWires();
    addEventListener('resize', () => requestAnimationFrame(drawWires));
  }

  /* ---------------------------------------------------------------- Fenêtre de l'application : se redresse au défilement */
  const appWindow = $('#app-window');
  if (appWindow && !reduced) {
    let ticking = false;
    const straighten = () => {
      ticking = false;
      const r = appWindow.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75)));
      appWindow.style.setProperty('--tilt', `${(1 - progress) * 16}deg`);
      appWindow.style.setProperty('--scale', String(0.9 + progress * 0.1));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(straighten); } }, { passive: true });
    straighten();
  }

  /* ---------------------------------------------------------------- Chiffres qui comptent jusqu'à leur valeur */
  const counter = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    counter.unobserve(entry.target);
    const element = entry.target;
    const target = Number(element.dataset.count);
    const suffix = element.querySelector('em')?.outerHTML ?? '';
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1400);
      element.innerHTML = money(Math.round(target * (1 - (1 - t) ** 4))) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  if (!reduced) $$('[data-count]').forEach((element) => counter.observe(element));

  /* ---------------------------------------------------------------- Écran qui change en douceur */
  const swapShot = (img, src, alt) => {
    if (!img || img.getAttribute('src') === src) return;
    img.classList.add('swap');
    const next = new Image();
    next.onload = () => {
      setTimeout(() => { img.src = src; img.alt = alt; requestAnimationFrame(() => img.classList.remove('swap')); }, reduced ? 0 : 180);
    };
    next.src = src;
  };

  /* ---------------------------------------------------------------- Les huit étapes (accueil) */
  const steps = $$('#chain .step');
  if (steps.length) {
    const line = $('#chain .chain-line');
    const select = (step, focus = false) => {
      const index = steps.indexOf(step);
      steps.forEach((other) => { other.setAttribute('aria-selected', String(other === step)); other.tabIndex = other === step ? 0 : -1; });
      if (focus) step.focus();
      line?.style.setProperty('--progress', String((index + 1) / steps.length));
      $('#chain-title').textContent = step.dataset.title;
      $('#chain-text').textContent = step.dataset.text;
      $('#chain-points').innerHTML = step.dataset.points.split('|').map((point) => `<li>${icon('check')}<span>${point}</span></li>`).join('');
      swapShot($('#chain-img'), step.dataset.shot, `Écran « ${step.dataset.title} » de KYA-SolDesign sur le projet exemple`);
    };
    steps.forEach((step, index) => {
      step.addEventListener('click', () => { select(step); stopAuto(); });
      step.addEventListener('keydown', (event) => {
        const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (move === undefined) return;
        event.preventDefault();
        stopAuto();
        select(steps[(index + move + steps.length) % steps.length], true);
      });
    });
    // Avance seule tant que personne n'a touché aux étapes et qu'elles sont visibles.
    let timer = null;
    const stopAuto = () => { clearInterval(timer); timer = null; };
    const chain = $('#chain');
    if (!reduced) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && timer === null && !chain.dataset.touched) {
          timer = setInterval(() => {
            const current = steps.findIndex((step) => step.getAttribute('aria-selected') === 'true');
            select(steps[(current + 1) % steps.length]);
          }, 4200);
        } else if (!entry.isIntersecting) stopAuto();
      }, { threshold: 0.4 }).observe(chain);
      chain.addEventListener('pointerdown', () => { chain.dataset.touched = '1'; });
      chain.addEventListener('keydown', () => { chain.dataset.touched = '1'; });
    }
    select(steps[0]);
  }

  /* ---------------------------------------------------------------- Témoignages (exemples) */
  const QUOTES = [
    { name: 'Nom à fournir', role: 'Bureau d\'études, Lomé', color: '#1ca18c', text: 'Le dossier sort complet : schéma, note de calcul et devis. Le client comprend ce qu\'il achète.' },
    { name: 'Nom à fournir', role: 'Enseignant, école d\'ingénieurs', color: '#f99d32', text: 'Les étudiants voient chaque étape et ses chiffres. Le passage de la théorie au projet réel est immédiat.' },
    { name: 'Nom à fournir', role: 'Installateur, Ouagadougou', color: '#e8e748', text: 'Je prends mes propres batteries et onduleurs, et l\'outil trouve la combinaison qui tient.' },
    { name: 'Nom à fournir', role: 'Étudiante en master énergie', color: '#37c2aa', text: 'Le rapport m\'a servi de modèle pour mon mémoire, avec la mention d\'usage étudiant.' },
    { name: 'Nom à fournir', role: 'Chef de projet, ONG santé', color: '#ffb35c', text: 'On a comparé trois sites de centres de santé en une matinée, avec la météo de chacun.' },
  ];
  const quotes = $('#quotes');
  if (quotes) {
    const card = (quote, hidden) => `<article class="quote"${hidden ? ' aria-hidden="true"' : ''}>
      <header><span class="av" style="background:${quote.color}22;color:${quote.color}">${icon('user')}</span><div><b>${quote.name}</b><span>${quote.role}</span></div><span class="ex">exemple</span></header>
      <p>« ${quote.text} »</p></article>`;
    quotes.innerHTML = QUOTES.map((quote) => card(quote, false)).join('') + QUOTES.map((quote) => card(quote, true)).join('');
  }

  /* ---------------------------------------------------------------- Page logiciel : récit qui pilote l'écran */
  const storySteps = $$('.story-step');
  if (storySteps.length) {
    const screen = $('#story-img');
    // Sur écran étroit l'écran collant disparaît : chaque étape porte sa propre capture.
    storySteps.forEach((step) => step.insertAdjacentHTML('beforeend', `<img class="story-inline" src="${step.dataset.shot}" alt="" loading="lazy" width="1600" height="1000">`));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      storySteps.forEach((step) => step.classList.toggle('active', step === entry.target));
      swapShot(screen, entry.target.dataset.shot, `Écran « ${entry.target.querySelector('h3').textContent} » de KYA-SolDesign`);
    }), { rootMargin: '-45% 0px -45% 0px' });
    storySteps.forEach((step) => observer.observe(step));
    storySteps[0].classList.add('active');
  }

  /* ---------------------------------------------------------------- Page logiciel : tarifs */
  const OFFERS = {
    commercial: {
      title: 'Commerciale', for: 'Bureaux d\'études et installateurs qui remettent des dossiers à leurs clients.', featured: true,
      durations: [{ id: '1m', label: '1 mois', price: 25000 }, { id: '3m', label: '1 trimestre', price: 65000 }, { id: '12m', label: '1 an', price: 220000, preferred: true }],
      includes: [['Étude complète, du site au rapport', true], ['Optimisation parmi vos références', true], ['Export Word', true], ['Prix de vente et facture proforma', true], ['Projets illimités, sans filigrane', true], ['7 jours de grâce après l\'échéance', true]],
    },
    academic: {
      title: 'Académique', for: 'Écoles et universités, pour l\'enseignement et les travaux pratiques.',
      durations: [{ id: '12m', label: '1 an', price: 90000, preferred: true }],
      includes: [['Étude complète, du site au rapport', true], ['Optimisation parmi vos références', true], ['Export Word', true], ['Prix de vente et facture proforma', false], ['Mention « Usage académique »', true], ['3 jours de grâce après l\'échéance', true]],
    },
    student: {
      title: 'Étudiant', for: 'Pour un projet, un stage ou un mémoire, le temps qu\'il faut.',
      durations: [{ id: '1d', label: '1 jour', price: 1500 }, { id: '1m', label: '1 mois', price: 7500, preferred: true }],
      includes: [['Étude complète, rapport PDF', true], ['Cinq projets', true], ['Optimisation parmi vos références', false], ['Export Word', false], ['Prix de vente et facture proforma', false], ['Mention « Usage étudiant »', true]],
    },
  };
  const plans = $('#plans');
  if (plans) {
    plans.innerHTML = Object.entries(OFFERS).map(([id, offer]) => {
      const preferred = offer.durations.find((d) => d.preferred) ?? offer.durations[0];
      const switcher = offer.durations.length > 1
        ? `<div class="plans-switch" role="radiogroup" aria-label="Durée, licence ${offer.title}" style="margin-top:18px">${offer.durations.map((d) =>
          `<button type="button" role="radio" aria-checked="${d === preferred}" aria-selected="${d === preferred}" data-price="${d.price}" data-label="${d.label}">${d.label}</button>`).join('')}</div>`
        : `<div class="plans-switch" style="margin-top:18px"><button type="button" aria-selected="true" tabindex="-1">${preferred.label}</button></div>`;
      return `<article class="plan${offer.featured ? ' featured' : ''}" id="plan-${id}">
        ${offer.featured ? '<span class="plan-tag">Pour les pros</span>' : ''}
        <h3>${offer.title}</h3><p class="for">${offer.for}</p>
        ${switcher}
        <div class="price"><b data-price-out>${money(preferred.price)}</b><span>F CFA <span class="ex">exemple</span></span></div>
        <div class="per" data-per>pour ${preferred.label}, un poste</div>
        <ul>${offer.includes.map(([label, on]) => `<li class="${on ? '' : 'off'}">${icon(on ? 'check' : 'dash')}<span>${label}</span></li>`).join('')}</ul>
        <a class="btn ${offer.featured ? 'btn-buy' : ''}" href="#" data-buy>Acheter · ${preferred.label}</a>
      </article>`;
    }).join('');
    $$('.plan', plans).forEach((plan) => $$('[data-price]', plan).forEach((button, _, all) => button.addEventListener('click', () => {
      all.forEach((other) => { other.setAttribute('aria-selected', String(other === button)); other.setAttribute('aria-checked', String(other === button)); });
      const out = $('[data-price-out]', plan);
      const from = Number(out.textContent.replace(/\D/g, ''));
      const to = Number(button.dataset.price);
      const start = performance.now();
      const tick = (now) => {
        const t = reduced ? 1 : Math.min(1, (now - start) / 450);
        out.textContent = money(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      $('[data-per]', plan).textContent = `pour ${button.dataset.label}, un poste`;
      $('[data-buy]', plan).textContent = `Acheter · ${button.dataset.label}`;
    })));
    const wanted = new URLSearchParams(location.search).get('edition');
    const target = wanted && $(`#plan-${wanted}`);
    if (target) target.style.borderColor = 'var(--orange)';
  }
})();

/*
 * KYA Energy Market — comportements de la maquette.
 * Les offres ci-dessous préfigurent la configuration d'un produit dans l'admin (éditions, durées,
 * prix, fonctions) : dans le vrai site, elles viendront de l'API, pas du code. Prix = EXEMPLES.
 */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- Menu mobile */
  const head = document.querySelector('.site-head');
  const toggle = document.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = head.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  /* ---------------------------------------------------------------- Langue (visuel seulement) */
  document.querySelectorAll('.lang button').forEach((button, _, all) => {
    button.addEventListener('click', () => all.forEach((other) => other.setAttribute('aria-pressed', String(other === button))));
  });

  /* ---------------------------------------------------------------- Mode canevas */
  const canvasToggle = document.querySelector('.canvas-toggle');
  canvasToggle?.addEventListener('click', () => {
    const on = document.body.classList.toggle('show-canvas');
    canvasToggle.setAttribute('aria-pressed', String(on));
    canvasToggle.querySelector('span').textContent = on ? 'Masquer le canevas' : 'Afficher le canevas';
  });

  /* ---------------------------------------------------------------- Les huit étapes */
  const tabs = [...document.querySelectorAll('.flow-list [role="tab"]')];
  const plateImg = document.querySelector('#flow-plate img');
  const plateCap = document.getElementById('flow-cap');
  const select = (tab, focus = false) => {
    tabs.forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
    tabs.forEach((other) => other.setAttribute('tabindex', other === tab ? '0' : '-1'));
    if (focus) tab.focus();
    if (!plateImg || plateImg.getAttribute('src') === tab.dataset.shot) { plateCap.textContent = tab.dataset.cap; return; }
    plateImg.classList.add('is-swapping');
    const next = new Image();
    next.onload = () => {
      plateImg.src = tab.dataset.shot;
      plateImg.alt = `Écran « ${tab.dataset.cap} » de KYA-SolDesign sur le projet exemple`;
      plateCap.textContent = tab.dataset.cap;
      requestAnimationFrame(() => plateImg.classList.remove('is-swapping'));
    };
    next.src = tab.dataset.shot;
  };
  tabs.forEach((tab, index) => {
    tab.setAttribute('tabindex', tab.getAttribute('aria-selected') === 'true' ? '0' : '-1');
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      select(tabs[(index + step + tabs.length) % tabs.length], true);
    });
  });

  /* ---------------------------------------------------------------- Tarifs */
  const OFFERS = {
    commercial: {
      title: 'Licence Commerciale',
      durations: [
        { id: '1m', label: '1 mois', price: 25000 },
        { id: '3m', label: '1 trimestre', price: 65000 },
        { id: '12m', label: '1 an', price: 220000, preferred: true },
      ],
      includes: [
        ['Étude complète, du site au rapport', true], ['Optimisation parmi vos références', true], ['Export Word', true],
        ['Prix de vente et facture proforma', true], ['Émission et révisions du dossier', true], ['Projets illimités, sans filigrane', true],
      ],
      note: 'Un poste · 7 jours de grâce après l’échéance',
    },
    academic: {
      title: 'Licence Académique',
      durations: [{ id: '12m', label: '1 an', price: 90000, preferred: true }],
      includes: [
        ['Étude complète, du site au rapport', true], ['Optimisation parmi vos références', true], ['Export Word', true],
        ['Émission et révisions du dossier', true], ['Prix de vente et facture proforma', false], ['Documents marqués « Usage académique »', true],
      ],
      note: 'Un poste · 3 jours de grâce après l’échéance',
    },
    student: {
      title: 'Licence Étudiant',
      durations: [
        { id: '1d', label: '1 jour', price: 1500 },
        { id: '1m', label: '1 mois', price: 7500, preferred: true },
      ],
      includes: [
        ['Étude complète, du site au rapport PDF', true], ['Cinq projets', true], ['Optimisation parmi vos références', false],
        ['Export Word', false], ['Prix de vente et facture proforma', false], ['Documents marqués « Usage étudiant »', true],
      ],
      note: 'Un poste · sans délai de grâce',
    },
  };

  const durations = document.getElementById('durations');
  if (durations) {
    const price = document.getElementById('price');
    const title = document.getElementById('order-title');
    const includes = document.getElementById('includes');
    const note = document.getElementById('price-note');
    const buy = document.getElementById('buy');
    const legend = durations.querySelector('legend').outerHTML;
    const format = (value) => new Intl.NumberFormat('fr-FR').format(value);
    const icon = (on) => `<svg aria-hidden="true"><use href="#i-${on ? 'check' : 'dash'}"/></svg>`;
    const columns = document.querySelectorAll('#matrix [data-col]');

    const showPrice = (offer, id) => {
      const chosen = offer.durations.find((item) => item.id === id) ?? offer.durations[0];
      price.textContent = format(chosen.price);
      buy.textContent = `Acheter : ${offer.title.replace('Licence ', '').toLowerCase()}, ${chosen.label}`;
    };

    const render = (edition) => {
      const offer = OFFERS[edition];
      title.textContent = offer.title;
      note.textContent = offer.note;
      const preferred = offer.durations.find((item) => item.preferred) ?? offer.durations[0];
      durations.innerHTML = legend + offer.durations.map((item) =>
        `<label><input type="radio" name="duration" value="${item.id}"${item.id === preferred.id ? ' checked' : ''}><span>${item.label}</span></label>`).join('');
      includes.innerHTML = offer.includes.map(([label, on]) => `<li class="${on ? '' : 'off'}">${icon(on)}<span>${label}</span></li>`).join('');
      showPrice(offer, preferred.id);
      durations.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => showPrice(offer, input.value)));
      // La grille des fonctions met en valeur la colonne de l'édition choisie.
      columns.forEach((th) => {
        const index = [...th.parentElement.children].indexOf(th);
        document.querySelectorAll('#matrix tr').forEach((row) => row.children[index]?.classList.toggle('col-on', th.dataset.col === edition));
      });
    };

    document.querySelectorAll('input[name="edition"]').forEach((input) => input.addEventListener('change', () => render(input.value)));
    const initial = new URLSearchParams(location.search).get('edition');
    const start = OFFERS[initial] ? initial : 'commercial';
    const startInput = document.querySelector(`input[name="edition"][value="${start}"]`);
    if (startInput) startInput.checked = true;
    render(start);
  }
})();

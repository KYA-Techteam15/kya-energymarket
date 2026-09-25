// KYA-EnergyMarket — proposition 4 : exemple interactif, menu mobile, en-tête collant.
// Valeurs d'exemple (projet de démonstration) : SRI = (1 − 0,041) × (1 − 0,058) = 0,90 ; SVI = 100,6 ÷ 120 = 0,84.
(() => {
  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const pct = (value, min, max) => `${(((value - min) / (max - min)) * 92).toFixed(1)}%`;

  const VIEWS = {
    rel: {
      label: 'Fiabilité technique', big: '0,90', unit: 'sur 1',
      label2: 'Énergie non servie', mid: '4,1', unit2: '%',
      say: '<b>Proche de 1</b> : l’installation couvre les besoins presque toute l’année.',
      legend: ['Part des besoins couverte, mois par mois', 'échelle 80–100 %'],
      bars: { values: [99, 99, 99, 98, 96, 93, 91, 88, 92, 97, 99, 99], min: 80, max: 100, hot: 7 },
      rows: [
        ['Mois le plus faible', 'Août, saison des pluies', '88 <em>%</em>'],
        ['Heures de manque', 'Sur les 8 760 heures de l’année', '508 <em>h</em>'],
      ],
    },
    eco: {
      label: 'Accessibilité économique', big: '0,84', unit: 'sur 1',
      label2: 'Coût du kWh produit', mid: '100,6', unit2: 'FCFA/kWh',
      say: '<b>Sous 1</b> : chaque kWh produit coûte moins cher que celui du réseau.',
      legend: ['Coût d’un kWh', '0,84 = 100,6 ÷ 120'],
      compare: [['Votre installation', 100.6, true], ['Réseau électrique', 120, false]],
      rows: [
        ['Tarif du réseau retenu', 'Saisi dans le projet', '120 <em>FCFA/kWh</em>'],
        ['Écart par kWh', 'En faveur de l’installation', '19,4 <em>FCFA</em>'],
      ],
    },
    prod: {
      label: 'Production sur l’année', big: '4 820', unit: 'kWh',
      label2: 'Besoin sur l’année', mid: '4 610', unit2: 'kWh',
      say: 'De juin à septembre, le soleil manque : <b>c’est là que se joue la fiabilité</b>.',
      legend: ['Production mensuelle, kWh', 'pointillé : besoin moyen'],
      bars: { values: [450, 430, 460, 440, 410, 360, 330, 320, 350, 400, 430, 440], min: 0, max: 460, hot: 7, ref: [384, 'Besoin 384 kWh'] },
      rows: [
        ['Mois le plus productif', 'Mars', '460 <em>kWh</em>'],
        ['Mois le plus faible', 'Août', '320 <em>kWh</em>'],
      ],
    },
  };

  const app = document.querySelector('[data-app]');
  if (app) {
    const panel = app.querySelector('[data-panel]');
    const chart = app.querySelector('[data-chart]');
    const rows = app.querySelector('[data-rows]');
    const field = (name) => app.querySelector(`[data-f="${name}"]`);
    const tabs = [...app.querySelectorAll('[role="tab"]')];

    const drawBars = ({ values, min, max, hot, ref }) => {
      chart.className = 'chart';
      const existing = [...chart.querySelectorAll('.bar')];
      if (existing.length !== values.length) {
        chart.innerHTML = values.map((_, index) => `<div class="bar" style="--h:0%"><i>${MONTHS[index]}</i></div>`).join('');
      }
      chart.querySelector('.ref')?.remove();
      requestAnimationFrame(() => {
        chart.querySelectorAll('.bar').forEach((bar, index) => {
          bar.style.setProperty('--h', pct(values[index], min, max));
          bar.classList.toggle('is-hot', index === hot);
        });
      });
      if (ref) chart.insertAdjacentHTML('beforeend', `<div class="ref" style="--h:${pct(ref[0], min, max)}"><span>${ref[1]}</span></div>`);
    };

    const drawCompare = (items) => {
      chart.className = 'chart is-compare';
      const top = Math.max(...items.map(([, value]) => value));
      chart.innerHTML = items.map(([name, value, hot]) =>
        `<div class="cmp${hot ? ' is-hot' : ''}"><span>${name}</span><div style="--w:0%">${String(value).replace('.', ',')}</div></div>`).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        chart.querySelectorAll('.cmp div').forEach((bar, index) => bar.style.setProperty('--w', `${(items[index][1] / top) * 100}%`));
      }));
    };

    const show = (key) => {
      const view = VIEWS[key];
      for (const name of ['label', 'big', 'unit', 'label2', 'mid', 'unit2']) field(name).textContent = view[name];
      field('say').innerHTML = view.say;
      field('legend').parentElement.innerHTML = `<span data-f="legend">${view.legend[0]}</span><span>${view.legend[1]}</span>`;
      if (view.bars) drawBars(view.bars); else drawCompare(view.compare);
      rows.innerHTML = view.rows.map(([title, note, value]) => `<li><b>${title}</b><small>${note}</small><span>${value}</span></li>`).join('');
      panel.setAttribute('aria-labelledby', `tab-${key}`);
    };

    const select = (tab, focus) => {
      tabs.forEach((other) => {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      show(tab.dataset.tab);
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        select(tabs[(index + step + tabs.length) % tabs.length], true);
      });
    });
    show('rel');
  }

  // Menu du logiciel sur petit écran
  const menu = document.querySelector('[data-menu]');
  const nav = document.getElementById('sw-nav');
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) { menu?.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  });

  // Filet sous l'en-tête une fois décollé
  const header = document.querySelector('[data-sw]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', header.getBoundingClientRect().top <= 0 && window.scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();

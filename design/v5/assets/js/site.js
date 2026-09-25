// KYA-EnergyMarket — proposition 5 : en-têtes et pied communs, puis toutes les interactions de la maquette.
// Dans la plateforme, ces contenus viendront de l'administration ; ici ils sont écrits une fois pour toutes les pages.
(() => {
  const body = document.body;
  const root = body.dataset.root ?? '';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const fcfa = (value) => `${Math.round(value).toLocaleString('fr-FR').replace(/ | /g, ' ')}`;

  // ---------------------------------------------------------------- Icônes (un seul trait, dessinées)
  const PATHS = {
    go: 'M5 11l6-6M6 5h5v5', down: 'M4 6l4 4 4-4', right: 'M6 3.5L10.5 8 6 12.5', left: 'M10 3.5L5.5 8l4.5 4.5',
    menu: 'M2.5 5h11M2.5 11h11', plus: 'M8 3v10M3 8h10', check: 'M3.5 8.5l3 3 6-7', x: 'M4 4l8 8M12 4l-8 8',
    copy: 'M5.5 5.5V3.2c0-.4.3-.7.7-.7h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7h-2.3M3.2 5.5h6.6c.4 0 .7.3.7.7v6.6c0 .4-.3.7-.7.7H3.2c-.4 0-.7-.3-.7-.7V6.2c0-.4.3-.7.7-.7z',
    download: 'M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10', file: 'M4 1.8h5.2L12 4.6v9.6H4zM9 1.8v3h3',
    home: 'M2.5 7.2L8 2.5l5.5 4.7v6.3h-11zM6.3 13.5V9.4h3.4v4.1', key: 'M10.5 2.5a3 3 0 1 1-2.8 4.1L2.5 11.8v1.7h2v-1.3h1.3v-1.3h1.4l1.4-1.4a3 3 0 0 0 1.9-7zM11 5h.01',
    receipt: 'M3.5 1.8h9v12.4l-1.8-1.2-1.5 1.2-1.7-1.2-1.7 1.2-1.5-1.2-1.8 1.2zM6 5.5h4M6 8.3h4', chat: 'M2.5 3.5h11v7.5H7l-3 2.5V11H2.5z',
    users: 'M6 7.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM1.8 13.5c.4-2.4 2.1-3.8 4.2-3.8s3.8 1.4 4.2 3.8M10.6 2.7a2.3 2.3 0 0 1 0 4.5M12 9.9c1.2.5 2 1.7 2.2 3.6',
    out: 'M6.5 2.5H3v11h3.5M10 5l3 3-3 3M13 8H6.5', search: 'M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6L14 14',
    phone: 'M5.5 2.5H4a1.5 1.5 0 0 0-1.5 1.6C3 9.4 6.6 13 11.9 13.5a1.5 1.5 0 0 0 1.6-1.5v-1.5l-2.6-1.1-1.3 1.3a7 7 0 0 1-4.3-4.3l1.3-1.3z',
    mail: 'M2 4h12v8.5H2zM2.3 4.3L8 8.8l5.7-4.5', play: 'M6 4.5v7l5.5-3.5z', shield: 'M8 1.8l5 1.9v3.8c0 3.3-2.1 5.7-5 6.8-2.9-1.1-5-3.5-5-6.8V3.7zM5.8 8l1.6 1.6 3-3.1',
    coins: 'M8 2c2.8 0 5 .9 5 2s-2.2 2-5 2-5-.9-5-2 2.2-2 5-2zM3 4v4c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8v4c0 1.1 2.2 2 5 2s5-.9 5-2V8',
    sun: 'M8 10.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3',
    card: 'M1.8 3.5h12.4v9H1.8zM1.8 6.3h12.4M4 10h3', mobile: 'M4.5 1.8h7v12.4h-7zM7 12h2', lock: 'M3.5 7h9v6.5h-9zM5.3 7V5a2.7 2.7 0 0 1 5.4 0v2',
    grid: 'M2.5 2.5h4.5V7H2.5zM9 2.5h4.5V7H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z', book: 'M2.5 3c2-.8 3.8-.6 5.5.6v10c-1.7-1.2-3.5-1.4-5.5-.6zM13.5 3c-2-.8-3.8-.6-5.5.6v10c1.7-1.2 3.5-1.4 5.5-.6z',
    blocks: 'M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z', whatsapp: 'M3 13l.8-2.6A5.6 5.6 0 1 1 6 12.6zM6.2 5.5c-.3.8 0 2 1 3s2.2 1.3 3 1l.4-1-1.2-.7-.6.5c-.6-.3-1.1-.8-1.4-1.4l.5-.6-.7-1.2z',
    refresh: 'M13 3.5v3h-3M3 12.5v-3h3M12.4 6.5A4.8 4.8 0 0 0 4 5M3.6 9.5A4.8 4.8 0 0 0 12 11',
  };
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;
  $$('[data-i]').forEach((node) => { node.outerHTML = icon(node.dataset.i, node.className); });

  // ---------------------------------------------------------------- Catalogue (configuré dans l'administration)
  const SOFTWARE = [
    { id: 'kya-soldesign', name: 'KYA-SolDesign', kind: 'Dimensionnement de systèmes solaires', state: 'ok', label: 'Disponible', href: 'kya-soldesign/index.html', logo: 'ksd-mark.png' },
    { id: 'kya-ecolabel', name: 'KYA-EcoLabel', kind: 'Description à fournir', state: 'soon', label: 'Bientôt', mono: 'EL' },
    { id: 'kya-businessmodel', name: 'KYA-BusinessModel', kind: 'Description à fournir', state: 'soon', label: 'Bientôt', mono: 'BM' },
    { id: 'kya-solmonitor', name: 'KYA-SolMonitor', kind: 'Description à fournir', state: 'soon', label: 'Bientôt', mono: 'SM' },
  ];

  // ---------------------------------------------------------------- En-têtes
  const chrome = body.dataset.chrome ?? 'market';
  const signedIn = body.dataset.auth === 'in';
  const softwareMenu = `
    <div class="dd" data-dd>
      <button class="mk-link" type="button" aria-expanded="false" aria-haspopup="true"${body.dataset.nav === 'logiciels' ? ' aria-current="page"' : ''}>Logiciels ${icon('down', 'i-sm')}</button>
      <div class="dd-panel" role="menu">
        ${SOFTWARE.map((item) => `<a class="dd-item" role="menuitem" href="${item.href ? root + item.href : root + 'logiciels.html#' + item.id}">
          ${item.logo ? `<img src="${root}assets/img/${item.logo}" alt="">` : `<span class="ph">${item.mono}</span>`}
          <b>${item.name}</b><small>${item.kind}</small><span class="state ${item.state}">${item.label}</span></a>`).join('')}
        <div class="dd-foot"><a class="link-arrow" href="${root}logiciels.html">Tous les logiciels ${icon('right', 'i-sm')}</a></div>
      </div>
    </div>`;
  const langMenu = `
    <div class="dd mk-lang" data-dd>
      <button class="mk-link" type="button" aria-expanded="false" aria-haspopup="true" aria-label="Langue : français">FR ${icon('down', 'i-sm')}</button>
      <div class="dd-panel right" role="menu"><a class="dd-lang" role="menuitem" href="#" aria-current="true">Français</a><a class="dd-lang" role="menuitem" href="#">English</a></div>
    </div>`;
  const account = signedIn
    ? `<div class="dd" data-dd>
        <button class="mk-link mk-me" type="button" aria-expanded="false" aria-haspopup="true"><span class="avatar">AK</span><span class="me-name">Mon espace</span> ${icon('down', 'i-sm')}</button>
        <div class="dd-panel right" role="menu" style="min-width:220px">
          <a class="dd-lang" role="menuitem" href="${root}espace/index.html">Tableau de bord</a>
          <a class="dd-lang" role="menuitem" href="${root}espace/licences.html">Licences</a>
          <a class="dd-lang" role="menuitem" href="${root}espace/factures.html">Factures d'achat</a>
          <a class="dd-lang" role="menuitem" href="${root}connexion.html">Se déconnecter</a>
        </div>
      </div>`
    : `<a class="mk-link" href="${root}connexion.html">Se connecter</a>`;

  const mkMain = chrome === 'market';
  const mk = `
    <div class="mk${mkMain ? ' is-main' : ''}" data-sticky>
      <div class="wrap mk-row">
        <a class="mk-brand" href="${root}index.html"><img src="${root}assets/img/kya-mark.png" alt="" width="24" height="20">KYA-EnergyMarket</a>
        <nav class="mk-nav" id="mk-nav" aria-label="Marketplace">${softwareMenu}<a class="mk-link" href="${root}aide.html"${body.dataset.nav === 'aide' ? ' aria-current="page"' : ''}>Aide</a></nav>
        <div class="mk-end">${langMenu}${account}
          ${mkMain ? `<button class="menu-btn" type="button" aria-expanded="false" aria-controls="mk-nav" aria-label="Menu" data-menu>${icon('menu')}</button>` : ''}
        </div>
      </div>
    </div>`;

  const tab = body.dataset.tab;
  const tabLink = (id, label, href) => `<a href="${root}kya-soldesign/${href}"${tab === id ? ' aria-current="page"' : ''}>${label}</a>`;
  const sw = `
    <header class="sw" data-sticky>
      <div class="wrap sw-row">
        <a class="sw-id" href="${root}kya-soldesign/index.html"><img src="${root}assets/img/ksd-mark.png" alt="" width="34" height="28">KYA-SolDesign</a>
        <nav class="sw-nav" id="sw-nav" aria-label="KYA-SolDesign">
          ${tabLink('presentation', 'Présentation', 'index.html')}${tabLink('tarifs', 'Tarifs', 'tarifs.html')}${tabLink('ressources', 'Ressources', 'ressources.html')}${tabLink('support', 'Support', 'support.html')}
        </nav>
        <div class="sw-end">
          <a class="btn btn-deep btn-sm" href="${root}essai.html">Essayer gratuitement</a>
          <a class="btn btn-buy btn-sm" href="${root}kya-soldesign/tarifs.html#acheter">Acheter</a>
          <button class="menu-btn" type="button" aria-expanded="false" aria-controls="sw-nav" aria-label="Menu" data-menu>${icon('menu')}</button>
        </div>
      </div>
    </header>`;

  const min = `
    <header class="min-head"><div class="wrap">
      <a class="mk-brand" href="${root}index.html"><img src="${root}assets/img/kya-mark.png" alt="" width="30" height="25">KYA-EnergyMarket</a>
      <a class="back" href="${body.dataset.back ?? root + 'kya-soldesign/tarifs.html'}">${icon('left')} ${body.dataset.backLabel ?? 'Retour aux tarifs'}</a>
    </div></header>`;

  const slot = $('[data-chrome-top]');
  if (slot) slot.outerHTML = chrome === 'product' ? mk + sw : chrome === 'min' ? min : mk;

  // ---------------------------------------------------------------- Pied de page
  const footSlot = $('[data-chrome-foot]');
  if (footSlot) {
    footSlot.outerHTML = `
    <footer class="foot">
      <div class="wrap foot-top">
        <div class="foot-brand"><img src="${root}assets/img/kya-energy-group-logo.png" alt="KYA-Energy Group" style="width:72px">
          <p>La marketplace des logiciels de KYA-Energy Group. Certifié ISO 9001:2015.</p></div>
        <div><h4>Logiciels</h4><ul>${SOFTWARE.map((item) => `<li><a href="${item.href ? root + item.href : root + 'logiciels.html#' + item.id}">${item.name}</a></li>`).join('')}</ul></div>
        <div><h4>KYA-SolDesign</h4><ul><li><a href="${root}kya-soldesign/tarifs.html">Tarifs</a></li><li><a href="${root}kya-soldesign/ressources.html">Ressources</a></li><li><a href="${root}kya-soldesign/support.html">Support</a></li><li><a href="${root}essai.html">Essai gratuit</a></li></ul></div>
        <div><h4>Aide</h4><ul><li><a href="${root}aide.html">Questions fréquentes</a></li><li><a href="${root}contact.html">Contact</a></li><li><a href="${root}espace/index.html">Espace client</a></li></ul></div>
        <div><h4>KYA-Energy Group</h4><ul><li><a href="${root}a-propos.html">À propos</a></li><li><a href="${root}legal/cgv.html">CGV</a></li><li><a href="${root}legal/confidentialite.html">Confidentialité</a></li><li><a href="${root}legal/mentions-legales.html">Mentions légales</a></li></ul></div>
      </div>
      <div class="wrap foot-bottom"><span>© 2026 KYA-Energy Group</span><span><a href="${root}plan.html">Plan de la maquette</a><span>Maquette : les valeurs marquées <span class="ex">exemple</span> sont provisoires</span></span></div>
    </footer>`;
  }

  // Menu de l'espace client
  const acctNav = $('[data-acct-nav]');
  if (acctNav) {
    const current = body.dataset.acct;
    const link = (id, href, ic, label, count = '') => `<a href="${root}espace/${href}"${current === id ? ' aria-current="page"' : ''}>${icon(ic)}${label}${count ? `<span class="count">${count}</span>` : ''}</a>`;
    acctNav.innerHTML = `
      <div class="acct-org"><span class="avatar">SP</span><div><b>Soleil Plus</b><small>Bureau d'études · Lomé</small></div></div>
      ${link('dashboard', 'index.html', 'home', 'Tableau de bord')}
      ${link('licences', 'licences.html', 'key', 'Licences', '2')}
      ${link('downloads', 'telechargements.html', 'download', 'Téléchargements')}
      ${link('invoices', 'factures.html', 'receipt', 'Factures d\u2019achat', '3')}
      ${link('support', 'support.html', 'chat', 'Support', '1')}
      ${link('org', 'organisation.html', 'users', 'Organisation')}
      <div class="bottom"><a href="${root}connexion.html">${icon('out')}Se déconnecter</a></div>`;
  }
  // Bouton du canevas : montre les blocs que l'administration compose
  if ($('[data-block]')) {
    const toggle = document.createElement('button');
    toggle.className = 'blocks-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML = `${icon('blocks')}<span>Afficher les blocs</span>`;
    toggle.addEventListener('click', () => {
      const on = body.classList.toggle('show-blocks');
      toggle.setAttribute('aria-pressed', String(on));
      toggle.lastElementChild.textContent = on ? 'Masquer les blocs' : 'Afficher les blocs';
    });
    body.append(toggle);
  }

  // ---------------------------------------------------------------- Menus, en-tête collant, notification
  const closeAll = (except) => $$('[data-dd].is-open').forEach((dd) => { if (dd !== except) { dd.classList.remove('is-open'); $('button', dd).setAttribute('aria-expanded', 'false'); } });
  $$('[data-dd]').forEach((dd) => {
    const button = $('button', dd);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !dd.classList.contains('is-open');
      closeAll(dd);
      dd.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); });

  $$('[data-menu]').forEach((menu) => {
    const nav = document.getElementById(menu.getAttribute('aria-controls'));
    menu.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    });
  });

  const sticky = $$('[data-sticky]').filter((node) => getComputedStyle(node).position === 'sticky');
  const onScroll = () => sticky.forEach((node) => node.classList.toggle('is-stuck', window.scrollY > 60));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  let toastNode;
  const toast = (text) => {
    toastNode ??= Object.assign(document.createElement('div'), { className: 'toast', role: 'status' });
    if (!toastNode.isConnected) body.append(toastNode);
    toastNode.textContent = text;
    toastNode.classList.add('is-on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastNode.classList.remove('is-on'), 2200);
  };
  $$('[data-copy]').forEach((button) => button.addEventListener('click', () => {
    navigator.clipboard?.writeText(button.dataset.copy).catch(() => {});
    toast(button.dataset.copyMsg ?? 'Copié');
  }));
  $$('[data-toast]').forEach((node) => node.addEventListener('click', (event) => { event.preventDefault(); toast(node.dataset.toast); }));

  // Champ prérempli depuis l'adresse (contact.html?sujet=devis)
  $$('[data-param]').forEach((field) => { const value = new URLSearchParams(location.search).get(field.dataset.param); if (value && [...field.options].some((o) => o.value === value)) field.value = value; });

  // Onglets segmentés simples
  $$('[data-seg]').forEach((seg) => {
    const buttons = $$('button', seg);
    buttons.forEach((button) => button.addEventListener('click', () => {
      buttons.forEach((other) => other.setAttribute('aria-selected', String(other === button)));
      $$(`[data-seg-panel="${seg.dataset.seg}"]`).forEach((panel) => { panel.hidden = panel.dataset.value !== button.dataset.value; });
    }));
  });

  // ---------------------------------------------------------------- Jauges
  const ARC = Math.PI * 50;
  $$('[data-gauge]').forEach((svg) => {
    const value = Number(svg.dataset.gauge);
    const kind = svg.dataset.kind ?? '';
    svg.setAttribute('viewBox', '0 0 132 76');
    svg.innerHTML = `<path class="track" d="M16 66a50 50 0 0 1 100 0"/><path class="val ${kind}" d="M16 66a50 50 0 0 1 100 0" stroke-dasharray="${ARC}" stroke-dashoffset="${ARC}"/>`;
    const fill = $('.val', svg);
    const show = () => { fill.style.strokeDashoffset = String(ARC * (1 - Math.min(value, 1))); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { show(); io.disconnect(); } });
      io.observe(svg);
    } else show();
  });

  // ---------------------------------------------------------------- Exemple interactif (projet exemple de KYA-SolDesign)
  // Valeurs de l'écran « Prédimensionnement » du projet Centre de santé de Bombouaka : SRI 0,903 (LPSP 4,1 %, LOLP 5,8 %),
  // coût du kWh 100,6 FCFA, SVI 0,84, production 5 118 kWh/an, besoin 10,08 kWh/j. La répartition par mois est indicative.
  const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const pct = (value, lo, hi) => `${(((value - lo) / (hi - lo)) * 92).toFixed(1)}%`;
  const VIEWS = {
    rel: {
      label: 'Fiabilité technique (SRI)', big: '0,90', unit: 'sur 1', gauge: 0.903,
      label2: 'Énergie non servie', mid: '4,1', unit2: '%',
      say: '<b>Proche de 1</b> : le système couvre les besoins presque toute l’année, sans coupure.',
      legend: ['Part des besoins couverte, mois par mois', 'échelle 80–100 %'],
      bars: { values: [99, 99, 99, 98, 96, 93, 91, 88, 92, 97, 99, 99], lo: 80, hi: 100, hot: 7 },
      rows: [['Mois le plus faible', 'Août, saison des pluies', '88 <em>%</em>'], ['Heures de manque', 'Sur les 8 760 heures de l’année', '508 <em>h</em>']],
    },
    eco: {
      label: 'Accessibilité économique (SVI)', big: '0,84', unit: 'sur 1', gauge: 0.84, kind: 'eco',
      label2: 'Coût du kWh produit', mid: '100,6', unit2: 'FCFA/kWh',
      say: '<b>Sous 1</b> : chaque kWh produit coûte moins cher que celui du réseau.',
      legend: ['Coût d’un kWh', '0,84 = 100,6 ÷ 120'],
      compare: [['Votre installation', 100.6, true], ['Réseau électrique', 120, false]],
      rows: [['Tarif du réseau retenu', 'Saisi dans le projet', '120 <em>FCFA/kWh</em>'], ['Écart par kWh', 'En faveur de l’installation', '19,4 <em>FCFA</em>']],
    },
    prod: {
      label: 'Production sur l’année', big: '5 118', unit: 'kWh', gauge: null,
      label2: 'Besoin', mid: '10,08', unit2: 'kWh/jour',
      say: 'De juin à septembre, le soleil manque : <b>c’est là que se joue la fiabilité</b>.',
      legend: ['Production par mois, kWh', 'pointillé : besoin moyen'],
      bars: { values: [478, 457, 488, 467, 435, 382, 350, 340, 372, 425, 457, 467], lo: 0, hi: 488, hot: 7, ref: [307, 'Besoin 307 kWh'] },
      rows: [['Puissance crête', '7 modules de 410 Wc', '2,85 <em>kWc</em>'], ['Stockage', 'Batterie 48 V', '6,26 <em>kWh</em>']],
    },
  };
  const app = $('[data-app]');
  if (app) {
    const chart = $('[data-chart]', app);
    const field = (name) => $(`[data-f="${name}"]`, app);
    const tabs = $$('[role="tab"]', app);
    const gauge = $('[data-app-gauge]', app);
    const drawBars = ({ values, lo, hi, hot, ref }) => {
      chart.className = 'chart';
      if ($$('.bar', chart).length !== values.length) chart.innerHTML = values.map((_, index) => `<div class="bar" style="--h:0%"><i>${MONTHS[index]}</i></div>`).join('');
      $('.ref', chart)?.remove();
      requestAnimationFrame(() => $$('.bar', chart).forEach((bar, index) => { bar.style.setProperty('--h', pct(values[index], lo, hi)); bar.classList.toggle('is-hot', index === hot); }));
      if (ref) chart.insertAdjacentHTML('beforeend', `<div class="ref" style="--h:${pct(ref[0], lo, hi)}"><span>${ref[1]}</span></div>`);
    };
    const drawCompare = (items) => {
      chart.className = 'chart is-compare';
      const top = Math.max(...items.map(([, value]) => value));
      chart.innerHTML = items.map(([name, value, hot]) => `<div class="cmp${hot ? ' is-hot' : ''}"><span>${name}</span><div style="--w:0%">${String(value).replace('.', ',')}</div></div>`).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.cmp div', chart).forEach((bar, index) => bar.style.setProperty('--w', `${(items[index][1] / top) * 100}%`))));
    };
    const show = (key) => {
      const view = VIEWS[key];
      ['label', 'big', 'unit', 'label2', 'mid', 'unit2'].forEach((name) => { field(name).textContent = view[name]; });
      field('say').innerHTML = view.say;
      $('[data-legend]', app).innerHTML = `<span>${view.legend[0]}</span><span>${view.legend[1]}</span>`;
      if (view.bars) drawBars(view.bars); else drawCompare(view.compare);
      $('[data-rows]', app).innerHTML = view.rows.map(([title, note, value]) => `<li><b>${title}</b><small>${note}</small><span>${value}</span></li>`).join('');
      if (gauge) {
        gauge.hidden = view.gauge === null;
        if (view.gauge !== null) {
          const fill = $('.val', gauge);
          fill.classList.toggle('eco', view.kind === 'eco');
          fill.style.strokeDashoffset = String(ARC * (1 - view.gauge));
        }
      }
      $('[data-panel]', app).setAttribute('aria-labelledby', `tab-${key}`);
    };
    const select = (tab, focus) => {
      tabs.forEach((other) => { const on = other === tab; other.setAttribute('aria-selected', String(on)); other.tabIndex = on ? 0 : -1; });
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

  // ---------------------------------------------------------------- Le point juste
  // Courbe illustrative calée sur le projet exemple : coût(0,903) = 100,6 FCFA/kWh ; réseau à 120 FCFA/kWh.
  const fit = $('[data-fit]');
  if (fit) {
    const range = $('input', fit);
    const svg = $('svg', fit);
    const W = 560, H = 320, L = 48, R = 16, T = 16, B = 40;
    const sMin = 0.8, sMax = 0.99, cMax = 260, grid = 120;
    const cost = (s) => 62 + 5.97 / Math.pow(1 - s, 0.8);
    const x = (s) => L + ((s - sMin) / (sMax - sMin)) * (W - L - R);
    const y = (c) => T + (1 - c / cMax) * (H - T - B);
    const points = [];
    for (let s = sMin; s <= sMax + 1e-9; s += 0.0025) points.push(`${x(s).toFixed(1)},${y(Math.min(cost(s), cMax)).toFixed(1)}`);
    const crossing = 0.9416;
    const ticksX = [0.8, 0.85, 0.9, 0.95, 0.99];
    const ticksY = [0, 60, 120, 180, 240];
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `
      ${ticksY.map((c) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(c)}" y2="${y(c)}"/><text class="axis" x="${L - 8}" y="${y(c) + 4}" text-anchor="end">${c}</text>`).join('')}
      ${ticksX.map((s) => `<text class="axis" x="${x(s)}" y="${H - 14}" text-anchor="middle">${String(s).replace('.', ',')}</text>`).join('')}
      <rect class="zone" x="${x(0.88)}" y="${T}" width="${x(crossing) - x(0.88)}" height="${H - T - B}"/>
      <line class="gridline" x1="${L}" x2="${W - R}" y1="${y(grid)}" y2="${y(grid)}"/>
      <text class="gridlabel" x="${L + 6}" y="${y(grid) - 8}">Réseau · 120 FCFA/kWh</text>
      <polyline class="curve" points="${points.join(' ')}"/>
      <line class="guide" data-g="v"/><line class="guide" data-g="h"/>
      <circle class="dot" r="8"/>
      <text class="axis" x="0" y="${T - 4}">FCFA/kWh</text>`;
    const dot = $('.dot', svg);
    const [gv, gh] = [$('[data-g="v"]', svg), $('[data-g="h"]', svg)];
    const out = (name) => $(`[data-o="${name}"]`, fit);
    const verdict = $('.fit-verdict', fit);
    const update = () => {
      const s = Number(range.value) / 1000;
      const c = cost(s);
      const svi = c / grid;
      range.style.setProperty('--p', `${((s - sMin) / (sMax - sMin)) * 100}%`);
      dot.setAttribute('cx', x(s)); dot.setAttribute('cy', y(Math.min(c, cMax)));
      gv.setAttribute('x1', x(s)); gv.setAttribute('x2', x(s)); gv.setAttribute('y1', y(Math.min(c, cMax))); gv.setAttribute('y2', H - B);
      gh.setAttribute('x1', L); gh.setAttribute('x2', x(s)); gh.setAttribute('y1', y(Math.min(c, cMax))); gh.setAttribute('y2', y(Math.min(c, cMax)));
      out('sri').textContent = s.toFixed(2).replace('.', ',');
      out('cost').textContent = c.toFixed(1).replace('.', ',');
      out('svi').textContent = svi.toFixed(2).replace('.', ',');
      verdict.classList.toggle('is-over', svi > 1);
      verdict.classList.toggle('is-low', s < 0.88);
      verdict.textContent = s < 0.88
        ? 'Trop juste : l’énergie manquera trop souvent. Les coupures coûtent plus cher que les panneaux économisés.'
        : svi > 1
          ? 'Trop grand : chaque point de fiabilité en plus fait passer le kWh au-dessus du prix du réseau.'
          : 'Le point juste : fiable, et moins cher que le réseau. C’est ce que KYA-SolDesign cherche pour vous.';
    };
    range.addEventListener('input', update);
    update();
  }

  // ---------------------------------------------------------------- Accordéon qui change la capture
  $$('[data-steps]').forEach((steps) => {
    const img = $('[data-steps-img]');
    const caption = $('[data-steps-cap]');
    $$('details', steps).forEach((details) => details.addEventListener('toggle', () => {
      if (!details.open || !img) return;
      img.style.opacity = '0';
      setTimeout(() => { img.src = details.dataset.img; img.alt = details.dataset.alt; if (caption) caption.textContent = details.dataset.alt; img.style.opacity = '1'; }, 180);
    }));
  });

  // ---------------------------------------------------------------- Témoignages
  $$('[data-quotes]').forEach((box) => {
    const items = $$('figure', box);
    const nav = $('.quote-nav', box);
    nav.innerHTML = items.map((_, index) => `<button type="button" aria-label="Témoignage ${index + 1}"></button>`).join('');
    const buttons = $$('button', nav);
    const go = (index) => { items.forEach((item, i) => { item.hidden = i !== index; }); buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === index))); };
    buttons.forEach((button, index) => button.addEventListener('click', () => go(index)));
    go(0);
  });

  // ---------------------------------------------------------------- Offres (configurées dans l'administration ; prix d'exemple)
  const EDITIONS = {
    commercial: { name: 'Commerciale', seats: 50, plans: { '1m': ['1 mois', 25000], '3m': ['1 trimestre', 65000], '12m': ['1 an', 220000] }, def: '12m' },
    academic: { name: 'Académique', seats: 200, plans: { '12m': ['1 an', 90000] }, def: '12m' },
    student: { name: 'Étudiant', seats: 1, plans: { '1d': ['1 jour', 1500], '1m': ['1 mois', 7500] }, def: '1m' },
  };
  const INCLUDED = {
    commercial: [['Parcours complet et calculs', 1], ['Optimisation sur vos références de matériel', 1], ['Devis et prix de vente', 1], ['Export Word des documents', 1], ['Émission et révisions du dossier', 1], ['Votre matériel ajouté au catalogue', 1], ['Projets illimités, sans filigrane', 1], ['Mises à jour incluses', 1]],
    academic: [['Parcours complet et calculs', 1], ['Optimisation sur vos références de matériel', 1], ['Export Word des documents', 1], ['Émission et révisions du dossier', 1], ['Projets illimités', 1], ['Filigrane « Académique » sur les documents', 1], ['Devis et prix de vente', 0], ['Mises à jour incluses', 1]],
    student: [['Parcours complet et calculs', 1], ['Jusqu’à 5 projets', 1], ['Filigrane « Étudiant » sur les documents', 1], ['Mises à jour incluses', 1], ['Optimisation, export Word, devis', 0]],
  };
  const TAX = { TG: ['Togo', 0.18], BJ: ['Bénin', 0.18], CI: ['Côte d’Ivoire', 0.18], BF: ['Burkina Faso', 0.18], SN: ['Sénégal', 0.18], ML: ['Mali', 0.18], NE: ['Niger', 0.19], XX: ['Autre pays', 0] };

  const configurator = (scope, { withTax }) => {
    const state = { edition: 'commercial', plan: '12m', seats: 1, country: 'TG' };
    const params = new URLSearchParams(location.search);
    if (EDITIONS[params.get('edition')]) state.edition = params.get('edition');
    state.plan = EDITIONS[state.edition].plans[params.get('plan')] ? params.get('plan') : EDITIONS[state.edition].def;
    state.seats = Math.max(1, Math.min(Number(params.get('seats')) || 1, EDITIONS[state.edition].seats));
    const plansBox = $('[data-plans]', scope);
    const seatsInput = $('[data-seats]', scope);
    const render = () => {
      const edition = EDITIONS[state.edition];
      $$('input[name="edition"]', scope).forEach((input) => { input.checked = input.value === state.edition; });
      plansBox.innerHTML = Object.entries(edition.plans).map(([id, [label, price]]) => `
        <label class="opt">${id === edition.def && Object.keys(edition.plans).length > 1 ? '<span class="badge-top">Présélectionnée</span>' : ''}
          <input type="radio" name="plan" value="${id}"${id === state.plan ? ' checked' : ''}>
          <b>${label}</b><span class="price">${fcfa(price)} FCFA <span class="ex">exemple</span></span><small>par poste</small></label>`).join('');
      plansBox.className = `choice cols-${Math.min(Object.keys(edition.plans).length, 3)}`;
      $$('input[name="plan"]', plansBox).forEach((input) => input.addEventListener('change', () => { state.plan = input.value; render(); }));
      state.seats = Math.min(state.seats, edition.seats);
      seatsInput.value = state.seats;
      seatsInput.max = edition.seats;
      $('[data-minus]', scope).disabled = state.seats <= 1;
      $('[data-plus]', scope).disabled = state.seats >= edition.seats;
      $('[data-seats-note]', scope).textContent = edition.seats === 1 ? 'L’édition Étudiant se prend pour un seul poste.' : 'Un poste = un ordinateur. Vous attribuez les postes à vos collègues depuis votre espace.';
      const [label, price] = edition.plans[state.plan];
      const subtotal = price * state.seats;
      const [countryName, rate] = TAX[state.country];
      const tax = withTax ? subtotal * rate : 0;
      const set = (name, value) => $$(`[data-s="${name}"]`, scope).forEach((node) => { node.textContent = value; });
      set('edition', `KYA-SolDesign · ${edition.name}`);
      set('plan', label);
      set('seats', `${state.seats} ${state.seats > 1 ? 'postes' : 'poste'}`);
      set('unit', `${fcfa(price)} FCFA`);
      set('subtotal', `${fcfa(subtotal)} FCFA`);
      set('tax-label', `TVA ${Math.round(rate * 100)} % (${countryName})`);
      set('tax', `${fcfa(tax)} FCFA`);
      set('total', fcfa(subtotal + tax));
      $$('[data-inc]', scope).forEach((list) => { list.innerHTML = INCLUDED[state.edition].map(([text, yes]) => `<li class="${yes ? '' : 'no'}">${icon(yes ? 'check' : 'x')}${text}</li>`).join(''); });
      $$('[data-buy-link]', scope).forEach((link) => { link.href = `${root}achat.html?edition=${state.edition}&plan=${state.plan}&seats=${state.seats}`; });
      $$('[data-pay-label]', scope).forEach((node) => { node.textContent = `Payer ${fcfa(subtotal + tax)} FCFA`; });
      scope.dataset.edition = state.edition;
      $$('[data-hl]').forEach((cell) => cell.classList.toggle('hl', cell.dataset.hl === state.edition));
    };
    $$('input[name="edition"]', scope).forEach((input) => input.addEventListener('change', () => { state.edition = input.value; state.plan = EDITIONS[state.edition].def; render(); }));
    $('[data-minus]', scope).addEventListener('click', () => { state.seats = Math.max(1, state.seats - 1); render(); });
    $('[data-plus]', scope).addEventListener('click', () => { state.seats += 1; render(); });
    seatsInput.addEventListener('change', () => { state.seats = Math.max(1, Number(seatsInput.value) || 1); render(); });
    $('[data-country]', scope)?.addEventListener('change', (event) => { state.country = event.target.value; render(); });
    render();
    return state;
  };
  const pricing = $('[data-pricing]');
  if (pricing) configurator(pricing, { withTax: false });

  const checkout = $('[data-checkout]');
  if (checkout) {
    const state = configurator(checkout, { withTax: true });
    checkout.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = $('[name="billing-email"]', checkout);
      if (!email.value.includes('@')) { email.setAttribute('aria-invalid', 'true'); email.focus(); toast('Indiquez l’adresse qui recevra la facture'); return; }
      const button = $('[type="submit"]', checkout);
      button.disabled = true;
      button.textContent = 'Paiement en cours…';
      setTimeout(() => { location.href = `${root}confirmation.html?edition=${state.edition}&plan=${state.plan}&seats=${state.seats}`; }, 900);
    });
  }

  const done = $('[data-done]');
  if (done) {
    const params = new URLSearchParams(location.search);
    const edition = EDITIONS[params.get('edition')] ?? EDITIONS.commercial;
    const plan = edition.plans[params.get('plan')] ?? edition.plans[edition.def];
    const seats = Math.max(1, Number(params.get('seats')) || 1);
    $$('[data-d="edition"]').forEach((node) => { node.textContent = `KYA-SolDesign ${edition.name}`; });
    $$('[data-d="plan"]').forEach((node) => { node.textContent = plan[0]; });
    $$('[data-d="seats"]').forEach((node) => { node.textContent = `${seats} ${seats > 1 ? 'postes' : 'poste'}`; });
  }

  // ---------------------------------------------------------------- Parcours d'essai
  const flow = $('[data-flow]');
  if (flow) {
    const steps = $$('.flow-steps li', flow);
    const cards = $$('.flow-card', flow);
    const go = (index) => {
      steps.forEach((step, i) => { step.classList.toggle('is-done', i < index); step.classList.toggle('is-now', i === index); });
      cards.forEach((card, i) => card.classList.toggle('is-now', i === index));
      if (index > 0) flow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    $$('[data-next]', flow).forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      const form = button.closest('form');
      if (form && !form.reportValidity()) return;
      go(Number(button.dataset.next));
    }));
    go(0);
  }

  // ---------------------------------------------------------------- Espace client : postes
  $$('[data-assign]').forEach((button) => button.addEventListener('click', () => {
    const row = document.getElementById(button.dataset.assign);
    row.classList.toggle('is-open');
    $('input', row)?.focus();
  }));
  $$('[data-assign-send]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = $('input', form).value.trim();
    if (!email.includes('@')) { $('input', form).setAttribute('aria-invalid', 'true'); return; }
    form.classList.remove('is-open');
    toast(`Invitation envoyée à ${email}`);
  }));
  $$('[data-release]').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('tr');
    $('.who', row).innerHTML = '<b>Poste libre</b><small>Prêt à être attribué</small>';
    $('[data-machine]', row).textContent = '—';
    button.replaceWith(Object.assign(document.createElement('span'), { className: 'state off', textContent: 'Libéré' }));
    toast('Poste libéré : KYA-SolDesign se ferme sur cet ordinateur à sa prochaine connexion');
  }));

  // ---------------------------------------------------------------- Aide : filtre des questions
  $$('[data-filter]').forEach((input) => {
    const scope = document.getElementById(input.dataset.filter);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      $$('details', scope).forEach((details) => { details.hidden = q !== '' && !details.textContent.toLowerCase().includes(q); if (q) details.open = !details.hidden; });
    });
  });

  // ---------------------------------------------------------------- Assistant (réponses tirées de la documentation)
  $$('[data-assist]').forEach((box) => {
    const log = $('.assist-log', box);
    const form = $('form', box);
    const ANSWERS = [
      [/essai|gratuit/i, 'L’essai s’active une fois par compte depuis la page Essai. Vous recevez une clé d’essai ; collez-la dans KYA-SolDesign, ou connectez-vous directement depuis le logiciel.', 'Guide · Activer l’essai'],
      [/poste|ordinateur|coll[eè]gue/i, 'Chaque poste correspond à un ordinateur. Depuis votre espace, Licences → Attribuer un poste, saisissez le courriel du collègue : il reçoit une invitation et active le logiciel avec son compte.', 'Guide · Licences multipostes'],
      [/facture|re[cç]u/i, 'La facture d’achat est envoyée par courriel après le paiement et reste disponible dans votre espace, rubrique Factures d’achat.', 'Aide · Facturation'],
      [/sri|svi|fiabilit|accessib/i, 'Le SRI mesure la fiabilité technique : proche de 1, le système couvre les besoins sans coupure. Le SVI compare le coût du kWh produit au prix du réseau : sous 1, votre énergie est moins chère.', 'La méthode · Les deux indicateurs'],
    ];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('input', form);
      const text = input.value.trim();
      if (!text) return;
      log.insertAdjacentHTML('beforeend', `<div class="msg me"></div>`);
      log.lastElementChild.textContent = text;
      input.value = '';
      const hit = ANSWERS.find(([pattern]) => pattern.test(text));
      setTimeout(() => {
        log.insertAdjacentHTML('beforeend', hit
          ? `<div class="msg bot">${hit[1]}<a class="src" href="#">Source : ${hit[2]}</a></div>`
          : '<div class="msg bot">Je n’ai pas trouvé de réponse sûre dans la documentation. Voulez-vous écrire à l’équipe support ? <a class="src" href="#contacter">Contacter le support</a></div>');
        log.scrollTop = log.scrollHeight;
      }, 500);
      log.scrollTop = log.scrollHeight;
    });
  });
})();

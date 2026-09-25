/*
 * KYA Energy Market — proposition 2.
 * Trois moments de mouvement, chacun avec un rôle : l'arbre d'étude (la méthode se déploie),
 * le nuage fiabilité × coût (le visiteur règle, le logiciel choisit), les étapes qui avancent
 * seules. Tout le reste est immobile. `prefers-reduced-motion` montre l'état final sans animer.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const fr = (value, dec) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(value);
  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.appendChild(node);
    return node;
  };
  const onceVisible = (target, run, threshold = 0.35) => {
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); run(); }
    }, { threshold });
    observer.observe(target);
  };

  /* ================================================================ Navigation */
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  /* ================================================================ Mode canevas */
  const canvasToggle = document.querySelector('.canvas-toggle');
  canvasToggle?.addEventListener('click', () => {
    const on = document.body.classList.toggle('show-canvas');
    canvasToggle.setAttribute('aria-pressed', String(on));
    canvasToggle.querySelector('span').textContent = on ? 'Masquer le canevas' : 'Afficher le canevas';
  });

  /* ================================================================ Arbre d'étude */
  const stage = document.getElementById('tree-stage');
  const source = document.getElementById('tree-data');
  if (stage && source) {
    const items = [...source.children].map((li) => ({
      side: li.dataset.side, k: li.dataset.k, v: li.dataset.v, u: li.dataset.u ?? '',
      num: li.dataset.num ? Number(li.dataset.num) : null, dec: Number(li.dataset.dec ?? 0),
    }));
    const inputs = items.filter((item) => item.side === 'in');
    const core = items.find((item) => item.side === 'core');
    const outputs = items.filter((item) => item.side === 'out');
    let svg = null;
    let sparkTimer = 0;
    let visible = false;

    // Le groupe extérieur place le nœud ; le groupe intérieur (`.pop`) porte l'animation.
    const nodeBox = (group, item, x, y, w, h, kind) => {
      const outer = el('g', { class: `node ${kind}`, transform: `translate(${x} ${y})` }, group);
      const g = el('g', { class: 'pop' }, outer);
      el('rect', { width: w, height: h, rx: kind === 'core' ? 12 : 9 }, g);
      if (kind === 'core') {
        const logo = el('image', { href: 'assets/img/kya-soldesign-logo.png', x: 14, y: (h - 34) / 2, width: 44, height: 34 }, g);
        logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        el('text', { class: 'k', x: 68, y: h / 2 - 6 }, g).textContent = item.k;
        el('text', { class: 'v', x: 68, y: h / 2 + 15 }, g).textContent = item.v;
      } else {
        el('text', { class: 'k', x: 14, y: 21 }, g).textContent = item.k;
        const v = el('text', { class: 'v', x: 14, y: h - 12 }, g);
        const value = el('tspan', {}, v);
        value.textContent = item.v;
        if (item.u) { const unit = el('tspan', { class: 'u', dx: 6 }, v); unit.textContent = item.u; }
        if (item.num !== null) { value.dataset.num = item.num; value.dataset.dec = item.dec; }
      }
      return outer;
    };

    const curve = (group, x1, y1, x2, y2, cls, vertical = false) => {
      const d = vertical
        ? `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`
        : `M${x1} ${y1} C${x1 + (x2 - x1) * 0.55} ${y1} ${x2 - (x2 - x1) * 0.55} ${y2} ${x2} ${y2}`;
      return el('path', { d, class: `link ${cls}` }, group);
    };

    const build = () => {
      stage.querySelector('svg.tree')?.remove();
      const wide = stage.clientWidth >= 760;
      svg = el('svg', { class: 'tree', 'aria-hidden': 'true' });
      const links = el('g', {}, svg);
      const nodes = el('g', {}, svg);
      const plan = { ins: [], core: null, outs: [], linksIn: [], linksOut: [] };

      if (wide) {
        const W = 1160, H = 396, inW = 262, outW = 268, nodeH = 58, coreW = 236, coreH = 84;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const cx = W / 2 - coreW / 2, cy = H / 2 - coreH / 2;
        inputs.forEach((item, i) => {
          const y = H / 2 + (i - (inputs.length - 1) / 2) * 112 - nodeH / 2;
          plan.ins.push(nodeBox(nodes, item, 0, y, inW, nodeH, 'in'));
          plan.linksIn.push(curve(links, inW, y + nodeH / 2, cx, H / 2, 'link-in'));
        });
        plan.core = nodeBox(nodes, core, cx, cy, coreW, coreH, 'core');
        const gap = 66;
        outputs.forEach((item, i) => {
          const y = H / 2 + (i - (outputs.length - 1) / 2) * gap - (nodeH - 4) / 2;
          plan.outs.push(nodeBox(nodes, item, W - outW, y, outW, nodeH - 4, 'out'));
          plan.linksOut.push(curve(links, cx + coreW, H / 2, W - outW, y + (nodeH - 4) / 2, 'link-out'));
        });
      } else {
        // Téléphone : un arbre logique vertical, colonne vertébrale à gauche.
        const W = Math.max(300, stage.clientWidth - 8), row = 62, nodeH = 52, spineX = 16, indent = 34;
        const elbow = (x1, y1, x2, y2, cls) => el('path', { d: `M${x1} ${y1} C${spineX} ${y1} ${spineX} ${y1} ${spineX} ${y1 + Math.sign(y2 - y1) * 14} L${spineX} ${y2 - Math.sign(y2 - y1) * 14} C${spineX} ${y2} ${spineX} ${y2} ${x2} ${y2}`, class: `link ${cls}` }, links);
        let y = 0;
        const inMids = [];
        inputs.forEach((item) => {
          plan.ins.push(nodeBox(nodes, item, indent, y, W - indent, nodeH, 'in'));
          inMids.push(y + nodeH / 2);
          y += row;
        });
        y += 14;
        const coreTop = y;
        plan.core = nodeBox(nodes, core, spineX + 6, y, W - spineX - 6, 76, 'core');
        inMids.forEach((mid) => plan.linksIn.push(el('path', { d: `M${indent} ${mid} C${spineX} ${mid} ${spineX} ${mid} ${spineX} ${mid + 14} L${spineX} ${coreTop + 38} L${spineX + 6} ${coreTop + 38}`, class: 'link link-in' }, links)));
        const coreMid = coreTop + 38;
        y += 76 + 22;
        outputs.forEach((item) => {
          plan.outs.push(nodeBox(nodes, item, indent, y, W - indent, nodeH, 'out'));
          plan.linksOut.push(elbow(spineX + 6, coreMid, indent, y + nodeH / 2, 'link-out'));
          y += row;
        });
        svg.setAttribute('viewBox', `0 -6 ${W} ${y + 6}`);
      }
      stage.appendChild(svg);
      return plan;
    };

    const count = (tspan, delay) => {
      const target = Number(tspan.dataset.num), dec = Number(tspan.dataset.dec);
      const start = performance.now() + delay, duration = 900;
      const tick = (now) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - Math.pow(1 - t, 4);
        tspan.textContent = fr(target * eased, dec);
        if (t < 1) requestAnimationFrame(tick);
      };
      tspan.textContent = fr(0, dec);
      requestAnimationFrame(tick);
    };

    const draw = (path, delay, duration = 650) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
    };
    const pop = (node, delay) => node.querySelector('.pop').animate(
      [{ opacity: 0, transform: 'scale(0.88)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 560, delay, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'both' },
    );

    const play = (plan) => {
      if (reduced) return;
      let t = 0;
      plan.ins.forEach((node, i) => pop(node, t + i * 110));
      t += plan.ins.length * 110 + 150;
      plan.linksIn.forEach((path, i) => draw(path, t + i * 90));
      t += 700;
      pop(plan.core, t);
      plan.core.querySelector('rect').animate([{ strokeWidth: 1.4 }, { strokeWidth: 5 }, { strokeWidth: 1.4 }], { duration: 700, delay: t + 200, easing: 'ease-out' });
      t += 450;
      plan.linksOut.forEach((path, i) => draw(path, t + i * 85, 600));
      plan.outs.forEach((node, i) => {
        pop(node, t + 300 + i * 85);
        node.querySelectorAll('tspan[data-num]').forEach((tspan) => count(tspan, t + 300 + i * 85));
      });
    };

    // Étincelles : un courant qui va des entrées vers les résultats, tant que l'arbre est visible.
    const spark = (plan) => {
      if (reduced || !visible || document.hidden) return;
      const a = plan.linksIn[Math.floor(Math.random() * plan.linksIn.length)];
      const b = plan.linksOut[Math.floor(Math.random() * plan.linksOut.length)];
      const dot = el('circle', { r: 3.2, class: 'spark' }, svg);
      const la = a.getTotalLength(), lb = b.getTotalLength(), total = 1500;
      const start = performance.now();
      const tick = (now) => {
        const t = (now - start) / total;
        if (t >= 1) { dot.remove(); return; }
        const p = t < 0.45 ? a.getPointAtLength((t / 0.45) * la) : b.getPointAtLength(((t - 0.45) / 0.55) * lb);
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
        dot.setAttribute('opacity', String(Math.min(1, (1 - t) * 3)));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    let plan = build();
    new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); }, { threshold: 0.2 }).observe(stage);
    onceVisible(stage, () => {
      play(plan);
      if (!reduced) sparkTimer = setInterval(() => spark(plan), 1400);
    }, 0.25);
    document.getElementById('tree-replay')?.addEventListener('click', () => { plan = build(); play(plan); });
    let lastWide = stage.clientWidth >= 760;
    addEventListener('resize', () => {
      const wide = stage.clientWidth >= 760;
      if (wide !== lastWide || !wide) { lastWide = wide; plan = build(); }
    });
    void sparkTimer;
  }

  /* ================================================================ Fiabilité × coût */
  const chart = document.getElementById('chart');
  if (chart) {
    // Nuage d'illustration, déterministe : 11 × 11 couples champ / stockage.
    const noise = (i) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const points = [];
    for (let a = 0; a <= 10; a += 1) {
      for (let n = 0; n <= 10; n += 1) {
        const pv = a / 10, st = n / 10, i = a * 11 + n;
        const sri = Math.min(0.992, Math.max(0.33, 1 - 0.55 * Math.exp(-3.2 * pv) - 0.35 * Math.exp(-2.6 * st) + noise(i) * 0.012));
        const cost = 1.25 + 1.85 * pv + 1.45 * st + noise(i + 7) * 0.06;
        points.push({ sri, cost });
      }
    }
    const M = { l: 56, r: 18, t: 18, b: 46 }, W = 640, H = 400;
    const xMin = 1.1, xMax = 4.7, yMin = 0.3, yMax = 1;
    const X = (v) => M.l + ((v - xMin) / (xMax - xMin)) * (W - M.l - M.r);
    const Y = (v) => H - M.b - ((v - yMin) / (yMax - yMin)) * (H - M.t - M.b);

    for (let v = 0.4; v <= 1.001; v += 0.1) {
      el('line', { class: 'grid', x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v) }, chart);
      el('text', { class: 'tick', x: M.l - 10, y: Y(v) + 4, 'text-anchor': 'end' }, chart).textContent = fr(v, 1);
    }
    for (let v = 1.5; v <= 4.5; v += 1) el('text', { class: 'tick', x: X(v), y: H - M.b + 18, 'text-anchor': 'middle' }, chart).textContent = `${fr(v, 1)} M`;
    el('line', { class: 'axis', x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, chart);
    el('line', { class: 'axis', x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }, chart);
    el('text', { class: 'ax-label', x: W - M.r, y: H - 8, 'text-anchor': 'end' }, chart).textContent = 'Coût du système (F CFA, illustration)';
    el('text', { class: 'ax-label', x: 14, y: M.t + 2, transform: `rotate(-90 14 ${M.t + 2})`, 'text-anchor': 'end' }, chart).textContent = 'Fiabilité (SRI)';

    const dots = points.map((p) => el('circle', { class: 'pt', cx: X(p.cost), cy: Y(p.sri), r: 4 }, chart));
    const best = points.reduce((m, p) => (p.sri > m.sri ? p : m));
    const cheapest = points.reduce((m, p) => (p.cost < m.cost ? p : m));
    el('circle', { class: 'mark', cx: X(best.cost), cy: Y(best.sri), r: 9 }, chart);
    el('text', { class: 'mark-label', x: X(best.cost) - 14, y: Y(best.sri) - 10, 'text-anchor': 'end' }, chart).textContent = 'La plus fiable';
    el('circle', { class: 'mark', cx: X(cheapest.cost), cy: Y(cheapest.sri), r: 9 }, chart);
    el('text', { class: 'mark-label', x: X(cheapest.cost) + 4, y: Y(cheapest.sri) - 16 }, chart).textContent = 'La moins chère';

    const line = el('line', { class: 'threshold', x1: M.l, x2: W - M.r }, chart);
    const lineLabel = el('text', { class: 'threshold-label', x: M.l + 8 }, chart);
    const ring = el('circle', { class: 'chosen-ring', r: 11 }, chart);
    const core = el('circle', { class: 'chosen-dot', r: 5 }, chart);
    const label = el('text', { class: 'chosen-label' }, chart);

    const range = document.getElementById('target');
    const out = document.getElementById('target-out');
    const save = document.getElementById('verdict-save');
    const text = document.getElementById('verdict-text');

    const update = (animateRing = true) => {
      const target = Number(range.value);
      out.textContent = `SRI ≥ ${fr(target, 2)}`;
      line.setAttribute('y1', Y(target)); line.setAttribute('y2', Y(target));
      lineLabel.setAttribute('y', Y(target) - 7);
      lineLabel.textContent = `Fiabilité visée ${fr(target, 2)}`;
      let chosen = null;
      points.forEach((p, i) => {
        const ok = p.sri >= target;
        dots[i].classList.toggle('ok', ok);
        if (ok && (!chosen || p.cost < chosen.cost)) chosen = p;
      });
      if (!chosen) return;
      const cx = X(chosen.cost), cy = Y(chosen.sri);
      for (const node of [ring, core]) { node.setAttribute('cx', cx); node.setAttribute('cy', cy); }
      const right = cx < W - 190;
      label.setAttribute('x', right ? cx + 16 : cx - 16);
      label.setAttribute('text-anchor', right ? 'start' : 'end');
      label.setAttribute('y', cy + 22);
      label.textContent = `Retenue · SRI ${fr(chosen.sri, 2)}`;
      const gain = Math.round((1 - chosen.cost / best.cost) * 100);
      save.textContent = `−${gain} %`;
      text.textContent = `de coût par rapport à la configuration la plus fiable, avec une fiabilité SRI de ${fr(chosen.sri, 2)} pour ${fr(target, 2)} visée.`;
      if (animateRing && !reduced) ring.animate([{ r: 22, opacity: 0 }, { r: 11, opacity: 1 }], { duration: 480, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
    };
    range.addEventListener('input', () => update());

    // Entrée en scène : les points tombent par coût croissant, puis le seuil balaie, puis le choix.
    if (reduced) { update(false); } else {
      dots.forEach((dot) => { dot.style.opacity = '0'; });
      [line, lineLabel, ring, core, label].forEach((node) => { node.style.opacity = '0'; });
      update(false);
      onceVisible(chart, () => {
        const order = points.map((p, i) => [p.cost, i]).sort((u, v) => u[0] - v[0]);
        order.forEach(([, i], rank) => dots[i].animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: rank * 7, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }));
        const after = points.length * 7 + 300;
        [line, lineLabel].forEach((node) => node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: after, fill: 'forwards' }));
        line.animate([{ transform: `translateY(${Y(0.4) - Y(Number(range.value))}px)` }, { transform: 'none' }], { duration: 900, delay: after, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
        [ring, core, label].forEach((node) => node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: after + 850, fill: 'forwards' }));
        setTimeout(() => update(true), after + 850);
      }, 0.3);
    }
  }

  /* ================================================================ Étapes qui avancent seules */
  const tabs = [...document.querySelectorAll('#steps [role="tab"]')];
  if (tabs.length) {
    const img = document.getElementById('step-img');
    const cap = document.getElementById('step-cap');
    const DWELL = 5200;
    let index = 0, bar = null, paused = false, inView = false;

    const select = (i, focus = false) => {
      index = (i + tabs.length) % tabs.length;
      const tab = tabs[index];
      tabs.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
      if (focus) tab.focus();
      cap.textContent = tab.dataset.cap;
      if (img.getAttribute('src') !== tab.dataset.shot) {
        img.classList.add('out');
        const next = new Image();
        next.onload = () => { img.src = tab.dataset.shot; img.alt = `Écran « ${tab.dataset.cap} » de KYA-SolDesign`; requestAnimationFrame(() => img.classList.remove('out')); };
        next.src = tab.dataset.shot;
      }
      run();
    };
    const run = () => {
      bar?.cancel();
      tabs.forEach((t) => { t.querySelector('.bar').style.transform = 'scaleX(0)'; });
      if (reduced || paused || !inView) return;
      bar = tabs[index].querySelector('.bar').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: DWELL, easing: 'linear', fill: 'forwards' });
      bar.onfinish = () => select(index + 1);
    };
    tabs.forEach((tab, i) => {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener('click', () => { paused = true; select(i); });
      tab.addEventListener('keydown', (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (step === undefined) return;
        event.preventDefault(); paused = true; select(index + step, true);
      });
    });
    const box = document.getElementById('steps');
    box.addEventListener('pointerenter', () => { paused = true; bar?.pause(); });
    box.addEventListener('pointerleave', () => { paused = false; run(); });
    new IntersectionObserver((entries) => { inView = entries.some((e) => e.isIntersecting); if (inView) run(); else bar?.pause(); }, { threshold: 0.35 }).observe(box);
  }

  /* ================================================================ Tarifs (page logiciel) */
  const OFFERS = {
    commercial: {
      title: 'Commerciale', durations: [{ id: '1m', label: 'Mois', price: 25000 }, { id: '3m', label: 'Trimestre', price: 65000 }, { id: '12m', label: 'Année', price: 220000, preferred: true }],
      stack: [['Étude complète, du site au rapport', true], ['Optimisation technico-économique', true], ['Rapport Word et PDF, schéma, proforma', true], ['Prix de vente et marges', true], ['Émission et révisions du dossier', true], ['Bibliothèque de matériel extensible', true], ['Projets illimités, sans filigrane', true]],
      note: 'Un poste · 7 jours de grâce après l’échéance',
    },
    academic: {
      title: 'Académique', durations: [{ id: '12m', label: 'Année', price: 90000, preferred: true }],
      stack: [['Étude complète, du site au rapport', true], ['Optimisation technico-économique', true], ['Rapport Word et PDF, schéma', true], ['Émission et révisions du dossier', true], ['Bibliothèque de matériel extensible', true], ['Prix de vente et proforma', false], ['Documents marqués « Usage académique »', true]],
      note: 'Un poste · 3 jours de grâce après l’échéance',
    },
    student: {
      title: 'Étudiant', durations: [{ id: '1d', label: 'Jour', price: 1500 }, { id: '1m', label: 'Mois', price: 7500, preferred: true }],
      stack: [['Étude complète, du site au rapport PDF', true], ['Cinq projets', true], ['Documents marqués « Usage étudiant »', true], ['Optimisation technico-économique', false], ['Export Word', false], ['Prix de vente et proforma', false]],
      note: 'Un poste · sans délai de grâce',
    },
  };
  const durations = document.getElementById('durations');
  if (durations) {
    const price = document.getElementById('price');
    const title = document.getElementById('order-title');
    const stack = document.getElementById('stack');
    const note = document.getElementById('price-note');
    const buy = document.getElementById('buy');
    const per = document.getElementById('price-per');
    const legend = durations.querySelector('legend').outerHTML;
    const format = (v) => new Intl.NumberFormat('fr-FR').format(v);
    const cols = [...document.querySelectorAll('#matrix thead [data-col]')];

    const show = (offer, id) => {
      const d = offer.durations.find((x) => x.id === id) ?? offer.durations[0];
      price.textContent = format(d.price);
      const months = { '1m': 1, '3m': 3, '12m': 12 }[d.id];
      per.textContent = months && months > 1 ? `soit ${format(Math.round(d.price / months / 100) * 100)} FCFA par mois` : '';
      buy.textContent = `Acheter : ${offer.title}, ${d.label.toLowerCase()}`;
      if (!reduced) price.animate([{ opacity: 0.2, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    };
    const render = (edition) => {
      const offer = OFFERS[edition];
      title.textContent = `Licence ${offer.title}`;
      note.textContent = offer.note;
      const pref = offer.durations.find((x) => x.preferred) ?? offer.durations[0];
      durations.innerHTML = legend + offer.durations.map((x) => `<label><input type="radio" name="duration" value="${x.id}"${x.id === pref.id ? ' checked' : ''}><span>${x.label}</span></label>`).join('');
      stack.innerHTML = offer.stack.map(([label, on]) => `<li class="${on ? '' : 'off'}"><svg aria-hidden="true"><use href="#i-${on ? 'check' : 'minus'}"/></svg><span>${label}${on ? '' : '<span class="visually-hidden"> (non inclus)</span>'}</span></li>`).join('');
      show(offer, pref.id);
      durations.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => show(offer, input.value)));
      cols.forEach((th) => {
        const i = [...th.parentElement.children].indexOf(th);
        document.querySelectorAll('#matrix tr').forEach((row) => row.children[i]?.classList.toggle('on', th.dataset.col === edition));
      });
    };
    document.querySelectorAll('input[name="edition"]').forEach((input) => input.addEventListener('change', () => render(input.value)));
    const asked = new URLSearchParams(location.search).get('edition');
    const start = OFFERS[asked] ? asked : 'commercial';
    const input = document.querySelector(`input[name="edition"][value="${start}"]`);
    if (input) input.checked = true;
    render(start);
  }
})();

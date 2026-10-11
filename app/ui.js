// Kleine UI-bouwstenen voor de app: elementen maken, sprites uit de bronbladen, de melding met "ongedaan maken",
// bottom sheets (met focusval en Escape), een eigen bevestigvraag (geen alert/confirm/prompt) en het feestje.
(function (wortel) {
  'use strict';
  const ASSETS = '../assets/';
  const MAN = () => wortel.PQ_MANIFEST;
  const rustig = () => !!(wortel.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // el('button.knop.goud', { onclick, 'aria-label': ... }, 'tekst', kind, ...)
  function el(spec, attrs, ...kids) {
    const [tag, ...cls] = String(spec).split('.');
    const e = document.createElement(tag || 'div');
    if (cls.length) e.className = cls.join(' ');
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e[k] = v;
      else if (k === 'tekst') e.textContent = v;
      else if (k === 'stijl') for (const [p, w] of Object.entries(v)) { if (p.startsWith('--')) e.style.setProperty(p, w); else e.style[p] = w; }
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid instanceof Node ? kid : String(kid));
    return e;
  }
  const getal = n => Math.round(n).toLocaleString('nl-NL');
  const naam = p => ({ hidde: 'Hidde', tessie: 'Tessie', samen: 'Samen' }[p] || 'Prikbord');

  // Sprite uit assets/bron op een vaste schaal: artpx schermpx per artpixel. Anker middenonder, pixelscherp.
  function sprite(id, artpx, label) {
    const a = MAN().assets.find(x => x.id === id);
    if (!a) return el('span');
    const s = artpx / a.bronpx_per_artpixel, [w, h] = a.afmetingen.bron, [fw, fh] = a.figuur.bron, [ax, ay] = a.anker.bron;
    // Alleen het figuurvak tonen (geen lege canvasrand): bijsnijden met een venster.
    const vak = el('span.sprite-vak', { role: 'img', 'aria-label': label || a.naam,
      stijl: { width: Math.round(fw * s) + 'px', height: Math.round(fh * s) + 'px' } });
    const img = el('img', { src: ASSETS + a.bestanden.bron, alt: '', draggable: false,
      stijl: { width: Math.round(w * s) + 'px', height: Math.round(h * s) + 'px', left: Math.round((fw / 2 - ax) * s) + 'px', top: Math.round((fh - ay) * s) + 'px' } });
    vak.append(img);
    return vak;
  }
  const item = (naam, px) => el('img.itemicoon', { src: ASSETS + 'items/bron/' + naam + '.png', alt: '', stijl: { width: (px || 20) + 'px' } });
  const munt = px => item('munt', px || 18);
  // Een ei in pixelstijl (alleen CSS): er is (nog) geen ei-art; dit is geen pet of character.
  const ei = (px, label) => el('span.ei', { role: 'img', 'aria-label': label || 'Ei', stijl: { '--ei': (px || 40) + 'px' } }, el('span.ei-binnen'));

  // ---------- melding onderin, met optioneel "ongedaan maken" (10 s) ----------
  let meldTimer = null;
  function meld(tekst, opties) {
    opties = opties || {};
    const box = document.getElementById('melding');
    if (!box) return;
    box.replaceChildren(el('span', { tekst }));
    if (opties.ongedaan) {
      box.append(el('button.knop.mini', { type: 'button', onclick: () => { box.hidden = true; opties.ongedaan(); } }, 'Ongedaan maken'));
    }
    box.className = 'melding' + (opties.soort ? ' ' + opties.soort : '');
    // Tik op de melding (niet op de knop) = weg; met een sheet open staat hij bovenin over de kop van de sheet.
    box.onclick = e => { if (!e.target.closest('button')) { box.hidden = true; clearTimeout(meldTimer); } };
    box.hidden = false;
    clearTimeout(meldTimer);
    meldTimer = setTimeout(() => { box.hidden = true; }, opties.duur || (opties.ongedaan ? 10000 : 3500));
  }
  const fout = tekst => meld(tekst, { soort: 'fout', duur: 5000 });

  // ---------- bottom sheet ----------
  const open = [];
  function sheet(opties) {
    const vorige = document.activeElement;
    const titelId = 'sheet-' + Math.random().toString(36).slice(2, 8);
    const sluitKnop = el('button.knop.mini.sluit', { type: 'button', 'aria-label': 'Sluiten', onclick: () => sluit() }, '×');
    const kop = el('div.sheet-kop', null, el('h2', { id: titelId, tekst: opties.titel || '' }), sluitKnop);
    const binnen = el('div.sheet-binnen', null, opties.inhoud);
    const paneel = el('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titelId }, el('div.sheet-greep'), kop, binnen);
    if (opties.knoppen) paneel.append(el('div.sheet-voet', null, opties.knoppen));
    const achter = el('div.sheet-achter', { onclick: e => { if (e.target === achter) sluit(); } }, paneel);
    document.body.append(achter);
    requestAnimationFrame(() => achter.classList.add('open'));
    const val = e => {
      if (e.key === 'Escape') { e.preventDefault(); sluit(); return; }
      if (e.key !== 'Tab') return;
      const f = [...paneel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    paneel.addEventListener('keydown', val);
    const h = { paneel, binnen, sluit, gesloten: false };
    function sluit() {
      if (h.gesloten) return;
      h.gesloten = true;
      achter.classList.remove('open');
      setTimeout(() => achter.remove(), rustig() ? 0 : 220);
      open.splice(open.indexOf(h), 1);
      if (opties.opSluit) opties.opSluit();
      if (vorige && vorige.focus) vorige.focus({ preventScroll: true });
    }
    open.push(h);
    setTimeout(() => { const f = paneel.querySelector(opties.focus || 'input, select, .sheet-voet button, button'); if (f) f.focus({ preventScroll: true }); }, 30);
    return h;
  }
  const sluitAlles = () => open.slice().forEach(h => h.sluit());
  // Bevestigen in een eigen sheet. Geeft een Promise<boolean>.
  function vraag(titel, tekst, ja, nee, gevaar) {
    return new Promise(klaar => {
      let antwoord = false;
      const s = sheet({ titel, inhoud: el('p', { tekst }), opSluit: () => klaar(antwoord), focus: '.sheet-voet .knop:last-child',
        knoppen: [el('button.knop', { type: 'button', onclick: () => s.sluit() }, nee || 'Annuleer'),
          el('button.knop' + (gevaar ? '.gevaar' : '.goud'), { type: 'button', onclick: () => { antwoord = true; s.sluit(); } }, ja || 'Ja')] });
    });
  }

  // ---------- feestje: sterretjes rond een punt (schermcoördinaten) ----------
  function feestje(x, y, n) {
    const laag = el('div.feestlaag', { 'aria-hidden': 'true' });
    document.body.append(laag);
    const aantal = rustig() ? 4 : (n || 14);
    for (let i = 0; i < aantal; i++) {
      const hoek = (i / aantal) * Math.PI * 2, r = 40 + Math.random() * 50;
      laag.append(el('span.ster', { tekst: i % 3 ? '★' : '♥',
        stijl: { left: x + 'px', top: y + 'px', '--dx': Math.cos(hoek) * r + 'px', '--dy': Math.sin(hoek) * r - 20 + 'px' } }));
    }
    setTimeout(() => laag.remove(), 1200);
  }
  const feestBij = e => { const r = e.getBoundingClientRect(); feestje(r.left + r.width / 2, r.top + r.height / 2); };
  // Haptisch gevoel zonder trilmotor (werkt niet op iOS): een korte indruk-animatie.
  function tik(e) { if (!e || rustig()) return; e.classList.remove('tik'); void e.offsetWidth; e.classList.add('tik'); }
  function datumTekst(s) {
    if (!s) return '';
    const d = wortel.PQRegels.uitSleutel(s), vandaag = wortel.PQRegels.dagSleutel(Date.now());
    const morgen = wortel.PQRegels.dagSleutel(Date.now() + 864e5);
    if (s === vandaag) return 'vandaag'; if (s === morgen) return 'morgen';
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  wortel.PQUI = { el, getal, naam, sprite, item, munt, ei, meld, fout, sheet, sluitAlles, vraag, feestje, feestBij, tik, rustig, datumTekst, ASSETS };
})(window);

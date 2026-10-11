// Preview van de Pixel Quest-assetset. Leest window.PQ_MANIFEST (assets/manifest.js).
(function () {
  const M = window.PQ_MANIFEST;
  const ASSETS = '../assets/';
  const perId = Object.fromEntries(M.assets.map(a => [a.id, a]));

  const $ = sel => document.querySelector(sel);
  const instelling = {
    versie: $('#versie'),
    achtergrond: $('#achtergrond'),
    zoom: $('#zoom'),
    toonCanvas: $('#toonCanvas'),
  };

  // Schermpixels per artpixel -> weergaveschaal voor elk bestand, zodat bron,
  // native en referentie even groot op het scherm staan.
  // Met 'eigenPixel' vervalt de figuurschaal: dan houdt elk blad zijn eigen
  // pixelgrootte en worden de figuren van het extra blad groter.
  function schaal(asset, versie, artpx, eigenPixel = false) {
    if (versie === 'native') return artpx;
    const bpa = eigenPixel ? asset.bronpx_per_artpixel / asset.figuurschaal : asset.bronpx_per_artpixel;
    return artpx / bpa;
  }

  function doek(asset, versie, artpx, toon) {
    const [w, h] = asset.afmetingen[versie];
    const [ax, ay] = asset.anker[versie];
    const s = schaal(asset, versie, artpx);
    const el = document.createElement('div');
    el.className = 'doek' + (toon ? ' toon' : '');
    el.style.width = `${w * s}px`;
    el.style.height = `${h * s}px`;
    const img = new Image();
    img.src = ASSETS + asset.bestanden[versie];
    img.alt = asset.naam;
    const anker = document.createElement('span');
    anker.className = 'anker';
    anker.style.left = `${ax * s}px`;
    anker.style.top = `${ay * s}px`;
    el.append(img, anker);
    return el;
  }

  function referentie(asset, artpx) {
    const img = new Image();
    img.alt = `${asset.naam} - referentie`;
    img.onload = () => {
      const s = artpx / asset.bronpx_per_artpixel;
      img.style.width = `${img.naturalWidth * s}px`;
      img.style.height = `${img.naturalHeight * s}px`;
    };
    img.src = ASSETS + asset.bestanden.referentie;
    return img;
  }

  function kaart(asset) {
    const versie = instelling.versie.value;
    const artpx = Number(instelling.zoom.value);
    const k = document.createElement('article');
    k.className = 'kaart';
    k.innerHTML = `<h3>${asset.naam}</h3>`;

    const rij = document.createElement('div');
    rij.className = 'vergelijk';
    const fRef = document.createElement('figure');
    fRef.append(referentie(asset, artpx));
    fRef.insertAdjacentHTML('beforeend', '<figcaption>Referentie (blad)</figcaption>');
    const fAsset = document.createElement('figure');
    const vak = document.createElement('div');
    vak.className = 'bg-' + instelling.achtergrond.value;
    vak.append(doek(asset, versie, artpx, instelling.toonCanvas.checked));
    fAsset.append(vak);
    fAsset.insertAdjacentHTML('beforeend',
      `<figcaption>${versie === 'bron' ? 'Bronuitsnede' : 'Native'} (transparant)</figcaption>`);
    rij.append(fRef, fAsset);
    k.append(rij);

    const [w, h] = asset.afmetingen[versie];
    const [fw, fh] = asset.figuur[versie];
    const [ax, ay] = asset.anker[versie];
    k.insertAdjacentHTML('beforeend', `
      <dl class="meta">
        <dt>Bestand</dt><dd>assets/${asset.bestanden[versie]}</dd>
        <dt>Canvas</dt><dd>${w} × ${h}</dd>
        <dt>Figuur</dt><dd>${fw} × ${fh}</dd>
        <dt>Anker</dt><dd>(${ax}, ${ay})</dd>
        <dt>Herkomst</dt><dd>${asset.herkomst}, ${asset.referentie.blad}</dd>
        <dt>Raster</dt><dd>${asset.raster_gemeten} bronpx/artpixel${asset.figuurschaal !== 1 ? ` × figuurschaal ${asset.figuurschaal}` : ''}</dd>
      </dl>`);
    return k;
  }

  function tekenControle() {
    const versie = instelling.versie.value;
    $('#toelichting').textContent = M.uitleg[versie] + ' ' + M.uitleg.anker;
    for (const [id, cat] of [['#rasterCharacters', 'character'], ['#rasterPets', 'pet']]) {
      const r = $(id);
      r.replaceChildren(...M.assets.filter(a => a.categorie === cat).map(kaart));
    }
  }

  // Sprite in de app-mock: altijd de exacte bronuitsnede, op dezelfde artpixel-schaal.
  function vulSprite(el, versie = 'bron') {
    const asset = perId[el.dataset.id];
    const artpx = Number(el.dataset.px || 2);
    const s = schaal(asset, versie, artpx, $('#eigenPixel').checked);
    const [w, h] = asset.afmetingen[versie];
    el.style.width = `${w * s}px`;
    el.style.height = `${h * s}px`;
    el.style.setProperty('--voet', `${(asset.anker[versie][1] / h) * 100}%`);
    const img = new Image();
    img.src = ASSETS + asset.bestanden[versie];
    img.alt = asset.naam;
    el.replaceChildren(img);
  }

  function tekenApp() {
    const coll = $('#collectie');
    coll.replaceChildren(...M.assets.filter(a => a.categorie === 'pet').map(a => {
      const vak = document.createElement('div');
      vak.className = 'vak';
      const s = document.createElement('div');
      s.className = 'sprite';
      s.dataset.id = a.id;
      s.dataset.px = '1';
      vak.append(s);
      vak.insertAdjacentHTML('beforeend', `<span>${a.naam}</span>`);
      return vak;
    }));
    document.querySelectorAll('#app .sprite').forEach(el => vulSprite(el));
  }

  document.querySelectorAll('.tabs button').forEach(knop => {
    knop.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(b =>
        b.setAttribute('aria-selected', String(b === knop)));
      document.querySelectorAll('.paneel').forEach(p => { p.hidden = p.id !== knop.dataset.tab; });
      try { localStorage.setItem('pq-tab', knop.dataset.tab); } catch (e) { /* geen opslag */ }
    });
  });

  Object.values(instelling).forEach(el => el.addEventListener('change', tekenControle));
  $('#eigenPixel').addEventListener('change', tekenApp);
  tekenControle();
  tekenApp();

  let tab = location.hash.slice(1) || null;
  if (!tab) try { tab = localStorage.getItem('pq-tab'); } catch (e) { /* geen opslag */ }
  if (tab) document.querySelector(`.tabs button[data-tab="${tab}"]`)?.click();
  window.scrollTo(0, 0);  // hash (#app) zou anders naar de sectie springen
})();

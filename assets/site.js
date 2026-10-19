/* Fit&Aesthetic landing: language switch (RU/EN), cards built from site-data.js, modal windows,
   WhatsApp booking links, sliders, menu. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EN = window.I18N_EN, MSG = window.FA_MESSAGES;
  let lang = document.documentElement.lang === 'en' ? 'en' : 'ru';

  /* ---------- WhatsApp ---------- */
  const strip = html => html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const waUrl = text => `https://wa.me/${window.FA_WHATSAPP}?text=${encodeURIComponent(text)}`;
  window.faWa = waUrl;                       // used by the treatment map block
  window.faLang = () => lang;
  const msg = (kind, extra = '') => MSG[kind][lang] + extra;
  const waAttrs = (kind, extra) => `href="${waUrl(msg(kind, extra))}" target="_blank" rel="noopener"`;

  /* ---------- static texts: Russian is in the markup, English in I18N_EN ---------- */
  const RU = {};
  $$('[data-i18n]').forEach(el => { RU[el.dataset.i18n] ??= el.innerHTML; });
  $$('[data-i18n-label]').forEach(el => { RU[el.dataset.i18nLabel] ??= el.getAttribute('aria-label'); });
  $$('[data-i18n-alt]').forEach(el => { RU[el.dataset.i18nAlt] ??= el.getAttribute('alt'); });
  RU['meta.title'] = document.title;
  RU['meta.desc'] = $('meta[name="description"]').content;
  // texts of elements that are built by this script
  RU['alt.story'] ??= 'Сторис пациента с отметкой клиники';
  RU['alt.storyVideo'] ??= 'Видео-сторис пациента с отметкой клиники';
  RU['alt.result'] ??= 'Фото до и после процедуры';
  RU['ui.sound'] ??= 'Звук';
  const t = key => (lang === 'en' ? EN[key] : RU[key]) ?? RU[key] ?? EN[key] ?? '';
  const UI = {
    more: { ru: 'Детальнее', en: 'Details' },
    book: { ru: 'Записаться', en: 'Book' },
    explore: { ru: 'Смотреть направления', en: 'Explore Our Treatments' },
  };
  const ui = k => UI[k][lang];

  /* ---------- offers: content/offers.json, edited in the admin panel (/admin) ---------- */
  let offers = [];
  const escHtml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lines = s => escHtml(s).trim().replace(/\r?\n/g, '<br>');   // line breaks typed in the admin → <br>
  // a card without a photo or a title is a draft and is not shown; no offers at all → the whole carousel is hidden
  const useOffers = items => {
    offers = (items || []).filter(o => o.show !== false && o.img && (o.title_ru || o.title_en)).slice(0, 25);
    renderOffers();
    $('#fill .offers').hidden = !offers.length;
    requestAnimationFrame(() => { placeFill(); paintFill(); });
    const sl = $('#offersTrack').closest('.slider'); if (sl && sl.update) sl.update();
  };
  // the copy built into the page shows at once (and works when the page is opened as a file)
  try { useOffers(JSON.parse($('#offersData').textContent).items); } catch (e) {}

  /* ---------- content saved in the admin panel (/admin) replaces the built-in copy ---------- */
  // an empty English version (no text filled in) falls back to the Russian one, and the other way round
  const both = (o, filled = Boolean) => {
    const ru = o && filled(o.ru) ? o.ru : null, en = o && filled(o.en) ? o.en : null;
    return ru || en ? { ru: ru || en, en: en || ru } : null;
  };
  const bioFilled = b => b && (b.badge || (b.text && b.text.length) || (b.areas && b.areas.length) || (b.after && b.after.length) || (b.tech && b.tech.length));
  const pageFilled = p => p && (p.lead || p.text || (p.list && p.list.length) || (p.procedures && p.procedures.length));
  function useContent(c) {
    if (Array.isArray(c.offers)) useOffers(c.offers);
    if (Array.isArray(c.team)) {
      window.FA_TEAM = c.team.filter(d => !d.hidden && d.img && (both(d.name) || both(d.role))).map(d => {
        const name = both(d.name), role = both(d.role) || name;
        return { ...d, name: name && both(d.role) ? name : null, role, bio: both(d.bio, bioFilled) };
      });
      renderTeam();
    }
    if (Array.isArray(c.directions)) {
      window.FA_DIRECTIONS = c.directions.filter(d => !d.hidden && d.name && d.layers && d.layers.length)
        .map(d => ({ shade: '0%,100%', ...d, page: both(d.page, pageFilled) }));
      renderDirections();
    }
    renderModal();
    $$('.slider').forEach(s => s.update && s.update());
  }
  if (location.protocol !== 'file:') {
    fetch('api/content', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(c => { if (c) useContent(c); })
      .catch(e => console.error('content', e));
  }
  function renderOffers() {
    $('#offersTrack').innerHTML = offers.map(o => {
      const src = escHtml(o.img);
      const img = o.crop ? `<img class="abs" src="${src}" alt="" style="${escHtml(o.crop)}">`
                         : `<img class="fit" src="${src}" alt=""${o.pos ? ` style="object-position:${escHtml(o.pos)}"` : ''}>`;
      const title = lines(o['title_' + lang] || o.title_ru);
      const gift = lines(o['gift_' + lang] || o.gift_ru);
      const price = o.price
        ? `<p class="price">${gift ? `<span class="gift">${gift}</span>` : ''}${o.old ? `<s>${escHtml(o.old)}</s>` : ''}<b>${escHtml(o.price)}</b></p>`
        : `<p class="gift-only">${gift}</p>`;
      return `<article class="offer">
        <div class="layers">${img}<div class="shade"></div></div>
        ${o.tag ? `<span class="tag"><img src="assets/icon-fire.svg" width="16" height="16" alt="">${escHtml(o.tag)}</span>` : ''}
        <div class="offer-foot"><h3>${title}</h3>
          <div class="offer-row">${price}<a class="btn btn-light sm" ${waAttrs('offer', strip(title) + (o.price ? ` (${o.price})` : ''))}>${ui('more')}</a></div>
        </div></article>`;
    }).join('');
  }

  /* ---------- specialists ---------- */
  function renderTeam() {
    $('#teamTrack').innerHTML = window.FA_TEAM.map(d => {
      const [a, b] = (d.shade || '55.56%,86%').split(',');
      const img = d.crop ? `<img class="abs" src="${d.img}" alt="" loading="lazy" style="${d.crop}">`
                         : `<img class="fit" src="${d.img}" alt="" loading="lazy"${d.pos ? ` style="object-position:${d.pos}"` : ''}>`;
      const who = d.name ? d.name[lang] : d.role[lang];
      const action = `<button class="more" type="button" data-doctor="${d.id}" aria-haspopup="dialog">${ui('more')}</button>`;
      return `<article class="doc">
        <div class="layers">${img}<div class="shade" style="background:linear-gradient(180deg,rgba(0,0,0,0) ${a},rgba(0,0,0,.4) ${b})"></div></div>
        <div class="doc-txt"><b>${who}</b>${d.name ? `<span>${d.role[lang]}</span>` : ''}</div>${action}</article>`;
    }).join('');
  }

  /* ---------- directions ---------- */
  const BASE = `<img class="abs" src="assets/img/specialist-placeholder.webp" alt="" loading="lazy" style="left:-102.75%;top:-40.15%;width:226.31%;height:226.31%">`;
  function renderDirections() {
    $('#dirsGrid').innerHTML = window.FA_DIRECTIONS.map(d => {
      // one photo per card, cropped with object-fit so it never leaves gaps at any card size
      const layers = `<img class="fit" src="${d.layers[d.layers.length - 1][0]}" alt="" loading="lazy" style="object-position:50% ${d.cardY || d.bannerY || '40%'}">`;
      const [a, b] = d.shade.split(',');
      const action = `<button class="btn btn-light" type="button" data-direction="${d.id}" aria-haspopup="dialog">${ui('more')}</button>`;
      return `<article class="dir">
        <div class="dir-media"><div class="layers">${layers}
          <div class="shade" style="background:linear-gradient(${d.angle || 180}deg,rgba(0,0,0,0) ${a},rgba(0,0,0,.4) ${b})"></div></div></div>
        <div class="dir-foot"><h3>${d.name}</h3>${action}</div></article>`;
    }).join('');
  }

  /* ---------- Instagram stories (built once: language only changes labels) ---------- */
  function renderStories() {
    $('#storiesTrack').innerHTML = window.FA_STORIES.map(s => s.type === 'video'
      ? `<div class="story"><video class="story-v" src="${s.src}" poster="${s.poster}" muted loop playsinline preload="none" data-i18n-label="alt.storyVideo" aria-label=""></video>
           <span class="play-ico" aria-hidden="true"></span>
           ${s.sound ? `<button class="sound" type="button" aria-pressed="false" data-i18n-label="ui.sound" aria-label=""></button>` : ''}</div>`
      : `<div class="story"><img src="${s.src}" data-i18n-alt="alt.story" alt="" loading="lazy"></div>`).join('');
  }

  /* ---------- before / after: procedure switch + caption on each photo ---------- */
  let resultFilter = 'all';
  function renderResults() {
    const items = window.FA_RESULTS, tags = window.FA_RESULT_TAGS || [];
    const caption = r => r.title ? r.title[lang] : (lang === 'en' ? 'Treatment<br>name' : 'Название<br>процедуры');
    $('#resultsTrack').innerHTML = items.map(r => `<article class="result" data-tag="${r.tag || ''}" style="aspect-ratio:${r.w}/${r.h}"${resultFilter !== 'all' && r.tag !== resultFilter ? ' hidden' : ''}>
      <img src="${r.src}" width="${r.w}" height="${r.h}" alt="${t('alt.result')}" loading="lazy"><h3>${caption(r)}</h3></article>`).join('');
    const box = $('#filters');
    box.hidden = !tags.length;
    box.innerHTML = [['all', lang === 'en' ? 'All' : 'Все'], ...tags.map(x => [x.id, x[lang]])].map(([v, l]) =>
      `<button class="chip-f" type="button" data-filter="${v}" aria-pressed="${v === resultFilter}">${l}</button>`).join('');
  }

  /* ---------- intro text that fills while scrolling ---------- */
  const fill = $('#fill'), fillPin = fill && fill.firstElementChild;
  let words = [];
  function splitFill() {
    if (!fill) return;
    const gray = $('.lead .gray', fill); if (!gray) return;
    gray.innerHTML = gray.textContent.trim().split(/\s+/).map(w => `<span class="w">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
    gray.classList.remove('gray');
    words = $$('.w', fill);
    paintFill();
  }
  function placeFill() {   // centre the pinned block; if it is taller than the window, do not pin it
    if (!fill) return;
    const free = innerHeight - fillPin.offsetHeight;
    fill.classList.toggle('no-pin', free < 0);
    fill.style.setProperty('--pin-top', Math.max(0, free / 2) + 'px');
  }
  function paintFill() {
    if (!words.length) return;
    let p;
    if (fill.classList.contains('no-pin')) {
      const r = $('.lead', fill).getBoundingClientRect();
      p = (innerHeight * 0.85 - r.top) / (innerHeight * 0.6);
    } else {
      const top = parseFloat(getComputedStyle(fillPin).top) || 0;
      const travel = fill.offsetHeight - fillPin.offsetHeight;
      p = (top - fill.getBoundingClientRect().top) / Math.max(1, travel * 0.85);
    }
    p = Math.max(0, Math.min(1, p));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  addEventListener('scroll', () => requestAnimationFrame(() => { paintFill(); paintFillTexts(); paintSplit(); }), { passive: true });

  /* consultation blocks: --p moves the photo from full width to its half, --t brings in the text */
  const splits = $$('.consult.split');
  function paintSplit() {
    const animate = innerWidth > 900 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    splits.forEach(sec => {
      let p = 1;
      if (animate) {
        const pin = sec.firstElementChild, travel = sec.offsetHeight - pin.offsetHeight;
        p = Math.max(0, Math.min(1, -sec.getBoundingClientRect().top / Math.max(1, travel * 0.8)));
      }
      sec.style.setProperty('--p', p.toFixed(3));
      sec.style.setProperty('--t', Math.max(0, Math.min(1, (p - 0.45) / 0.55)).toFixed(3));
    });
  }
  addEventListener('resize', paintSplit);
  paintSplit();

  /* headings marked data-fill: grey words turn dark as the heading moves up the screen */
  let fillTexts = [];
  function splitFillTexts() {
    fillTexts = $$('[data-fill]').map(el => {
      [el].forEach(g => {   // every word starts grey and darkens as the heading scrolls up
        const walk = document.createTreeWalker(g, NodeFilter.SHOW_TEXT), nodes = [];
        while (walk.nextNode()) nodes.push(walk.currentNode);
        nodes.forEach(n => {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.append(w); }
          });
          n.replaceWith(frag);
        });
        $$('.gray', g).forEach(x => x.classList.remove('gray'));
      });
      return { el, words: $$('.w', el) };
    });
    paintFillTexts();
  }
  function paintFillTexts() {
    fillTexts.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * 0.85 - r.top) / (innerHeight * 0.45)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  }
  addEventListener('resize', () => { placeFill(); paintFill(); });
  if (fillPin) new ResizeObserver(() => { placeFill(); paintFill(); }).observe(fillPin);

  /* ---------- devices carousel (looped) ---------- */
  const DEV = window.FA_DEVICES || [];
  let devIndex = 0;
  function renderDeviceInfo() {
    const d = DEV[devIndex]; if (!d) return;
    $('#devName').textContent = d.name;
    const feats = d.feats ? d.feats[lang] : [];
    $('#devFeats').innerHTML = feats.map((f, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${f}</span></li>`).join('');
    $('#devFeats').hidden = !feats.length;
  }
  function setDevice(i, animate = true) {
    const n = DEV.length; if (!n) return;
    devIndex = ((i % n) + n) % n;
    $$('#devItems .dev').forEach((el, k) => {
      let rel = ((k - devIndex) % n + n) % n;
      if (rel > n / 2) rel -= n;
      el.dataset.pos = Math.abs(rel) <= 2 ? rel : 'x';
      el.tabIndex = rel === 0 ? 0 : -1;
      el.setAttribute('aria-hidden', String(Math.abs(rel) > 1));
    });
    const bar = $('#devBar');
    bar.style.width = (100 / n) + '%';
    bar.style.transform = `translateX(${devIndex * 100}%)`;
    const info = $('.tech-info');
    if (!animate) { renderDeviceInfo(); return; }
    info.classList.add('fading');
    setTimeout(() => { renderDeviceInfo(); info.classList.remove('fading'); }, 220);
  }
  function initDevices() {
    const stage = $('#techStage'); if (!stage || !DEV.length) return;
    $('#devItems').innerHTML = DEV.map((d, k) => `<button class="dev" type="button" data-k="${k}" aria-label="${d.name}"><img src="${d.img}" alt="" loading="lazy"></button>`).join('');
    setDevice(0, false);
    addArrows(stage.querySelector('.bar'), d => setDevice(devIndex + d));
    let x0 = null, moved = false;
    stage.addEventListener('pointerdown', e => { x0 = e.clientX; moved = false; });
    stage.addEventListener('pointermove', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) moved = true; });
    const end = e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { setDevice(devIndex + (dx < 0 ? 1 : -1)); return; }
      const item = e.target.closest('.dev');
      if (!moved && item && item.dataset.pos !== '0') setDevice(+item.dataset.k);
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', () => { x0 = null; });
    stage.addEventListener('dragstart', e => e.preventDefault());
    let wheelLock = 0;
    stage.addEventListener('wheel', e => {   // trackpad swipe sideways
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      if (performance.now() < wheelLock) return;
      wheelLock = performance.now() + 550;
      setDevice(devIndex + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    stage.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { setDevice(devIndex + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { setDevice(devIndex - 1); e.preventDefault(); }
    });
  }
  initDevices();

  /* ---------- FAQ ---------- */
  function renderFaq() {
    const open = $$('#faqList details').findIndex(d => d.open);
    $('#faqList').innerHTML = window.FA_FAQ.map((f, i) => {
      const [q, a] = f[lang];
      return `<details${i === open ? ' open' : ''}><summary><span>${q.replace(/&/g, '&amp;')}</span><img src="assets/icon-plus.svg" width="15" height="15" alt=""></summary>
        <p>${a.replace(/&(?!amp;)/g, '&amp;')}</p>${f.explore ? `<a class="link-dot faq-explore" href="#directions">${ui('explore')}</a>` : ''}</details>`;
    }).join('');
    $$('#faqList details').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$('#faqList details[open]').forEach(o => { if (o !== d) o.open = false; });
    }));
  }

  /* ---------- modal ---------- */
  const modal = $('#modal'), modalBody = $('#modalBody');
  let modalState = null, lastFocus = null;
  const esc = s => s.replace(/&(?![a-z]+;)/g, '&amp;');
  const NEED = '<p class="need">❗️ НУЖНА ИНФОРМАЦИЯ</p>';   // placeholder where the client has not sent texts yet
  function doctorHtml(d) {
    const who = d.name ? d.name[lang] : d.role[lang];
    const book = `<a class="btn btn-dark m-cta" ${waAttrs('doctor', strip(who))}>${t('cta.consult')}</a>`;
    const finalLine = b => `<p class="m-final">${(b && b.cta) || (lang === 'en' ? 'Book a consultation<br>with a DHA-licensed specialist' : 'Запишитесь на консультацию<br>к DHA-лицензированному специалисту')}</p>`;
    const photo = `<div class="m-photo"><img src="${d.img}" alt="${strip(who)}"></div>`;
    if (!d.bio) {   // no description yet: photo, name/role, a red placeholder and booking
      return `<div class="m-grid m-short">${photo}<div class="m-body">
        <div class="m-head"><h2 class="m-title" id="modalTitle">${who}</h2>${d.name ? `<p class="m-role">${d.role[lang]}</p>` : ''}</div>
        ${NEED}
        ${finalLine()}${book}</div></div>`;
    }
    const b = d.bio[lang];
    const lics = (d.licenses || []).map((src, i) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${(lang === 'en' ? 'License ' : 'Лицензия ') + (i + 1)}" loading="lazy"></a>`).join('');
    return `<div class="m-grid">${photo}<div class="m-body">
      <div class="m-sec">
        <div class="m-head"><h2 class="m-title" id="modalTitle">${who}</h2><p class="m-role">${b.kicker || d.role[lang]}</p>${b.badge ? `<p class="m-exp">${b.badge}</p>` : ''}</div>
        <div class="m-texts">${(b.text || []).map(p => `<p class="m-p">${p}</p>`).join('')}</div>
      </div>
      ${b.areas && b.areas.length ? `<div class="m-sec">${b.areasTitle ? `<h3 class="m-h">${b.areasTitle}</h3>` : ''}
        <ul class="m-list one">${b.areas.map(([h, s]) => `<li><b>${esc(h)}</b><span>${s}</span></li>`).join('')}</ul></div>` : ''}
      ${(b.after && b.after.length) || lics ? `<div class="m-sec">${b.afterTitle ? `<h3 class="m-h">${b.afterTitle}</h3>` : ''}
        ${(b.after || []).map(p => `<p class="m-p">${p}</p>`).join('')}${lics ? `<div class="m-lics">${lics}</div>` : ''}</div>` : ''}
      ${b.tech && b.tech.length ? `<div class="m-sec">${b.techTitle ? `<h3 class="m-h">${b.techTitle}</h3>` : ''}<div class="m-tags">${b.tech.map(x => `<span>${x}</span>`).join('')}</div></div>` : ''}
      ${finalLine(b)}${book}
    </div></div>`;
  }
  function directionHtml(d) {   // same layout as the specialists: photo at the side (on top on mobile), text next to it
    const name = strip(d.name);
    const photo = `<div class="m-photo"><img src="${d.layers[d.layers.length - 1][0]}" alt="" style="object-position:50% ${d.bannerY || '40%'}"></div>`;
    const book = `<a class="btn btn-dark m-cta" ${waAttrs('direction', name)}>${t('cta.consult')}</a>`;
    const head = `<div class="m-head"><h2 class="m-title" id="modalTitle">${name}</h2></div>`;
    if (!d.page) {
      return `<div class="m-grid m-short">${photo}<div class="m-body">${head}${NEED}<p class="m-final">${lang === 'en' ? 'Book a consultation<br>with a DHA-licensed specialist' : 'Запишитесь на консультацию<br>к DHA-лицензированному специалисту'}</p>${book}</div></div>`;
    }
    const p = d.page[lang], procs = p.procedures || [], list = p.list || [];
    return `<div class="m-grid">${photo}<div class="m-body">${head}
      <div class="m-texts">${p.lead ? `<p class="m-p"><b>${p.lead}</b></p>` : ''}${p.text ? `<p class="m-p">${p.text}</p>` : ''}</div>
      ${list.length ? `<div class="m-sec">${p.listTitle ? `<h3 class="m-h">${p.listTitle}</h3>` : ''}
        <ul class="m-list one">${list.map(([h, s], i) => `<li><b>${String(i + 1).padStart(2, '0')}. ${esc(h)}</b><span>${s}</span></li>`).join('')}</ul></div>` : ''}
      ${procs.length ? `<div class="m-sec"><h3 class="m-h">${lang === 'en' ? 'Treatments' : 'Процедуры'}</h3><p class="m-p">${procs.join(' · ')}</p></div>` : ''}
      <p class="m-final">${p.cta || (lang === 'en' ? 'Book a consultation<br>with a DHA-licensed specialist' : 'Запишитесь на консультацию<br>к DHA-лицензированному специалисту')}</p>${book}
    </div></div>`;
  }
  function renderModal() {
    if (!modalState) return;
    const [kind, id] = modalState;
    modalBody.innerHTML = kind === 'doctor' ? doctorHtml(window.FA_TEAM.find(x => x.id === id)) : directionHtml(window.FA_DIRECTIONS.find(x => x.id === id));
    modal.setAttribute('aria-labelledby', 'modalTitle');
  }
  function openModal(kind, id) {
    lastFocus = document.activeElement;
    modalState = [kind, id];
    renderModal();
    modalBody.scrollTop = 0;
    modal.classList.remove('closing');
    modal.showModal();
    document.body.classList.add('locked');
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('shown')));   // slide up
  }
  function closeModal() {
    if (!modal.open || modal.classList.contains('closing')) return;
    modal.classList.add('closing'); modal.classList.remove('shown');
    const done = () => { modal.close(); modal.classList.remove('closing'); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 450);
  }
  modal.addEventListener('cancel', e => { e.preventDefault(); closeModal(); });   // Esc
  modal.addEventListener('close', () => { document.body.classList.remove('locked'); modalState = null; lastFocus?.focus?.(); });
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('#modalX').addEventListener('click', closeModal);
  // the whole card works like its button: offers, specialists, treatments
  document.addEventListener('click', e => {
    const card = e.target.closest('.offer, .doc, .dir');
    if (!card || e.target.closest('a, button')) return;
    card.querySelector('a.btn, button.btn, .more')?.click();
  });
  /* ---------- licenses: a click opens the picture at full screen height ---------- */
  document.head.insertAdjacentHTML('beforeend', `<style>
    .offers[hidden] { display: none; }
    .m-lics a { width: 96px; height: 96px; }
    .lightbox { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 16px; border: 0; background: transparent; place-items: center; cursor: zoom-out; }
    .lightbox[open] { display: grid; }
    .lightbox::backdrop { background: rgba(0,0,0,.86); }
    .lightbox img { display: block; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); width: auto; height: auto; object-fit: contain; background: #fff; }
    .lightbox-x { position: fixed; top: 12px; right: 12px; width: 41px; height: 41px; border: 0; border-radius: 50%; background: #fff; cursor: pointer; }
    .lightbox-x::before, .lightbox-x::after { content: ""; position: absolute; left: 10px; top: 20px; width: 21px; height: 1.5px; background: #000; transform: rotate(45deg); }
    .lightbox-x::after { transform: rotate(-45deg); }
  </style>`);
  const lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<img alt=""><button class="lightbox-x" type="button" aria-label="Закрыть"></button>';
  document.body.append(lightbox);
  lightbox.addEventListener('click', () => lightbox.close());
  document.addEventListener('click', e => {
    const lic = e.target.closest('.m-lics a'); if (!lic) return;
    e.preventDefault();
    const img = lic.querySelector('img');
    lightbox.querySelector('img').src = lic.href;
    lightbox.querySelector('img').alt = img ? img.alt : '';
    lightbox.querySelector('.lightbox-x').setAttribute('aria-label', lang === 'en' ? 'Close' : 'Закрыть');
    lightbox.showModal();
  });

  document.addEventListener('click', e => {
    const doc = e.target.closest('[data-doctor]'), dir = e.target.closest('[data-direction]');
    if (doc) openModal('doctor', doc.dataset.doctor);
    else if (dir) openModal('direction', dir.dataset.direction);
  });

  /* ---------- language ---------- */
  function applyLang(next, save) {
    lang = next === 'en' ? 'en' : 'ru';
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    $('meta[name="description"]').content = t('meta.desc');
    const og = (k, v) => { const m = $(`meta[property="${k}"]`); if (m) m.content = v; };
    og('og:title', t('meta.title')); og('og:description', t('meta.desc')); og('og:locale', lang === 'en' ? 'en_US' : 'ru_RU');
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    $$('[data-i18n-alt]').forEach(el => el.setAttribute('alt', t(el.dataset.i18nAlt)));
    $$('[data-wa]').forEach(el => { el.href = waUrl(msg(el.dataset.wa)); });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    renderOffers(); renderTeam(); renderDirections(); renderResults(); renderFaq(); renderModal();
    renderDeviceInfo();
    splitFill(); splitFillTexts();
    $$('.slider').forEach(s => s.update && s.update());
    if (save) {
      try { localStorage.setItem('fa-lang', lang); } catch (e) {}
      const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    }
    document.dispatchEvent(new CustomEvent('fa:lang', { detail: lang }));
    document.documentElement.classList.remove('i18n-pending');
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang, true)));

  /* ---------- sliders: drag with the mouse, progress bar follows the scroll ---------- */
  function ARROW(d) { return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${d > 0 ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function addArrows(bar, onStep) {   // small prev/next buttons to the right of a progress bar
    const foot = document.createElement('div'); foot.className = 'slider-foot';
    bar.replaceWith(foot); foot.append(bar);
    const box = document.createElement('div'); box.className = 'arrows';
    box.innerHTML = `<button type="button" class="arrow" data-d="-1" aria-label="${lang === 'en' ? 'Previous' : 'Назад'}">${ARROW(-1)}</button><button type="button" class="arrow" data-d="1" aria-label="${lang === 'en' ? 'Next' : 'Вперёд'}">${ARROW(1)}</button>`;
    foot.append(box);
    box.addEventListener('click', e => { const b = e.target.closest('.arrow'); if (b) onStep(+b.dataset.d); });
    return box;
  }
  function initSlider(sl) {
    const track = sl.querySelector('.track'), thumb = sl.querySelector('.bar i');
    const arrows = addArrows(sl.querySelector('.bar'), d => {
      const card = [...track.children].find(c => !c.hidden);
      const step = card ? card.getBoundingClientRect().width + 12 : track.clientWidth * 0.8;
      track.scrollBy({ left: d * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    const update = () => {
      const max = track.scrollWidth, vis = track.clientWidth;
      const w = Math.max(0.08, Math.min(1, vis / max));
      thumb.style.width = (w * 100) + '%';
      thumb.style.transform = `translateX(${max > vis ? (track.scrollLeft / (max - vis)) * (1 / w - 1) * 100 : 0}%)`;
      const [prev, next] = arrows.children;
      prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max - vis - 2;
      arrows.hidden = max <= vis + 2;
    };
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    sl.update = update;
    let down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startL = track.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = startL - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('dragging');
        track.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
      }
    });
    track.addEventListener('dragstart', e => e.preventDefault());
  }

  /* ---------- menu: panel from the right, the page shifts left ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  document.body.append(menu);                                   // out of the header so the shift does not move it
  const veil = document.createElement('div'); veil.className = 'menu-veil'; document.body.append(veil);
  $$('body > header, body > main, body > footer').forEach(el => el.classList.add('page-shift'));
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'true');
  let menuOpen = false;
  const setMenu = open => {
    menuOpen = open;
    menu.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-hidden', String(!open)); menuBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => $('#menuClose').focus(), 300);
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  $('#menuClose').addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
  veil.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
  $$('a', menu).forEach((a, i) => a.style.transitionDelay = `${0.12 + i * 0.035}s, ${0.12 + i * 0.035}s, ${0.12 + i * 0.035}s`);

  /* ---------- before/after filter ---------- */
  const resultsTrack = $('#resultsTrack');
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('.chip-f'); if (!b) return;
    resultFilter = b.dataset.filter;
    $$('#filters .chip-f').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    $$('.result', resultsTrack).forEach(r => { r.hidden = resultFilter !== 'all' && r.dataset.tag !== resultFilter; });
    resultsTrack.scrollLeft = 0;
    resultsTrack.closest('.slider').update();
  });

  /* ---------- videos: autoplay muted while visible; the sound button unmutes one video at a time ---------- */
  renderStories();
  const heroVideo = $('#heroVideo');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allVideos = () => [heroVideo, ...$$('.story-v')].filter(Boolean);
  const buttonFor = v => v === heroVideo ? $('#heroSound') : v.parentElement.querySelector('.sound');
  function setSound(v, on) {
    v.muted = !on;
    const b = buttonFor(v); if (b) b.setAttribute('aria-pressed', String(on));
    if (on) {
      allVideos().forEach(o => { if (o !== v && !o.muted) setSound(o, false); });
      v.play().catch(() => {});
    }
  }
  $$('.story-v').forEach(v => {
    const ico = v.parentElement.querySelector('.play-ico');
    v.addEventListener('playing', () => { ico.hidden = true; });
    v.addEventListener('pause', () => { ico.hidden = false; });
    v.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.sound'); if (!b) return;
    const v = b.id === 'heroSound' ? heroVideo : b.parentElement.querySelector('video');
    setSound(v, v.muted);
  });
  const seen = new IntersectionObserver(entries => entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting && !(reduce && v !== heroVideo && v.muted)) { v.preload = 'auto'; v.play().catch(() => {}); }
    else { v.pause(); if (!v.muted) setSound(v, false); }
  }), { threshold: 0.5 });
  allVideos().forEach(v => seen.observe(v));

  /* ---------- gallery: slots change one after another every 2 s ---------- */
  (function gallery() {
    const box = $('.steps-pics'), pool = window.FA_GALLERY || [];
    if (!box || pool.length < 4) return;
    const imgs = $$('img', box);
    const slots = imgs.map(img => { const d = document.createElement('div'); d.className = 'slot'; img.replaceWith(d); d.append(img); return d; });
    let next = slots.length, turn = 0, timer = null;
    const shown = () => slots.map(s => s.lastElementChild.getAttribute('src'));
    pool.slice(slots.length).forEach(src => { const i = new Image(); i.src = src; });   // preload
    function step() {
      const slot = slots[turn % slots.length]; turn++;
      let src, guard = 0;
      do { src = pool[next++ % pool.length]; } while (shown().includes(src) && ++guard < pool.length);
      const old = slot.lastElementChild, img = document.createElement('img');
      img.src = src; img.alt = old.alt; img.className = 'out';
      slot.append(img);
      requestAnimationFrame(() => requestAnimationFrame(() => { img.classList.remove('out'); img.classList.add('in-now'); }));
      setTimeout(() => old.remove(), 1100);
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting && !reduce) timer = setInterval(step, 2000);
    }).observe(box);
  })();

  /* ---------- start ---------- */
  applyLang(lang, false);
  $$('.slider').forEach(initSlider);

  /* ---------- numbers count up one after another (quick, eased) ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const nums = $$('#about .stat b');
    const countUp = (el, delay) => {
      const m = el.textContent.trim().match(/^(\D*?)(\d[\d\s,\u00a0]*\d|\d)(.*)$/);
      if (!m) return;
      const [, pre, raw, post] = m, sep = (raw.match(/[\s,\u00a0]/) || [''])[0], target = +raw.replace(/\D/g, '');
      const fmt = v => pre + (sep ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(v)) + post;
      const dur = 900, start = performance.now() + delay;
      let written = el.textContent = fmt(0);
      const tick = now => {
        if (el.textContent !== written) return;   // the language was switched: keep the new text
        const t = Math.max(0, Math.min(1, (now - start) / dur)), e = 1 - Math.pow(1 - t, 3);
        written = el.textContent = fmt(t < 1 ? Math.round(target * e) : target);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    let order = 0;
    const seenNum = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      seenNum.unobserve(e.target);
      countUp(e.target, 150 + (order++ % 2) * 120);
    }), { threshold: 0.6 });
    nums.forEach(n => seenNum.observe(n));
  }

  /* ---------- blocks appear out of a blur while scrolling ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const targets = [
      ...$$('.hero-meta, .hero-copy, .hero-bottom > .btn'),
      ...$$('main > section.sec:not(#about) > *:not(.fill), #fill .lead, #fill .offers'),
      ...$$('#about > .h2, #about .stat, #about .about-photo, #about .about-side'),
      ...$$('.consult-wide .consult-in, .footer-in > *'),
    ];
    const show = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); show.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => {
      const i = [...el.parentElement.children].filter(c => targets.includes(c)).indexOf(el);
      el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
      el.classList.add('reveal');
      show.observe(el);
    });
  }
})();

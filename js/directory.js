/* Stay Santa Rosa directory: search, category tabs, group chips, open-now.
   Reads window.SSR_DIRECTORY (js/directory-data.js). State lives in the URL
   (?cat=dining&group=Latin&q=taco&open=1) so any filtered view is shareable. */
(function () {
  'use strict';
  var DATA = window.SSR_DIRECTORY || [];
  var CATS = [
    { key: 'all', label: 'All' },
    { key: 'dining', label: 'Restaurants' },
    { key: 'wine', label: 'Wineries & Breweries' },
    { key: 'hotels', label: 'Hotels' },
    { key: 'attractions', label: 'Attractions' }
  ];
  var CAT_LABEL = { dining: 'Restaurant', wine: 'Wine & Beer', hotels: 'Hotel', attractions: 'Attraction' };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var root = document.getElementById('directory');
  if (!root) return;
  var el = {
    tabs: root.querySelector('[data-dir-tabs]'),
    search: root.querySelector('[data-dir-search]'),
    groups: root.querySelector('[data-dir-groups]'),
    open: root.querySelector('[data-dir-open]'),
    openWrap: root.querySelector('[data-dir-open-wrap]'),
    count: root.querySelector('[data-dir-count]'),
    list: root.querySelector('[data-dir-list]'),
    empty: root.querySelector('[data-dir-empty]'),
    reset: root.querySelector('[data-dir-reset]')
  };

  var params = new URLSearchParams(location.search);
  var state = {
    cat: CATS.some(function (c) { return c.key === params.get('cat'); }) ? params.get('cat') : 'all',
    group: params.get('group') || '',
    q: params.get('q') || '',
    open: params.get('open') === '1'
  };

  /* ── helpers ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');
  }
  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function mapsLink(p) {
    if (p.maps) return p.maps;
    if (!p.address) return '';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', ' + p.address);
  }
  function telHref(phone) { return 'tel:' + String(phone).replace(/[^0-9+]/g, ''); }

  // "11:00 AM – 2:30 PM, 5:00 – 9:00 PM" → [[660,870],[1020,1260]] minutes
  function toMin(t, fallbackMer) {
    var m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(t);
    if (!m) return null;
    var h = parseInt(m[1], 10) % 12, min = parseInt(m[2] || '0', 10);
    var mer = (m[3] || fallbackMer || '').toUpperCase();
    if (mer === 'PM') h += 12;
    return h * 60 + min;
  }
  function ranges(str) {
    if (!str || /closed/i.test(str)) return [];
    if (/24 hours/i.test(str)) return [[0, 1440]];
    return str.split(',').map(function (part) {
      var bits = part.split(/[–-]/);
      if (bits.length < 2) return null;
      var endMer = (/(AM|PM)/i.exec(bits[1]) || [])[1];
      var s = toMin(bits[0], endMer), e = toMin(bits[1]);
      if (s == null || e == null) return null;
      if (e <= s) e += 1440; // past midnight
      return [s, e];
    }).filter(Boolean);
  }
  function openStatus(p, now) {
    if (!p.hours) return null;
    now = now || new Date();
    var d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var today = ranges(p.hours[DAYS[d]]);
    var yest = ranges(p.hours[DAYS[(d + 6) % 7]]);
    var open = today.some(function (r) { return mins >= r[0] && mins < r[1]; }) ||
               yest.some(function (r) { return r[1] > 1440 && mins < r[1] - 1440; });
    return { open: open, today: p.hours[DAYS[d]] || '' };
  }

  /* ── filtering ───────────────────────────────────────── */
  function inCat(p) { return state.cat === 'all' || p.cat === state.cat; }
  function matches(p) {
    if (!inCat(p)) return false;
    if (state.group && p.group !== state.group) return false;
    if (state.open) { var s = openStatus(p); if (!s || !s.open) return false; }
    if (state.q) {
      var hay = fold([p.name, p.type, p.group, p.area, p.desc, p.address, (p.tags || []).join(' ')].join(' '));
      var words = fold(state.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) === -1) return false;
    }
    return true;
  }
  function sortItems(a, b) {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    if (state.cat === 'all' && a.cat !== b.cat) {
      var order = ['dining', 'wine', 'hotels', 'attractions'];
      return order.indexOf(a.cat) - order.indexOf(b.cat);
    }
    return a.name.localeCompare(b.name);
  }

  /* ── rendering ───────────────────────────────────────── */
  function renderTabs() {
    el.tabs.innerHTML = CATS.map(function (c) {
      var n = c.key === 'all' ? DATA.length : DATA.filter(function (p) { return p.cat === c.key; }).length;
      var on = c.key === state.cat;
      return '<button type="button" role="tab" class="dir-tab' + (on ? ' is-active' : '') + '" aria-selected="' + on +
        '" data-cat="' + c.key + '">' + esc(c.label) + ' <span class="dir-tab-count">' + n + '</span></button>';
    }).join('');
  }
  function renderGroups() {
    if (state.cat === 'all') { el.groups.innerHTML = ''; el.groups.hidden = true; return; }
    var seen = {};
    DATA.forEach(function (p) { if (p.cat === state.cat && p.group) seen[p.group] = (seen[p.group] || 0) + 1; });
    var names = Object.keys(seen).sort();
    el.groups.hidden = names.length < 2;
    el.groups.innerHTML = ['<button type="button" class="filter-btn' + (!state.group ? ' active' : '') + '" data-group="">All</button>']
      .concat(names.map(function (g) {
        return '<button type="button" class="filter-btn' + (state.group === g ? ' active' : '') + '" data-group="' + esc(g) + '">' + esc(g) + '</button>';
      })).join('');
  }
  function card(p) {
    var st = openStatus(p);
    var eyebrow = [state.cat === 'all' ? CAT_LABEL[p.cat] : '', p.type].filter(Boolean).join(' · ');
    var where = [];
    if (p.area && p.cat === 'wine') where.push(p.area);
    else if (p.group && p.cat === 'hotels') where.push(p.group);
    if (p.walk) where.push(p.walk + ' min walk from Courthouse Square');
    else if (p.distance) where.push(p.distance);
    var price = (p.tags || []).filter(function (t) { return /^\$+$/.test(t); })[0];
    if (price) where.push(price);

    var rows = [];
    if (p.address) {
      var ml = mapsLink(p);
      rows.push('<li><span class="dir-k">Address</span>' + (ml ? '<a href="' + esc(ml) + '" target="_blank" rel="noopener">' + esc(p.address) + '</a>' : esc(p.address)) + '</li>');
    }
    if (p.phone) rows.push('<li><span class="dir-k">Phone</span><a href="' + telHref(p.phone) + '">' + esc(p.phone) + '</a></li>');
    if (st) {
      rows.push('<li><span class="dir-k">Today</span><span class="dir-hours"><span class="dir-dot ' + (st.open ? 'is-open' : 'is-closed') + '"></span>' +
        (st.open ? 'Open now' : 'Closed now') + (st.today ? ' · ' + esc(st.today) : '') + '</span></li>');
    } else if (p.hoursNote) {
      rows.push('<li><span class="dir-k">Hours</span>' + esc(p.hoursNote) + '</li>');
    }
    if (p.rating) rows.push('<li><span class="dir-k">Rating</span>' + esc(p.rating) + ' on Google' + (p.reviews ? ' · ' + esc(Number(p.reviews).toLocaleString()) + ' reviews' : '') + '</li>');

    var links = [];
    if (p.page) links.push('<a class="dir-link" href="' + esc(p.page) + '">View hotel</a>');
    if (p.website) links.push('<a class="dir-link" href="' + esc(p.website) + '" target="_blank" rel="noopener">' + esc(host(p.website) || 'Website') + ' &rarr;</a>');

    return '<article class="dir-card' + (p.featured ? ' is-featured' : '') + '" id="' + esc(p.id) + '">' +
      (p.featured ? '<span class="dir-badge">Hotel</span>' : (p.staff ? '<span class="dir-badge">Staff pick</span>' : (p.badge ? '<span class="dir-badge">' + esc(p.badge) + '</span>' : ''))) +
      '<div class="dir-eyebrow">' + esc(eyebrow) + '</div>' +
      '<h2 class="dir-name">' + esc(p.name) + '</h2>' +
      (where.length ? '<div class="dir-where">' + esc(where.join(' · ')) + '</div>' : '') +
      (p.desc ? '<p class="dir-desc">' + esc(p.desc) + '</p>' : '') +
      (rows.length ? '<ul class="dir-facts">' + rows.join('') + '</ul>' : '') +
      (links.length ? '<div class="dir-links">' + links.join('') + '</div>' : '') +
      '</article>';
  }
  function render() {
    renderTabs();
    renderGroups();
    el.openWrap.hidden = !(state.cat === 'all' || state.cat === 'dining');
    if (el.openWrap.hidden) state.open = false;
    el.open.checked = state.open;
    if (el.search.value !== state.q) el.search.value = state.q;

    var items = DATA.filter(matches).sort(sortItems);
    el.list.innerHTML = items.map(card).join('');
    el.empty.hidden = items.length > 0;
    el.count.textContent = items.length + (items.length === 1 ? ' place' : ' places') + (state.open ? ' open now' : '');
    syncUrl();
  }
  function syncUrl() {
    var p = new URLSearchParams();
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.group) p.set('group', state.group);
    if (state.q) p.set('q', state.q);
    if (state.open) p.set('open', '1');
    var view = new URLSearchParams(location.search).get('view'); if (view) p.set('view', view);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  /* ── events ──────────────────────────────────────────── */
  el.tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = b.getAttribute('data-cat'); state.group = ''; render();
  });
  el.groups.addEventListener('click', function (e) {
    var b = e.target.closest('[data-group]'); if (!b) return;
    state.group = b.getAttribute('data-group'); render();
  });
  var t;
  el.search.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { state.q = el.search.value.trim(); render(); }, 120);
  });
  el.open.addEventListener('change', function () { state.open = el.open.checked; render(); });
  el.reset.addEventListener('click', function () {
    state = { cat: 'all', group: '', q: '', open: false }; el.search.value = ''; render(); el.search.focus();
  });

  render();
  if (location.hash) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
})();

/* Stay Santa Rosa directory: map view.
   Adds a List / Map toggle to the directory. Map view shows the filtered places
   as a column list beside a map drawn in the site's own colours (MapLibre GL JS,
   BSD-3-Clause; OpenFreeMap vector tiles, free, no key; map data © OpenStreetMap
   contributors, ODbL). Clicking a place in the list or a pin
   opens its card. Reuses the directory's own filters: it watches the rendered
   card list, so tabs, search and open-now apply to the map too.
   MapLibre is only downloaded the first time someone opens the map. */
(function () {
  'use strict';
  var DATA = window.SSR_DIRECTORY || [];
  var root = document.getElementById('directory');
  if (!root) return;
  var grid = root.querySelector('[data-dir-list]');
  var meta = root.querySelector('.dir-meta');
  if (!grid || !meta) return;

  var BY_ID = {};
  DATA.forEach(function (p) { BY_ID[p.id] = p; });
  var CAT_LABEL = { dining: 'Restaurant', wine: 'Wine & Beer', hotels: 'Hotel', attractions: 'Attraction' };
  var LIB_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
  var LIB_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
  var CENTER = [-122.7141, 38.4404]; // Old Courthouse Square (lng, lat)

  /* Map style in the site palette (tokens.css): cream land, white streets,
     warm sand highways, quiet sage parks and water, small tracked labels. */
  var C = {
    land: '#F6F2EC', res: '#F2EDE6', farm: '#F1EDE3', park: '#E6E6D8', wood: '#E1E2D2',
    water: '#D6DFDD', waterline: '#C3D0CE', bld: '#ECE6DE', bldline: '#E2DAD0',
    road: '#FFFFFF', roadcase: '#E6E1DA', hwy: '#EADFD3', hwycase: '#DCCDBD', rail: '#D3CBC2',
    label: '#8A8A8A', labelDark: '#5E5E5E', town: '#1A1A1A', waterLabel: '#7E9593', halo: '#F6F2EC'
  };
  function zw(stops) { var a = ['interpolate', ['exponential', 1.4], ['zoom']]; stops.forEach(function (s) { a.push(s[0], s[1]); }); return a; }
  function cls(list) { return ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', list]]]; }
  var ROUND = { 'line-cap': 'round', 'line-join': 'round' };
  var MINOR = cls(['minor', 'service', 'street', 'residential']);
  var MAJOR = cls(['primary', 'secondary', 'tertiary']);
  var HWY = cls(['motorway', 'trunk']);
  var STYLE = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet',
      attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': C.land } },
      { id: 'res', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': C.res } },
      { id: 'farm', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['farmland', 'grass']]], paint: { 'fill-color': C.farm } },
      { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': C.wood } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': C.park } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': C.waterline, 'line-width': zw([[10, 0.6], [16, 2.2]]) } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': C.bld, 'fill-outline-color': C.bldline, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': C.rail, 'line-width': 1, 'line-dasharray': [3, 3] } },
      { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: MINOR, layout: ROUND, paint: { 'line-color': C.road, 'line-width': zw([[12, 0.5], [14, 2], [17, 9]]) } },
      { id: 'road-major-case', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: MAJOR, layout: ROUND, paint: { 'line-color': C.roadcase, 'line-width': zw([[8, 0.8], [12, 2.5], [14, 5], [17, 15]]) } },
      { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: MAJOR, layout: ROUND, paint: { 'line-color': C.road, 'line-width': zw([[8, 0.4], [12, 1.5], [14, 3.6], [17, 12]]) } },
      { id: 'hwy-case', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: HWY, layout: ROUND, paint: { 'line-color': C.hwycase, 'line-width': zw([[6, 0.8], [10, 2], [14, 7], [17, 20]]) } },
      { id: 'hwy', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: HWY, layout: ROUND, paint: { 'line-color': C.hwy, 'line-width': zw([[6, 0.5], [10, 1.3], [14, 5], [17, 16]]) } },
      { id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name', layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Italic'], 'text-size': 11 }, paint: { 'text-color': C.waterLabel, 'text-halo-color': C.halo, 'text-halo-width': 1.2 } },
      { id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14, filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'minor', 'street', 'residential']]],
        layout: { 'symbol-placement': 'line', 'text-field': ['upcase', ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': zw([[14, 8.5], [17, 10.5]]), 'text-letter-spacing': 0.16, 'text-max-angle': 30 },
        paint: { 'text-color': C.label, 'text-halo-color': C.halo, 'text-halo-width': 1.4 } },
      { id: 'place-minor', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['neighbourhood', 'suburb', 'quarter', 'hamlet', 'village']]],
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 9.5, 'text-letter-spacing': 0.24, 'text-max-width': 8 },
        paint: { 'text-color': C.labelDark, 'text-halo-color': C.halo, 'text-halo-width': 1.5 } },
      { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 13.5, filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': zw([[8, 11], [14, 14]]), 'text-letter-spacing': 0.3 },
        paint: { 'text-color': C.town, 'text-halo-color': C.halo, 'text-halo-width': 2 } }
    ]
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── view toggle ─────────────────────────────────────── */
  var toggle = document.createElement('div');
  toggle.className = 'dir-view';
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', 'Directory view');
  toggle.innerHTML =
    '<button type="button" class="dir-view-btn is-active" data-view="list" aria-pressed="true">List</button>' +
    '<button type="button" class="dir-view-btn" data-view="map" aria-pressed="false">Map</button>';
  meta.appendChild(toggle);

  var wrap = document.createElement('div');
  wrap.className = 'dir-map-wrap';
  wrap.hidden = true;
  wrap.innerHTML =
    '<div class="dir-map-list" data-map-list aria-label="Places on the map"></div>' +
    '<div class="dir-map-canvas"><div class="dir-map" data-map role="region" aria-label="Map of places"></div></div>';
  grid.parentNode.insertBefore(wrap, grid.nextSibling);
  var listEl = wrap.querySelector('[data-map-list]');
  var mapEl = wrap.querySelector('[data-map]');

  var map = null, markers = {}, openId = null, view = 'list';

  function loadLib(cb) {
    if (window.maplibregl) return cb();
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LIB_CSS;
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = LIB_JS; s.async = true;
    s.onload = cb;
    s.onerror = function () { mapEl.innerHTML = '<p class="dir-map-error">The map could not load. The list still works.</p>'; };
    document.head.appendChild(s);
  }

  function initMap() {
    map = new maplibregl.Map({
      container: mapEl, style: STYLE, center: CENTER, zoom: 14,
      scrollZoom: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      attributionControl: { compact: true }
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.on('click', function () { closeAll(); });
  }

  function setPin(id, active) {
    var m = markers[id]; if (!m) return;
    var el = m.getElement();
    el.classList.toggle('is-active', active);
    el.style.zIndex = active ? '2' : '';
  }

  /* ── current places = whatever the directory just rendered ── */
  function currentPlaces() {
    var ids = Array.prototype.map.call(grid.querySelectorAll('.dir-card[id]'), function (a) { return a.id; });
    return ids.map(function (id) { return BY_ID[id]; }).filter(Boolean);
  }

  function rowHtml(p) {
    var bits = [CAT_LABEL[p.cat], p.type].filter(Boolean);
    var sub = p.walk ? p.walk + ' min walk' : (p.area || p.distance || '');
    return '<div class="dir-map-item" data-id="' + esc(p.id) + '">' +
      '<button type="button" class="dir-map-row" aria-expanded="false">' +
        '<span class="dir-map-row-eyebrow">' + esc(bits.join(' · ')) + '</span>' +
        '<span class="dir-map-row-name">' + esc(p.name) + '</span>' +
        (sub ? '<span class="dir-map-row-sub">' + esc(sub) + (p.lat ? '' : ' · not on map') + '</span>' : (p.lat ? '' : '<span class="dir-map-row-sub">Not on map</span>')) +
      '</button>' +
      '<div class="dir-map-card" hidden></div>' +
    '</div>';
  }

  function cardHtml(p) {
    // reuse the directory's own card markup so styling and facts stay identical
    var src = document.getElementById(p.id);
    if (!src) return '';
    var c = src.cloneNode(true);
    c.removeAttribute('id');
    var badge = c.querySelector('.dir-badge'); if (badge) badge.remove();
    var name = c.querySelector('.dir-name'); if (name) name.remove();
    var eb = c.querySelector('.dir-eyebrow'); if (eb) eb.remove();
    var wh = c.querySelector('.dir-where'); if (wh) wh.remove();
    c.className = 'dir-card dir-card--inline';
    return c.outerHTML;
  }

  function renderMap() {
    if (view !== 'map') return;
    var places = currentPlaces();
    listEl.innerHTML = places.length ? places.map(rowHtml).join('') : '<p class="dir-map-empty">No places match these filters.</p>';
    if (!map) return;
    Object.keys(markers).forEach(function (id) { markers[id].remove(); });
    markers = {};
    var bounds = null;
    places.forEach(function (p) {
      if (typeof p.lat !== 'number') return;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'dir-pin dir-pin--' + p.cat;
      el.setAttribute('aria-label', p.name);
      el.innerHTML = '<span></span><em class="dir-pin-tip">' + esc(p.name) + '</em>';
      el.addEventListener('click', function (e) { e.stopPropagation(); open(p.id, 'pin'); });
      markers[p.id] = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      if (!bounds) bounds = new maplibregl.LngLatBounds([p.lng, p.lat], [p.lng, p.lat]); else bounds.extend([p.lng, p.lat]);
    });
    if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
    if (openId && BY_ID[openId] && markers[openId]) open(openId, 'restore'); else openId = null;
  }

  function closeAll() {
    Array.prototype.forEach.call(listEl.querySelectorAll('.dir-map-item.is-open'), function (it) {
      it.classList.remove('is-open');
      it.querySelector('.dir-map-card').hidden = true;
      it.querySelector('.dir-map-row').setAttribute('aria-expanded', 'false');
    });
    Object.keys(markers).forEach(function (id) { setPin(id, false); });
    openId = null;
  }

  function open(id, from) {
    var p = BY_ID[id]; if (!p) return;
    var item = listEl.querySelector('.dir-map-item[data-id="' + id + '"]');
    var wasOpen = item && item.classList.contains('is-open');
    closeAll();
    if (wasOpen && from === 'row') return;
    openId = id;
    if (item) {
      var card = item.querySelector('.dir-map-card');
      card.innerHTML = cardHtml(p);
      card.hidden = false;
      item.classList.add('is-open');
      item.querySelector('.dir-map-row').setAttribute('aria-expanded', 'true');
      if (from !== 'row') {
        listEl.scrollTo({ top: item.offsetTop - listEl.offsetTop - 8, behavior: from === 'restore' ? 'auto' : 'smooth' });
      }
    }
    var m = markers[id];
    if (m) {
      setPin(id, true);
      if (from === 'row') map.easeTo({ center: m.getLngLat(), duration: 500 });
    }
  }

  listEl.addEventListener('click', function (e) {
    var row = e.target.closest('.dir-map-row'); if (!row) return;
    open(row.parentNode.getAttribute('data-id'), 'row');
  });

  function setView(v) {
    view = v;
    Array.prototype.forEach.call(toggle.querySelectorAll('.dir-view-btn'), function (b) {
      var on = b.getAttribute('data-view') === v;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    grid.hidden = v === 'map';
    wrap.hidden = v !== 'map';
    var url = new URL(location.href);
    if (v === 'map') url.searchParams.set('view', 'map'); else url.searchParams.delete('view');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (v === 'map') {
      renderMap();
      loadLib(function () {
        if (!map) { initMap(); map.once('load', renderMap); }
        else { map.resize(); renderMap(); }
      });
    }
  }

  toggle.addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]'); if (b) setView(b.getAttribute('data-view'));
  });

  // the directory re-renders its card list on every filter change
  new MutationObserver(function () {
    if (view === 'map') {
      renderMap();
      // keep ?view=map when the directory rewrites the URL
      var url = new URL(location.href);
      if (url.searchParams.get('view') !== 'map') { url.searchParams.set('view', 'map'); history.replaceState(null, '', url.pathname + url.search + url.hash); }
    }
  }).observe(grid, { childList: true });

  if (new URLSearchParams(location.search).get('view') === 'map') setView('map');
})();

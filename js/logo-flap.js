/* Swallow logo: the wing flaps as the page scrolls.
   Progressive enhancement: the <img> logos stay in place unless the inline
   SVG builds successfully. Disabled for prefers-reduced-motion. */
(function () {
  if (!window.fetch || !window.DOMParser) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  // Coordinates are in the logo's viewBox space (-4 -4 1472 236).
  var WING = '-4,-4 240,-4 240,78 170,78 163,94 140,125 133,142 110,156 -4,125';
  var BODY = '-4,125 110,156 133,142 140,125 163,94 170,78 240,78 240,240 -4,240';
  // Hinge: the wing root runs from the shoulder (163,92) to (128,145).
  var PX = 146, PY = 118, ANGLE = 123.4;

  var wings = [];
  var phase = 0, lastY = window.scrollY, idleTimer = null, settling = false, raf = null;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function build(img, i) {
    return fetch(img.getAttribute('src')).then(function (r) {
      if (!r.ok) throw new Error('logo');
      return r.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var src = doc.documentElement;
      var groups = [];
      for (var c = src.firstElementChild; c; c = c.nextElementSibling) {
        if (c.localName === 'g') groups.push(c);
      }
      if (groups.length < 2) throw new Error('logo structure');
      var mark = groups[0], word = groups[1];

      var svg = el('svg', {
        viewBox: src.getAttribute('viewBox'),
        width: img.getAttribute('width') || '232',
        height: img.getAttribute('height') || '40',
        'class': img.getAttribute('class')
      });
      if (img.getAttribute('aria-hidden') === 'true' || img.getAttribute('alt') === '') {
        svg.setAttribute('aria-hidden', 'true');
      } else {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', img.getAttribute('alt') || 'Stay Santa Rosa');
      }
      svg.setAttribute('focusable', 'false');

      var defs = el('defs', {});
      var cw = el('clipPath', { id: 'ssr-wing-' + i, clipPathUnits: 'userSpaceOnUse' });
      cw.appendChild(el('polygon', { points: WING }));
      var cb = el('clipPath', { id: 'ssr-body-' + i, clipPathUnits: 'userSpaceOnUse' });
      cb.appendChild(el('polygon', { points: BODY }));
      defs.appendChild(cw); defs.appendChild(cb);
      svg.appendChild(defs);

      var body = el('g', { 'clip-path': 'url(#ssr-body-' + i + ')' });
      body.appendChild(document.importNode(mark, true));
      var wing = el('g', {});
      var wingClip = el('g', { 'clip-path': 'url(#ssr-wing-' + i + ')' });
      wingClip.appendChild(document.importNode(mark, true));
      wing.appendChild(wingClip);

      svg.appendChild(body);
      svg.appendChild(wing);
      svg.appendChild(document.importNode(word, true));

      img.parentNode.replaceChild(svg, img);
      wings.push(wing);
    });
  }

  // k = 1 is the logo as drawn; negative k folds the wing below the hinge.
  function render() {
    var k = 0.3 + 0.7 * Math.cos(phase);
    var t = 'translate(' + PX + ' ' + PY + ') rotate(' + (-ANGLE) + ') scale(1 ' + k.toFixed(3) +
            ') rotate(' + ANGLE + ') translate(' + (-PX) + ' ' + (-PY) + ')';
    for (var i = 0; i < wings.length; i++) wings[i].setAttribute('transform', t);
  }

  function settle() {
    // Finish the current beat and come to rest with the wing up.
    var target = Math.ceil(phase / (2 * Math.PI)) * 2 * Math.PI;
    var step = function () {
      var d = target - phase;
      if (d < 0.01) { phase = target % (2 * Math.PI); render(); settling = false; raf = null; return; }
      phase += Math.max(0.02, d * 0.12);
      if (phase > target) phase = target;
      render();
      raf = requestAnimationFrame(step);
    };
    settling = true;
    raf = requestAnimationFrame(step);
  }

  function onScroll() {
    var y = window.scrollY;
    var dy = Math.abs(y - lastY);
    lastY = y;
    if (!wings.length || !dy) return;
    if (settling && raf) { cancelAnimationFrame(raf); settling = false; }
    phase += Math.min(dy, 120) * 0.045; // about one beat per 140px scrolled
    render();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 160);
  }

  var imgs = document.querySelectorAll('nav img.nav-logo');
  var jobs = [];
  for (var i = 0; i < imgs.length; i++) jobs.push(build(imgs[i], i).catch(function () {}));
  Promise.all(jobs).then(function () {
    if (!wings.length) return;
    render();
    window.addEventListener('scroll', onScroll, { passive: true });
  });
})();

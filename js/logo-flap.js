/* Swallow logo: the wing beats down over the body and back up as the page
   scrolls. The mark's outline is warped point by point: points on the body stay
   put, and the wing bends more the farther it is from its root, so it stays
   attached and curls like a real wing. Progressive enhancement: the <img> logos
   stay in place unless the inline SVG builds. Off for prefers-reduced-motion. */
(function () {
  if (!window.fetch || !window.DOMParser || !window.requestAnimationFrame) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  // Mark outline in the logo's viewBox units (-4 -4 1472 236).
  var MARK = [["M",68.75,0.63,"C",59.49,2.61,53.41,6.93,49.98,14.06,"C",47.7,18.72,47.08,21.28,47.08,26.1,"C",47.02,34.59,50.45,43.2,57.61,52.67,"C",64.68,62.03,72.24,68.79,89.8,81.44,"C",111.04,96.72,117.4,102.5,123.3,111.75,"C",126.78,117.28,128.17,121.72,128.17,127.34,"C",128.17,140.06,119.87,149.38,102.61,156.05,"C",97.46,158.06,84.8,161.7,78.54,162.97,"C",77.86,163.12,75.08,163.74,72.36,164.32,"C",69.65,164.94,64.15,166.14,60.17,167.01,"C",56.19,167.87,52.08,168.77,51.06,169.01,"C",50.05,169.26,47.33,169.88,45.05,170.4,"C",36.74,172.26,31.74,173.52,18.04,177.19,"C",15.51,177.87,10.5,179.2,6.95,180.1,"C",0.38,181.82,-0.45,182.13,0.23,182.81,"C",0.75,183.34,5.84,182.69,12.63,181.18,"C",25.04,178.46,34.02,176.73,40.41,175.81,"C",47.58,174.79,48.41,174.69,58.16,173.8,"C",67.15,172.97,85.45,173.15,88.63,174.11,"C",90.2,174.57,90.39,175.44,89.4,177.57,"C",88.51,179.51,84.09,186.15,81.16,189.97,"C",80.39,190.96,79.49,192.17,79.15,192.6,"C",75.97,196.86,66.38,207.69,62.45,211.49,"C",55.26,218.37,49.37,222.54,42.58,225.53,"C",40.94,226.24,39.64,227.02,39.64,227.23,"C",39.64,228.47,45.23,227.26,49.61,225.1,"C",59.68,220.16,67.45,213.71,92.74,189.23,"C",116.72,165.99,119.13,163.98,137.5,151.82,"C",154.66,140.46,163.86,132.9,171.76,123.64,"C",172.78,122.44,173.7,121.42,173.8,121.32,"C",174.6,120.68,181.45,111.69,182.87,109.44,"C",183.21,108.92,183.55,108.45,183.64,108.36,"C",183.74,108.27,184.69,106.82,185.8,105.12,"C",191.85,95.64,196.05,91.91,202.75,90.02,"C",204.01,89.65,205.1,89.19,205.19,88.97,"C",205.34,88.45,202.5,87.18,199.79,86.57,"C",197.81,86.14,197.5,85.95,196.76,84.93,"C",194.54,81.69,189.63,79.65,183.98,79.65,"C",178.89,79.65,174.91,81.01,171.63,83.88,"L",170.0,85.3,"L",168.64,84.65,"C",166.76,83.73,165.68,82.06,163.58,76.81,"C",158.3,63.66,153.45,55.14,144.16,42.67,"C",132.43,26.9,118.42,14.3,105.05,7.51,"C",99.34,4.61,92.95,2.3,86.56,0.88,"C",82.46,-0.05,72.52,-0.17,68.75,0.63],["M",84.25,3.35,"C",84.83,3.5,86.1,3.81,87.03,4.03,"C",105.21,8.16,122.4,20.42,138.73,40.91,"C",148.05,52.58,155.46,65.05,160.18,77.03,"C",162.93,84.04,163.76,85.33,166.57,86.97,"C",167.28,87.37,167.9,87.77,167.9,87.83,"C",167.9,87.86,167.34,89.1,166.63,90.58,"C",165.96,92.03,164.26,96.75,162.84,101.04,"C",158.45,114.35,155.58,120.46,149.13,130.28,"C",141.72,141.51,134.56,149.01,123.14,157.47,"C",113.7,164.51,109.71,168.12,90.7,186.98,"C",81.93,195.69,74.59,202.82,74.34,202.82,"C",74.12,202.82,74.37,202.38,74.89,201.8,"C",76.87,199.73,85.39,188.86,88.48,184.45,"C",94.28,176.21,94.65,172.44,89.8,171.11,"C",85.58,169.97,70.79,170.44,54.15,172.22,"C",52.45,172.41,50.79,172.66,50.45,172.75,"C",50.11,172.87,49.95,172.84,50.08,172.69,"C",50.23,172.53,51.47,172.19,52.85,171.92,"C",56.25,171.24,60.05,170.47,61.56,170.13,"C",62.24,169.97,63.44,169.69,64.28,169.51,"C",65.08,169.32,66.31,169.05,67.05,168.86,"C",67.76,168.71,69.68,168.27,71.28,167.94,"C",77.15,166.64,82.3,165.43,84.56,164.85,"C",95.82,161.85,99.71,160.68,105.33,158.49,"C",119.93,152.78,129.13,144.32,131.97,133.95,"C",132.46,132.22,132.49,130.68,132.43,120.83,"C",132.34,105.83,132.93,101.69,137.06,88.94,"C",138.14,85.67,138.85,82.99,138.76,82.62,"C",138.64,82.25,137.77,81.5,136.66,80.89,"C",133.54,79.16,129.84,75.3,128.51,72.43,"C",127.43,70.05,127.28,68.54,128.17,68.54,"C",128.36,68.54,129.59,69.19,130.86,69.96,"C",133.17,71.35,136.85,72.71,137.83,72.49,"C",138.91,72.31,138.57,71.63,136.82,70.52,"C",130.12,66.26,126.14,63.23,123.57,60.45,"C",119.47,55.95,117.49,51.16,120.46,52.92,"C",125.15,55.7,130.64,58.01,131.63,57.64,"C",132.62,57.24,131.97,56.59,128.54,54.49,"C",119.0,48.75,111.81,41.93,109.06,36.04,"C",108.26,34.31,108.11,33.35,108.66,33.35,"C",108.85,33.35,109.93,33.88,111.04,34.55,"C",116.63,37.8,121.14,39.65,121.63,38.88,"C",122.06,38.17,122.03,38.13,118.45,35.82,"C",108.42,29.37,101.07,22.48,93.75,12.64,"C",91.78,9.95,91.56,9.77,90.73,10.04,"C",89.53,10.41,90.14,12.11,92.98,16.37,"C",95.39,19.98,100.02,25.6,103.05,28.57,"C",104.65,30.14,104.93,30.57,104.93,31.5,"C",104.93,36.25,107.46,41.04,112.77,46.31,"L",115.42,48.94,"L",115.42,50.85,"C",115.42,54.9,117.58,59.0,122.06,63.45,"L",124.53,65.92,"L",124.44,68.23,"C",124.19,73.54,127.34,78.67,133.27,82.71,"C",134.69,83.67,135.18,84.16,135.03,84.53,"C",133.48,88.57,131.57,95.03,130.98,98.14,"C",130.89,98.51,130.64,99.72,130.4,100.77,"C",130.15,101.78,129.87,103.27,129.78,104.04,"C",129.69,104.81,129.5,106.26,129.35,107.28,"C",129.19,108.3,129.04,110.09,129.01,111.26,"C",128.94,114.16,128.79,114.29,127.65,112.19,"C",122.65,102.83,114.47,95.06,95.05,81.2,"C",77.02,68.29,67.98,60.51,61.22,51.96,"C",49.98,37.8,47.27,24.43,53.5,14.06,"C",57.24,7.88,63.47,4.18,72.36,2.98,"C",73.94,2.76,83.11,3.04,84.25,3.35],["M",189.75,83.39,"C",191.88,84.1,193.83,85.7,193.83,86.69,"C",193.83,87.46,194.45,87.83,196.14,88.14,"C",198.34,88.54,198.31,88.73,195.62,90.06,"C",193.74,91.01,192.41,91.97,190.56,93.76,"C",187.47,96.72,186.82,97.56,182.25,104.5,"C",171.88,120.21,161.26,131.51,146.45,142.59,"C",142.65,145.4,138.05,148.67,137.03,149.26,"C",136.78,149.38,138.3,147.72,140.43,145.53,"C",152.5,133.12,160.28,119.72,166.02,101.69,"C",167.0,98.48,168.15,95.12,168.49,94.22,"C",171.26,87.15,174.88,83.85,181.02,82.74,"C",183.4,82.31,187.53,82.62,189.75,83.39]];
  var STROKE = 3.0868;

  // Wing root: a line from the shoulder (163,92) to where the wing meets the belly (128,145).
  var SX = 163, SY = 92, RX = 128, RY = 145;
  var L = Math.sqrt((RX - SX) * (RX - SX) + (RY - SY) * (RY - SY));
  var UX = (RX - SX) / L, UY = (RY - SY) / L; // along the root
  var NX = -UY, NY = UX;                      // across the root, toward the wing
  var PIVOT_Y = 108;                          // shoulder height the wing swings around

  function smooth(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

  // Precompute every point's weight (0 = body, 1 = wing tip).
  var W = MARK.map(function (sp) {
    var w = [];
    for (var i = 0; i < sp.length; i++) {
      if (typeof sp[i] === 'string') continue;
      var x = sp[i], y = sp[i + 1]; i++;
      var vx = x - SX, vy = y - SY;
      var along = vx * UX + vy * UY, across = vx * NX + vy * NY;
      w.push(smooth(0, 55, across) * (1 - smooth(48, 72, along)));
    }
    return w;
  });

  function pathFor(phase) {
    var out = '';
    for (var s = 0; s < MARK.length; s++) {
      var sp = MARK[s], ws = W[s], j = 0;
      for (var i = 0; i < sp.length; i++) {
        var v = sp[i];
        if (typeof v === 'string') { out += v; continue; }
        var x = v, y = sp[i + 1], w = ws[j++]; i++;
        if (w > 0) {
          // The tip trails the root a little, which gives the beat its follow-through.
          var a = (1 - Math.cos(phase - 0.7 * w)) / 2; // 0 = wing up, 1 = fully down
          var k = 1 - 2.2 * a;                          // vertical swing around the shoulder
          y = y + w * (k - 1) * (y - PIVOT_Y) + w * a * 12; // and a push down past the body
          x = x + w * w * a * 12;                       // tip reaches forward on the downstroke
          y = y + w * Math.sin(phase - 0.7 * w) * 4;   // slight bend through the stroke
        }
        out += x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
      out += 'Z';
    }
    return out;
  }

  var paths = [];
  var phase = 0, lastY = window.scrollY, idleTimer = null, raf = null;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function build(img) {
    return fetch(img.getAttribute('src')).then(function (r) {
      if (!r.ok) throw new Error('logo');
      return r.text();
    }).then(function (text) {
      var src = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      var groups = [];
      for (var c = src.firstElementChild; c; c = c.nextElementSibling) if (c.localName === 'g') groups.push(c);
      if (groups.length < 2) throw new Error('logo structure');
      var inner = groups[0].querySelector('g');
      var color = (inner && inner.getAttribute('fill')) || '#B5603F';

      var svg = el('svg', {
        viewBox: src.getAttribute('viewBox'),
        width: img.getAttribute('width') || '232',
        height: img.getAttribute('height') || '40',
        'class': img.getAttribute('class'),
        focusable: 'false',
        style: 'overflow:visible'
      });
      if (img.getAttribute('aria-hidden') === 'true' || img.getAttribute('alt') === '') {
        svg.setAttribute('aria-hidden', 'true');
      } else {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', img.getAttribute('alt') || 'Stay Santa Rosa');
      }
      var mark = el('path', {
        d: pathFor(0), fill: color, stroke: color, 'stroke-width': STROKE,
        'stroke-linejoin': 'round', 'fill-rule': 'nonzero'
      });
      svg.appendChild(mark);
      svg.appendChild(document.importNode(groups[1], true));
      img.parentNode.replaceChild(svg, img);
      paths.push(mark);
    });
  }

  function render() {
    var d = pathFor(phase);
    for (var i = 0; i < paths.length; i++) paths[i].setAttribute('d', d);
  }

  function settle() {
    // Finish the beat and come to rest with the wing up, as drawn.
    var target = Math.ceil(phase / (2 * Math.PI)) * 2 * Math.PI;
    (function step() {
      var d = target - phase;
      if (d < 0.01) { phase = 0; render(); raf = null; return; }
      phase += Math.max(0.03, d * 0.12);
      if (phase > target) phase = target;
      render();
      raf = requestAnimationFrame(step);
    })();
  }

  var pending = false;
  function onScroll() {
    var y = window.scrollY, dy = Math.abs(y - lastY);
    lastY = y;
    if (!paths.length || !dy) return;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    phase += Math.min(dy, 120) * 0.045; // about one beat per 140px scrolled
    if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; render(); }); }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 160);
  }

  var imgs = document.querySelectorAll('nav img.nav-logo');
  var jobs = [];
  for (var i = 0; i < imgs.length; i++) jobs.push(build(imgs[i]).catch(function () {}));
  Promise.all(jobs).then(function () {
    if (paths.length) window.addEventListener('scroll', onScroll, { passive: true });
  });
})();

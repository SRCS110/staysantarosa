/* Stay Santa Rosa: /deals page (promo-code copy + local offers). */
(function () {
  var CAT_LABEL = { dining: 'Dining', wine: 'Wine & Beer', attractions: 'Things to Do', shopping: 'Shopping & Wellness' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^(https?:\/\/|\/|assets\/|mailto:|tel:)/i.test(u || '') ? u : ''; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* promo-code copy buttons */
  function bindCodes(root) {
    root.querySelectorAll('.deal-code').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-code');
        var label = btn.querySelector('.deal-code-label');
        function done() {
          btn.classList.add('copied');
          if (label) label.textContent = 'Copied';
          setTimeout(function () { btn.classList.remove('copied'); if (label) label.textContent = 'Code'; }, 1800);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done, done);
        } else {
          var t = document.createElement('textarea');
          t.value = code; t.setAttribute('readonly', ''); t.style.position = 'absolute'; t.style.left = '-9999px';
          document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(t); done();
        }
      });
    });
  }

  function card(o) {
    var img = safeUrl(o.image);
    var url = safeUrl(o.url);
    var h = '<article class="lp-card local-card" data-cat="' + esc(o.category) + '">';
    h += '<div class="lp-card-img"' + (img ? ' style="background-image:url(\'' + esc(img) + '\')"' : '') + ' role="img" aria-label="' + esc(o.business) + '">';
    h += '<span class="lp-card-tag">' + esc(CAT_LABEL[o.category] || 'Local') + '</span>';
    if (o.value) h += '<span class="local-value">' + esc(o.value) + '</span>';
    h += '</div><div class="lp-card-body">';
    h += '<div class="lp-card-meta">' + esc(o.business) + '</div>';
    h += '<h3 class="lp-card-title">' + esc(o.title) + '</h3>';
    if (o.desc) h += '<p>' + esc(o.desc) + '</p>';
    if (o.terms || o.expires || o.address) {
      h += '<ul class="deal-terms">';
      if (o.address) h += '<li>' + esc(o.address) + '</li>';
      if (o.terms) h += '<li>' + esc(o.terms) + '</li>';
      if (o.expires) h += '<li>Valid through ' + esc(fmtDate(o.expires)) + '</li>';
      h += '</ul>';
    }
    if (o.code || url) {
      h += '<div class="local-card-foot">';
      if (o.code) h += '<button type="button" class="deal-code" data-code="' + esc(o.code) + '" aria-label="Copy promo code ' + esc(o.code) + '"><span class="deal-code-label">Code</span><span class="deal-code-val">' + esc(o.code) + '</span></button>';
      if (url) h += '<a class="lp-card-link" href="' + esc(url) + '"' + (/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : '') + '>Get the offer &rarr;</a>';
      h += '</div>';
    }
    return h + '</div></article>';
  }

  function initLocal() {
    var grid = document.getElementById('localOffers');
    if (!grid) return;
    var empty = document.getElementById('localEmpty');
    var filters = document.querySelector('.local-filters');
    var t = today();
    var list = (window.SSR_LOCAL_OFFERS || []).filter(function (o) {
      return o && o.title && o.business && (!o.expires || o.expires >= t) && (!o.starts || o.starts <= t);
    });
    if (!list.length) { grid.hidden = true; return; }
    if (empty) empty.hidden = true;
    grid.innerHTML = list.map(card).join('');
    bindCodes(grid);

    var cats = {};
    list.forEach(function (o) { cats[o.category] = 1; });
    if (filters && Object.keys(cats).length > 1) {
      filters.hidden = false;
      filters.querySelectorAll('.local-filter').forEach(function (b) {
        var c = b.getAttribute('data-cat');
        if (c !== 'all' && !cats[c]) b.hidden = true;
        b.addEventListener('click', function () {
          filters.querySelectorAll('.local-filter').forEach(function (x) {
            x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
          grid.querySelectorAll('.local-card').forEach(function (cardEl) {
            cardEl.hidden = !(c === 'all' || cardEl.getAttribute('data-cat') === c);
          });
        });
      });
    }
  }

  function start() { bindCodes(document); initLocal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

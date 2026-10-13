  /* HERO VIDEO AUTOPLAY (Safari desktop sometimes ignores the autoplay
     attribute alone, so force muted + play() once the DOM is ready) */
  function forcePlayHeroVideos() {
    document.querySelectorAll('.hotel-hero-bg video, .hero-video').forEach(v => {
      v.muted = true;
      v.defaultMuted = true;
      const tryPlay = () => v.play().catch(() => {});
      tryPlay();
      v.addEventListener('loadedmetadata', tryPlay);
      v.addEventListener('canplay', tryPlay);
    });
  }
  /* hero videos now start from the deferred loader at the end of this file */

  /* FAQ ACCORDION */
  function toggleFaq(questionEl) {
    const item = questionEl.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // close all in the same grid
    const grid = item.closest('.faq-grid');
    grid.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }

  /* MOBILE MENU */
  function toggleMobile() {
    var open = document.getElementById('mobileMenu').classList.toggle('open');
    var bar = document.querySelector('nav');
    if (bar) bar.classList.toggle('menu-open', open);
    var btn = document.querySelector('.nav-hamburger');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* DINING FILTER */
  function filterDining(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#restoGrid .brewery-card').forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
    });
  }

  /* ATTRACTIONS FILTER */
  function filterAttractions(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.attr-filter-group').forEach(group => {
      group.style.display = (cat === 'all' || group.dataset.category === cat) ? '' : 'none';
    });
  }

  /* WINE COUNTRY FILTER (wineries + breweries tabs) */
  function filterWineCards(scope, cat, btn) {
    const panel = document.getElementById(scope);
    if (!panel) return;
    panel.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    panel.querySelectorAll('.brewery-grid').forEach(grid => {
      let anyVisible = false;
      grid.querySelectorAll('.brewery-card').forEach(card => {
        const match = (cat === 'all' || card.dataset.category === cat);
        card.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      grid.style.display = anyVisible ? '' : 'none';
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('section-label')) {
        label.style.display = anyVisible ? '' : 'none';
      }
    });
  }

  /* SCROLL REVEAL */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  }

  /* Auto-tag repeating card/grid children so fade-up applies site-wide
     without hand-marking every element in every page. */
  function autoReveal() {
    const gridSelectors = [
      '.card-grid-2', '.card-grid-3', '.room-grid', '.brewery-grid',
      '.attr-grid', '.event-grid', '.blog-grid', '.blog-index-grid',
      '.article-related-grid', '.faq-grid'
    ];
    gridSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        Array.from(grid.children).forEach((child, i) => {
          if (!child.classList.contains('reveal')) child.classList.add('reveal');
          const delay = i % 3;
          if (delay === 1) child.classList.add('reveal-delay-1');
          if (delay === 2) child.classList.add('reveal-delay-2');
        });
      });
    });
    document.querySelectorAll('.sidebar-card').forEach(el => el.classList.add('reveal'));
    document.querySelectorAll('.section-header').forEach(el => el.classList.add('reveal'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoReveal();
    initReveal();
  });

  /* SLIDER */
  const sliderState = {};

  function initSlider(id) {
    const track = document.getElementById(id + 'Track');
    if (!track) return;
    const slides = track.querySelectorAll('.slider-slide');
    const perView = window.innerWidth <= 768 ? 1 : 3;
    const total = slides.length;
    const maxIndex = total - perView;
    if (!sliderState[id]) sliderState[id] = 0;
    // clamp
    sliderState[id] = Math.max(0, Math.min(sliderState[id], maxIndex));
    const pct = (100 / perView) * sliderState[id];
    track.style.transform = `translateX(-${pct}%)`;
    // dots
    const dotsEl = document.getElementById(id + 'Dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (let i = 0; i <= maxIndex; i++) {
        const d = document.createElement('div');
        d.className = 'slider-dot' + (i === sliderState[id] ? ' active' : '');
        d.onclick = () => { sliderState[id] = i; initSlider(id); };
        dotsEl.appendChild(d);
      }
    }
  }

  function slideMove(id, dir) {
    const track = document.getElementById(id + 'Track');
    if (!track) return;
    const perView = window.innerWidth <= 768 ? 1 : 3;
    const total = track.querySelectorAll('.slider-slide').length;
    const maxIndex = total - perView;
    sliderState[id] = Math.max(0, Math.min((sliderState[id] || 0) + dir, maxIndex));
    initSlider(id);
  }

  function initAllSliders() {
    ['sliderArtHouse', 'sliderHotelE'].forEach(id => {
      if (document.getElementById(id + 'Track')) {
        if (!sliderState[id]) sliderState[id] = 0;
        initSlider(id);
      }
    });
  }

  window.addEventListener('resize', initAllSliders);
  document.addEventListener('DOMContentLoaded', initAllSliders);

  /* WINE PAGE TABS */
  function switchWineTab(tab, btn) {
    document.querySelectorAll('.wine-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.wine-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('wineTab-' + tab).classList.add('active');
  }

  /* TRIP PILL, date-range calendar + guest picker that opens the hotel's
     booking engine in a new tab with the search prefilled via URL params.
     This does NOT read anything back from the booking engine (cross-origin,
     can't), it only builds a URL and opens it, same as clicking a normal
     link. The calendar shows dates only, no per-night pricing: there's no
     legitimate way to pull the booking engine's live rates into this page
     (same cross-origin restriction). Final price is confirmed on the
     booking engine itself after handoff. */
  const TPC_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const TPC_WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  function tpcPad(n) { return String(n).padStart(2, '0'); }
  function tpcISO(y, m, d) { return `${y}-${tpcPad(m + 1)}-${tpcPad(d)}`; }
  function tpcParseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return { y, m: m - 1, d };
  }
  function tpcFormatShort(iso) {
    const { m, d } = tpcParseISO(iso);
    return TPC_MONTH_NAMES[m].slice(0, 3) + ' ' + d;
  }
  function tpcToday() {
    const t = new Date();
    return tpcISO(t.getFullYear(), t.getMonth(), t.getDate());
  }

  function initTripPills() {
    document.querySelectorAll('.trip-pill').forEach(pill => {
      if (!pill.dataset.bookBase) return;

      const propertyField = pill.querySelector('.trip-pill-property');
      if (propertyField) {
        const propertyBtn = propertyField.querySelector('.trip-pill-property-btn');
        const propertyMenu = propertyField.querySelector('.trip-pill-property-menu');
        const propertyOptions = Array.from(propertyField.querySelectorAll('.trip-pill-property-option'));

        function openPropertyMenu() {
          propertyField.classList.add('open');
          document.addEventListener('click', propertyOutsideClick, true);
        }
        function closePropertyMenu() {
          propertyField.classList.remove('open');
          document.removeEventListener('click', propertyOutsideClick, true);
        }
        function propertyOutsideClick(e) {
          if (!propertyField.contains(e.target)) closePropertyMenu();
        }

        propertyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (propertyField.classList.contains('open')) closePropertyMenu();
          else openPropertyMenu();
        });

        propertyOptions.forEach(opt => {
          opt.addEventListener('click', () => {
            propertyOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            propertyBtn.textContent = opt.dataset.label;
            pill.dataset.bookBase = opt.dataset.base;
            closePropertyMenu();
          });
        });
      }

      const whenField = pill.querySelector('.trip-pill-when');
      const whenBtn = pill.querySelector('.trip-pill-when-btn');
      const monthsEl = pill.querySelector('.tpc-months');
      const prevBtn = pill.querySelector('.tpc-prev');
      const nextBtn = pill.querySelector('.tpc-next');
      const checkinInput = pill.querySelector('.trip-pill-checkin');
      const checkoutInput = pill.querySelector('.trip-pill-checkout');
      const errorEl = pill.querySelector('.trip-pill-error');
      const counts = { adults: 2, children: 0 };

      const today = new Date();
      const todayISO = tpcToday();

      const defStart = new Date(today); defStart.setDate(defStart.getDate() + 1);
      const defEnd = new Date(today); defEnd.setDate(defEnd.getDate() + 2);
      const range = {
        start: tpcISO(defStart.getFullYear(), defStart.getMonth(), defStart.getDate()),
        end: tpcISO(defEnd.getFullYear(), defEnd.getMonth(), defEnd.getDate())
      };

      checkinInput.value = range.start;
      checkoutInput.value = range.end;

      let viewYear = defStart.getFullYear();
      let viewMonth = defStart.getMonth();

      function updateWhenLabel() {
        whenBtn.textContent = range.start && range.end
          ? `${tpcFormatShort(range.start)} to ${tpcFormatShort(range.end)}`
          : (range.start ? `${tpcFormatShort(range.start)} to Select checkout` : 'Select dates');
      }

      function buildMonthGrid(year, month) {
        const wrap = document.createElement('div');
        wrap.className = 'tpc-month';

        const title = document.createElement('div');
        title.className = 'tpc-month-title';
        title.textContent = `${TPC_MONTH_NAMES[month]} ${year}`;
        wrap.appendChild(title);

        const weekdaysEl = document.createElement('div');
        weekdaysEl.className = 'tpc-weekdays';
        TPC_WEEKDAYS.forEach(w => {
          const d = document.createElement('div');
          d.textContent = w;
          weekdaysEl.appendChild(d);
        });
        wrap.appendChild(weekdaysEl);

        const daysEl = document.createElement('div');
        daysEl.className = 'tpc-days';
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstWeekday; i++) {
          const empty = document.createElement('button');
          empty.className = 'tpc-day tpc-day-empty';
          empty.disabled = true;
          daysEl.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const iso = tpcISO(year, month, day);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tpc-day';
          btn.textContent = String(day);

          const isPast = iso < todayISO;
          const isStart = iso === range.start;
          const isEnd = iso === range.end;
          const inRange = range.start && range.end && iso > range.start && iso < range.end;

          if (isPast) {
            btn.classList.add('tpc-day-disabled');
            btn.disabled = true;
          } else {
            if (inRange) btn.classList.add('tpc-day-in-range');
            if (isStart) btn.classList.add('tpc-day-start');
            if (isEnd) btn.classList.add('tpc-day-end');
            btn.addEventListener('click', () => handleDayClick(iso));
          }
          daysEl.appendChild(btn);
        }
        wrap.appendChild(daysEl);
        return wrap;
      }

      function render() {
        monthsEl.innerHTML = '';
        monthsEl.appendChild(buildMonthGrid(viewYear, viewMonth));
        let nextY = viewYear, nextM = viewMonth + 1;
        if (nextM > 11) { nextM = 0; nextY++; }
        monthsEl.appendChild(buildMonthGrid(nextY, nextM));

        const isAtCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
        prevBtn.disabled = isAtCurrentMonth;
        updateWhenLabel();
      }

      function handleDayClick(iso) {
        if (!range.start || (range.start && range.end)) {
          range.start = iso;
          range.end = null;
        } else if (iso <= range.start) {
          range.start = iso;
          range.end = null;
        } else {
          range.end = iso;
        }
        render();
        if (range.start && range.end) {
          checkinInput.value = range.start;
          checkoutInput.value = range.end;
          errorEl.classList.remove('show');
          closeCalendar();
        }
      }

      function openCalendar() {
        whenField.classList.add('open');
        document.addEventListener('click', outsideClickHandler, true);
      }
      function closeCalendar() {
        whenField.classList.remove('open');
        document.removeEventListener('click', outsideClickHandler, true);
      }
      function outsideClickHandler(e) {
        if (!whenField.contains(e.target)) closeCalendar();
      }

      whenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (whenField.classList.contains('open')) {
          closeCalendar();
        } else {
          openCalendar();
        }
      });

      prevBtn.addEventListener('click', () => {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        render();
      });
      nextBtn.addEventListener('click', () => {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        render();
      });

      render();

      pill.querySelectorAll('.trip-pill-stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.step;
          const dir = parseInt(btn.dataset.dir, 10);
          const min = key === 'adults' ? 1 : 0;
          const max = 8;
          counts[key] = Math.max(min, Math.min(max, counts[key] + dir));
          pill.querySelector('.trip-pill-count[data-count="' + key + '"]').textContent = counts[key];
        });
      });

      pill.querySelector('.trip-pill-submit').addEventListener('click', () => {
        errorEl.classList.remove('show');
        if (!checkinInput.value || !checkoutInput.value) {
          errorEl.textContent = 'Please choose check-in and check-out dates.';
          errorEl.classList.add('show');
          return;
        }
        const params = new URLSearchParams({
          accessible: 'false',
          adults: String(counts.adults),
          children: String(counts.children),
          endDate: checkoutInput.value,
          promo: '',
          startDate: checkinInput.value,
          oliveSrc: 'rooms'
        });
        const url = pill.dataset.bookBase + '?' + params.toString();
        window.open(url, '_blank', 'noopener');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initTripPills);

  /* HERO SLIDING GALLERY */
  function initHeroGallery() {
    const gallery = document.getElementById('heroGallery');
    if (!gallery) return;
    const slides = Array.from(gallery.querySelectorAll('.hero-slide'));
    if (slides.length < 2) return;
    const dotsWrap = document.getElementById('heroDots');
    const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.hero-dot')) : [];
    let current = slides.findIndex(s => s.classList.contains('active'));
    if (current < 0) current = 0;
    const INTERVAL = 6000;
    let timer = null;

    // Slide 1's image is already inlined in the HTML so it's ready at first
    // paint. The other 8 only carry a data-bg URL, nothing is requested
    // over the network until applyBg() sets it, which happens one slide
    // ahead of when it's shown (or immediately, if a dot is clicked out of
    // order). This keeps initial page weight to a single ~90KB image
    // instead of all 9 (~1.2MB) loading up front.
    function applyBg(el) {
      if (!el || el.dataset.loaded) return;
      const url = (window.innerWidth < 800 && el.dataset.bgSm) || el.dataset.bg;
      if (!url) return;
      el.style.backgroundImage = "url('" + url + "')";
      el.dataset.loaded = '1';
    }

    function goTo(index) {
      if (index === current) return;
      applyBg(slides[index]);
      slides[current].classList.remove('active');
      slides[index].classList.add('active');
      if (dots[current]) dots[current].classList.remove('active');
      if (dots[index]) dots[index].classList.add('active');
      current = index;
      applyBg(slides[(current + 1) % slides.length]);
    }

    function startAutoplay() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => goTo((current + 1) % slides.length), INTERVAL);
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.slide, 10);
        goTo(index);
        startAutoplay(); // manual pick resets the countdown instead of jumping mid-interval
      });
    });

    applyBg(slides[current]);
    applyBg(slides[(current + 1) % slides.length]);
    startAutoplay();
  }
  document.addEventListener('DOMContentLoaded', initHeroGallery);

  /* NAV: CLEAR AT TOP, SHADED ONCE SCROLLED */
  function initNavScroll() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    function update() {
      if (window.scrollY > 40) nav.classList.add('nav-scrolled');
      else nav.classList.remove('nav-scrolled');
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }
  document.addEventListener('DOMContentLoaded', initNavScroll);

  /* ══════════════════════════════════════════════════════════════════
     MOTION & FLOW, scroll reveals, nav behaviour, reading progress,
     back-to-top, count-up stats and image fade-in.
     All of it is additive: if this block never runs, the site still
     renders and works exactly as before.
     ══════════════════════════════════════════════════════════════════ */
  (function ssrMotion() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;
    root.classList.add('js-motion');

    function ready(fn) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
      else fn();
    }

    /* ── page entrance ── */
    ready(function () {
      requestAnimationFrame(function () { document.body.classList.add('page-ready'); });
    });
    window.addEventListener('load', function () { document.body.classList.add('page-ready'); });
    setTimeout(function () { document.body.classList.add('page-ready'); }, 900);

    /* ── reveal engine ────────────────────────────────────────────── */
    var revealObserver = null;

    function getObserver() {
      if (revealObserver) return revealObserver;
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      return revealObserver;
    }

    function markReveal(el, variant, delayIndex) {
      if (!el || el.dataset.revealed === '1') return;
      el.dataset.revealed = '1';
      el.classList.add('reveal');
      if (variant) el.classList.add('reveal-' + variant);
      if (delayIndex) el.style.setProperty('--rd', Math.min(delayIndex, 6) * 0.09 + 's');
      if (reduce) { el.classList.add('visible'); return; }
      getObserver().observe(el);
    }

    /* Elements that should reveal one by one, in groups */
    var GROUPS = [
      '.card-grid-2', '.card-grid-3', '.room-grid', '.brewery-grid', '.attr-grid',
      '.event-grid', '.blog-grid', '.blog-index-grid', '.article-related-grid',
      '.faq-grid', '.explore-strip', '.winery-grid', '.resto-grid', '.seo-cols',
      '.footer-grid', '.contact-grid', '.amenity-list', '.hub-links-inner',
      '.seo-stats', '.seo-faq', '.lp-cards'
    ];
    /* Single elements that should reveal on their own */
    var SINGLES = [
      '.section-header', '.section-title', '.section-intro', '.section-label',
      '.attr-section-head', '.sidebar-card', '.wine-callout', '.cta-banner',
      '.article-divider', '.article-pullquote', '.article-keyfacts',
      '.article-figure', '.article-cta', '.seo-block-inner', '.wine-route-banner',
      '.slider-section', '.legal-toc', '.filter-bar', '.winery-gallery-heading',
      '.seo-callout', '.list-backbar', '.lp-head', '.lp-split-media', '.lp-split-body'
    ];

    function scan(scope) {
      scope = scope || document;

      GROUPS.forEach(function (sel) {
        Array.prototype.forEach.call(scope.querySelectorAll(sel), function (grid) {
          Array.prototype.forEach.call(grid.children, function (child, i) {
            markReveal(child, null, i % 4);
          });
        });
      });

      SINGLES.forEach(function (sel) {
        Array.prototype.forEach.call(scope.querySelectorAll(sel), function (el) {
          if (el.closest('.hero') || el.closest('.dining-hero') || el.closest('.wine-hero') ||
              el.closest('.attr-hero') || el.closest('.blog-hero') || el.closest('.gp-header')) return;
          markReveal(el, sel === '.article-figure' ? 'scale' : null, 0);
        });
      });

      /* article prose reveals in a soft cascade */
      Array.prototype.forEach.call(scope.querySelectorAll('.article-body > p, .article-body > h2, .article-body > h3, .article-body > ul'), function (el, i) {
        markReveal(el, 'fade', i % 3);
      });

      /* editorial landing-page prose */
      Array.prototype.forEach.call(scope.querySelectorAll('.seo-lede-inner > h2, .seo-lede-inner > p, .seo-lede-inner > ul'), function (el, i) {
        markReveal(el, 'fade', i % 3);
      });

      /* room / hotel feature blocks */
      Array.prototype.forEach.call(scope.querySelectorAll('.hotel-body > *, .faq-item'), function (el, i) {
        markReveal(el, null, i % 3);
      });
    }

    ready(function () { scan(document); });

    /* Safety net: reveal anything that is on screen but never triggered the
       observer, e.g. elements inside a tab panel that was display:none when
       the page loaded. Runs on scroll, after clicks (tab switches) and for a
       few seconds after load. Nothing can stay invisible. */
    function sweep() {
      var vh = window.innerHeight;
      Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.visible)'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;   // still hidden by an ancestor
        if (r.top < vh * 0.97) el.classList.add('visible');
      });
    }
    ready(function () {
      var t = false;
      window.addEventListener('scroll', function () {
        if (t) return;
        t = true;
        setTimeout(function () { sweep(); t = false; }, 180);
      }, { passive: true });
      document.addEventListener('click', function () { setTimeout(sweep, 80); }, true);
      window.addEventListener('resize', function () { setTimeout(sweep, 120); });
      var n = 0, iv = setInterval(function () { sweep(); if (++n > 12) clearInterval(iv); }, 400);
    });

    /* pick up anything injected later (guide pages, filters, sliders) */
    ready(function () {
      if (!('MutationObserver' in window)) return;
      var mo = new MutationObserver(function (muts) {
        var touched = false;
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            if (n.closest && n.closest('#gpGrid')) return;   // guide cards animate via CSS
            touched = true;
          });
        });
        if (touched) scan(document);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    });

    /* ── nav: hide on scroll down, reveal on scroll up ─────────────── */
    ready(function () {
      var nav = document.querySelector('nav');
      if (!nav || reduce) return;
      var last = window.scrollY, ticking = false;
      function update() {
        var y = window.scrollY;
        var menuOpen = document.getElementById('mobileMenu') &&
                       document.getElementById('mobileMenu').classList.contains('open');
        // header stays fixed and visible at all times
        nav.classList.remove('nav-hidden');
        last = y;
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
    });

    /* ── reading progress bar on article pages ────────────────────── */
    ready(function () {
      var article = document.querySelector('.article-body');
      if (!article) return;
      var bar = document.createElement('div');
      bar.className = 'read-progress';
      document.body.appendChild(bar);
      var ticking = false;
      function update() {
        var rect = article.getBoundingClientRect();
        var total = rect.height - window.innerHeight + 220;
        var done = Math.min(1, Math.max(0, (-rect.top + 120) / Math.max(total, 1)));
        bar.style.transform = 'scaleX(' + done + ')';
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    });

    /* ── back to top ──────────────────────────────────────────────── */
    ready(function () {
      var btn = document.createElement('button');
      btn.className = 'to-top';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6,14 12,8 18,14"/></svg>';
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
      document.body.appendChild(btn);
      var ticking = false;
      function update() {
        btn.classList.toggle('show', window.scrollY > window.innerHeight * 0.9);
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    });

    /* ── count-up numbers: <span class="stat-num" data-count="30"> ── */
    ready(function () {
      var nums = document.querySelectorAll('[data-count]');
      if (!nums.length) return;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          obs.unobserve(el);
          var target = parseFloat(el.getAttribute('data-count')) || 0;
          var suffix = el.getAttribute('data-suffix') || '';
          if (reduce) { el.textContent = target + suffix; return; }
          var start = performance.now(), dur = 1400;
          (function step(now) {
            var t = Math.min(1, (now - start) / dur);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) requestAnimationFrame(step);
          })(start);
        });
      }, { threshold: 0.4 });
      Array.prototype.forEach.call(nums, function (n) { obs.observe(n); });
    });

    /* ── images fade in as they decode ────────────────────────────── */
    ready(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.article-figure img, .seo-block img'), function (img) {
        img.setAttribute('data-fade', '');
        if (img.complete) img.classList.add('loaded');
        else img.addEventListener('load', function () { img.classList.add('loaded'); });
        img.addEventListener('error', function () { img.classList.add('loaded'); });
      });
    });
  })();

/* ── PERFORMANCE: lazy background images ─────────────────────────────
   Elements carry data-bg (and data-bg-sm for a smaller file). Nothing is
   downloaded until the element is within ~400px of the viewport; small
   boxes and phones get the smaller file. The home hero slider manages
   its own data-bg and is skipped here. */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-bg]:not(.hero-slide)'));
  if (!els.length) return;
  function load(el) {
    var sm = el.getAttribute('data-bg-sm');
    var w = el.getBoundingClientRect().width * (window.devicePixelRatio || 1);
    var url = (sm && w > 0 && w <= 900) ? sm : el.getAttribute('data-bg');
    if (url) el.style.backgroundImage = "url('" + url + "')";
    el.removeAttribute('data-bg');
  }
  if (!('IntersectionObserver' in window)) { els.forEach(load); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '400px 0px' });
  els.forEach(function (el) { io.observe(el); });
})();

/* ── PERFORMANCE: hotel hero video waits for the page ────────────────
   The poster shows immediately. On larger screens with no data-saver or
   reduced-motion preference, the film starts after the page has loaded. */
(function () {
  var vids = document.querySelectorAll('video[data-deferred-autoplay]');
  if (!vids.length) return;
  var conn = navigator.connection || {};
  var skip = window.innerWidth < 800 || conn.saveData || /2g/.test(conn.effectiveType || '') ||
             (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (skip) return;
  function start() {
    Array.prototype.forEach.call(vids, function (v) {
      v.preload = 'auto'; v.muted = true; v.load();
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
  }
  function later() { (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(start, { timeout: 2500 }); }
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
})();



/* ── Home hero video: always autoplay, retry if the browser blocks it, pause control ── */
(function () {
  var v = document.getElementById('heroVideo');
  var btn = document.getElementById('heroVideoToggle');
  if (!v) return;
  var userPaused = false;
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true;
  function setState(paused) {
    if (!btn) return;
    btn.classList.toggle('is-paused', paused);
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    btn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
  }
  function tryPlay() {
    if (userPaused || !v.paused) return;
    var p = v.play();
    if (p && p.then) p.then(function () { setState(false); }).catch(function () {});
  }
  tryPlay();
  v.addEventListener('loadeddata', tryPlay);
  v.addEventListener('canplay', tryPlay);
  // Some phones (e.g. iOS Low Power Mode) block autoplay until the first touch or scroll.
  ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, tryPlay, { passive: true, once: true });
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tryPlay(); });
  v.addEventListener('pause', function () { setState(true); });
  v.addEventListener('play', function () { setState(false); });
  if (btn) btn.addEventListener('click', function () {
    if (v.paused) { userPaused = false; v.play(); } else { userPaused = true; v.pause(); }
  });
})();

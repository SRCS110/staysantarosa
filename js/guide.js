/* Guide pages: highlight the on-this-page link for the section in view. */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.gp-jump a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var current = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var a = byId[e.target.id];
      if (!a || a === current) return;
      if (current) current.classList.remove('is-active');
      a.classList.add('is-active'); current = a;
      var bar = a.parentNode;
      if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - 24, behavior: 'smooth' });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
})();

(function () {
  var DB_URL      = 'https://ab-computer-bd-53afe-default-rtdb.asia-southeast1.firebasedatabase.app';
  var COUNTS_PATH = '/atlas-views/counts';
  var FIVE_YEARS  = 5 * 365.25 * 24 * 60 * 60 * 1000;

  // Eye icon SVG rendered inline — no CSS mask needed, works on all mobile browsers
  var EYE_SVG =
    '<svg width="13" height="9" viewBox="0 0 13 9" fill="currentColor" ' +
        'aria-hidden="true" focusable="false" style="flex-shrink:0;opacity:.8">' +
      '<path d="M6.5 0C3.5 0 1 2 0 4.5 1 7 3.5 9 6.5 9S12 7 13 4.5C12 2 9.5 0 ' +
              '6.5 0zm0 7.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-4.8a1.8 1.8 0 1 0 ' +
              '0 3.6 1.8 1.8 0 0 0 0-3.6z"/>' +
    '</svg>';

  // Normalize filename → Firebase key.
  // Strip .html first (atlascomparts.com serves clean URLs without the extension),
  // then replace any remaining dots (Firebase keys cannot contain ".").
  function toKey(filename) {
    return filename.replace(/\.html$/, '').replace(/\./g, '_');
  }

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'b';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function viewLabel(n) {
    return fmt(n) + (n === 1 ? ' view' : ' views');
  }

  function setViewEl(el, count) {
    if (count > 0) {
      el.innerHTML = EYE_SVG + '<span>' + viewLabel(count) + '</span>';
    } else {
      el.innerHTML = '';
    }
  }

  // ── Increment count in Firebase for one product ────────────────────────────
  // keepalive:true on the write requests so they survive page navigation.

  function incrementCount(filename) {
    var key = toKey(filename);
    var url = DB_URL + COUNTS_PATH + '/' + key + '.json';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var expired = !data || !data.since || (Date.now() - data.since >= FIVE_YEARS);

        if (expired) {
          return fetch(url, {
            method:    'PUT',
            keepalive: true,
            headers:   { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 1, since: { '.sv': 'timestamp' } })
          });
        }

        // Atomic server-side increment — no race condition
        return fetch(url, {
          method:    'PATCH',
          keepalive: true,
          headers:   { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: { '.sv': { 'increment': 1 } } })
        });
      })
      .catch(function () {});
  }

  // ── Fetch all counts and populate every visible product card ───────────────

  function displayViewCounts() {
    var cards = document.querySelectorAll('.product-card');
    if (!cards.length) return;

    fetch(DB_URL + COUNTS_PATH + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data = data || {};
        cards.forEach(function (card) {
          var link = card.querySelector('a[href]');
          if (!link) return;
          var filename = link.getAttribute('href');
          if (!filename) return;
          var viewEl = card.querySelector('.product-card-views');
          if (!viewEl) return;

          var key   = toKey(filename);
          var entry = data[key];
          var count = (entry && entry.since && (Date.now() - entry.since < FIVE_YEARS))
                        ? entry.count : 0;
          setViewEl(viewEl, count);
        });
      })
      .catch(function () {});
  }

  // Exposed so motherboard.js / monitor.js can call after their async render
  window.initViewCounters = displayViewCounts;

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    // Strip trailing slash before parsing — mobile browsers on atlascomparts.com
    // can deliver pathnames like "/atlas-raven-h311-v1-.../" making pop() return "".
    var page = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';

    // Product detail pages — increment this product's count
    if (page.indexOf('atlas-') === 0) {
      var filename = page.endsWith('.html') ? page : page + '.html';
      incrementCount(filename);
    }

    // Any page with static product cards — display counts immediately
    if (document.querySelector('.product-card')) {
      displayViewCounts();
    }

    // Refresh counts every 60 s so they stay current without a page reload
    setInterval(function () {
      if (document.querySelector('.product-card')) {
        displayViewCounts();
      }
    }, 60000);
  });

})();

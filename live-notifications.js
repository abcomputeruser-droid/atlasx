(function () {
  var DB_URL   = 'https://ab-computer-bd-53afe-default-rtdb.asia-southeast1.firebasedatabase.app';
  var DB_PATH  = '/atlas-views/events';
  var FRESH_MS = 30000;   // show events up to 30 s old on page load

  var SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Keyed by .html filename
  var PRODUCT_NAMES = {
    'atlas-raven-h311-v1-motherboard-with-ddr4-m-2-for-intel-6th-9th-gen.html':
      'Atlas Raven H311 V1',
    'atlas-raven-b450m-frost-micro-atx-am4-motherboard-with-ryzen-1000-5600-support.html':
      'Atlas Raven B450M Frost',
    'atlas-raven-h61-v3-motherboard-with-ddr3-hdmi-m-2-nvme-slot.html':
      'Atlas Raven H61 V3',
    'atlas-raven-h81-v3-reliable-atx-motherboard-for-4th-gen-intel-cpus.html':
      'Atlas Raven H81 V3',
    'atlas-22-hd-led-monitor-1610-aspect-ratio-vga-hdmi-input.html':
      'Atlas 22" HD LED Monitor',
    'atlas-19-full-hd-led-monitor-with-hdmi-vga-ports.html':
      'Atlas 19" Full HD Monitor',
    'atlas-17-inch-square-led-monitor-hdmi-vga-anti-glare-5ms-response.html':
      'Atlas 17" Square LED Monitor',
    'atlas-ats22vfb100-22-inch-full-hd-100hz-monitor-for-editors-pros.html':
      'Atlas ATS22VFB100',
    'atlas-ats22ifw100-pro-series-21-5-ips-100hz-led-monitor-in-white-crisp-visuals.html':
      'Atlas ATS22IFW100 Pro',
    'atlas-ats22vfw100-gamers-edition-21-5-100hz-fast-response-gaming-led-monitor.html':
      'Atlas ATS22VFW100 Gamer',
    'atlas-ats24ifb100-23-8-inch-ips-fhd-100hz-monitor.html':
      'Atlas ATS24IFB100',
    'atlas-21-5-full-hd-led-monitor-1920x1080-60hz-hdmi-vga-5ms-white.html':
      'Atlas 21.5" Full HD Monitor',
    'atlas-ats22vfw100e-elite-series-21-5-100hz-full-hd-led-monitor.html':
      'Atlas ATS22VFW100E Elite'
  };

  // ── Popup DOM ──────────────────────────────────────────────────────────────

  var popup     = null;
  var hideTimer = null;

  function buildPopup() {
    var el = document.createElement('div');
    el.className = 'ln-popup';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.innerHTML =
      '<span class="ln-dot" aria-hidden="true"></span>' +
      '<div class="ln-body">' +
        '<div class="ln-top">Someone just viewed</div>' +
        '<div class="ln-product"></div>' +
        '<div class="ln-time">just now</div>' +
      '</div>' +
      '<button class="ln-close" aria-label="Dismiss">&times;</button>';
    el.querySelector('.ln-close').addEventListener('click', dismiss);
    document.body.appendChild(el);
    return el;
  }

  function show(productName) {
    if (!popup) popup = buildPopup();
    clearTimeout(hideTimer);
    popup.querySelector('.ln-product').textContent = productName;
    popup.classList.remove('ln-popup--out');
    void popup.offsetWidth;
    popup.classList.add('ln-popup--in');
    hideTimer = setTimeout(dismiss, 6000);
  }

  function dismiss() {
    if (!popup) return;
    popup.classList.remove('ln-popup--in');
    popup.classList.add('ln-popup--out');
  }

  // ── Publish a view event ───────────────────────────────────────────────────
  // keepalive:true keeps the request alive even if the browser navigates away.

  function publishView(filename) {
    var name = PRODUCT_NAMES[filename];
    if (!name) return;
    fetch(DB_URL + DB_PATH + '.json', {
      method:    'POST',
      keepalive: true,
      headers:   { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: name,
        url:     filename,
        session: SESSION_ID,
        ts:      { '.sv': 'timestamp' }
      })
    }).catch(function () {});
  }

  // ── Event deduplication ────────────────────────────────────────────────────
  // lastSeenKey prevents the same Firebase push key from showing twice.
  // We also enforce a freshness window (FRESH_MS) so that stale events
  // from the initial SSE snapshot or old polls are never shown.

  var lastSeenKey = '';
  var sseReady    = false;

  function handleNewEvent(key, data) {
    if (!data || !data.product) return;
    if (key <= lastSeenKey) return;
    lastSeenKey = key;

    // Ignore events older than FRESH_MS (30 s) — prevents showing stale
    // notifications to users who open the page long after the event fired.
    // Events with no ts are treated as fresh so they are never silently dropped.
    if (data.ts && (Date.now() - data.ts > FRESH_MS)) return;

    show(data.product);
  }

  // ── SSE — primary real-time channel ───────────────────────────────────────
  // On the initial snapshot we process ALL existing events through
  // handleNewEvent so that:
  //   • Events fired within the last 30 s are shown immediately on every
  //     screen that opens the page (cross-browser sync).
  //   • Stale events update lastSeenKey without showing a popup.

  function listenSSE() {
    if (!('EventSource' in window)) return;

    var source = new EventSource(DB_URL + DB_PATH + '.json');

    source.addEventListener('put', function (e) {
      var payload;
      try { payload = JSON.parse(e.data); } catch (err) { return; }

      if (payload.path === '/') {
        // Initial full snapshot — walk events in chronological order.
        // handleNewEvent shows fresh ones and silently advances lastSeenKey
        // past stale ones, so SSE deltas and polls never replay them.
        if (payload.data) {
          var keys = Object.keys(payload.data).sort();
          keys.forEach(function (key) {
            handleNewEvent(key, payload.data[key]);
          });
        }
        sseReady = true;
        return;
      }

      if (!sseReady) return;

      // New child pushed: path is "/-<pushKey>"
      var key = payload.path.replace(/^\//, '');
      handleNewEvent(key, payload.data);
    });

    source.addEventListener('patch', function (e) {
      if (!sseReady) return;
      var payload;
      try { payload = JSON.parse(e.data); } catch (err) { return; }
      if (!payload.data) return;
      Object.keys(payload.data).forEach(function (key) {
        handleNewEvent(key, payload.data[key]);
      });
    });

    source.onerror = function () {
      source.close();
      sseReady = false;
      setTimeout(listenSSE, 10000); // reconnect after 10 s
    };
  }

  // ── Polling — universal fallback ───────────────────────────────────────────
  // Runs immediately on load (so screens that open after an event still see it),
  // then every 8 s. Deduplication via handleNewEvent/lastSeenKey ensures
  // SSE and polling never show the same notification twice.

  function pollLatest() {
    var url = DB_URL + DB_PATH + '.json'
            + '?orderBy=%22%24key%22&limitToLast=1';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || typeof data !== 'object') return;
        var key = Object.keys(data)[0];
        if (!key) return;
        handleNewEvent(key, data[key]);
      })
      .catch(function () {});
  }

  // ── Click listener — fires publishView when a product link is clicked ──────

  function attachClickListeners() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (PRODUCT_NAMES[href]) publishView(href);
    }, true);
  }

  // ── Direct product page visit ──────────────────────────────────────────────
  // atlascomparts.com strips .html from URLs — re-attach before lookup.

  function trackDirectVisit() {
    var page     = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';
    var filename = page.endsWith('.html') ? page : page + '.html';
    if (PRODUCT_NAMES[filename]) publishView(filename);
  }

  // ── Prune events older than 48 h (once per session) ───────────────────────

  function pruneOldEntries() {
    var cutoff = Date.now() - 48 * 60 * 60 * 1000;
    var url    = DB_URL + DB_PATH + '.json'
               + '?orderBy=%22%24key%22&limitToFirst=50';

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || typeof data !== 'object') return;
        Object.keys(data).forEach(function (key) {
          var entry = data[key];
          if (entry && entry.ts && entry.ts < cutoff) {
            fetch(DB_URL + DB_PATH + '/' + key + '.json', { method: 'DELETE' })
              .catch(function () {});
          }
        });
      })
      .catch(function () {});
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    listenSSE();                        // real-time for desktop / modern mobile
    pollLatest();                       // immediate poll so fresh events show at once
    setInterval(pollLatest, 8000);      // continuous fallback — max 8 s latency
    attachClickListeners();
    trackDirectVisit();
    setTimeout(pruneOldEntries, 10000);
  });

})();

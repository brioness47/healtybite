/* =========================================================
   healtybite · medición anónima
   - session_id: aleatorio por pestaña/visita (sessionStorage)
   - visitor_id: aleatorio por dispositivo (localStorage), sin datos personales
   - UTM: se leen de la URL y se conservan durante la sesión
   - Eventos → Google Apps Script (POST text/plain, sin preflight CORS)
   ========================================================= */
(function () {
  var C = window.HB_CONFIG || {};
  var URL_ = (C.APPS_SCRIPT_URL || "").trim();
  var LOCAL_KEY = "hb_events_local";

  function store(kind) {
    try { return kind === "local" ? window.localStorage : window.sessionStorage; } catch (e) { return null; }
  }
  function get(kind, k) { try { var s = store(kind); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(kind, k, v) { try { var s = store(kind); if (s) s.setItem(k, v); } catch (e) {} }
  function rid(prefix) {
    var a = "";
    try {
      var b = new Uint8Array(8); crypto.getRandomValues(b);
      for (var i = 0; i < b.length; i++) a += ("0" + b[i].toString(16)).slice(-2);
    } catch (e) { a = Math.random().toString(16).slice(2, 18); }
    return prefix + a;
  }

  // ---- IDs anónimos
  var sid = get("session", "hb_sid");
  if (!sid) { sid = rid("s_"); set("session", "hb_sid", sid); }
  var vid = get("local", "hb_vid");
  if (!vid) { vid = rid("v_"); set("local", "hb_vid", vid); }

  // ---- Fuente de tráfico (UTM)
  var qs = new URLSearchParams(location.search);
  var utm = null;
  try { utm = JSON.parse(get("session", "hb_utm") || "null"); } catch (e) {}
  if (qs.get("utm_source") || !utm) {
    utm = {
      utm_source: (qs.get("utm_source") || "directo").toLowerCase().slice(0, 60),
      utm_medium: (qs.get("utm_medium") || "").toLowerCase().slice(0, 60),
      utm_campaign: (qs.get("utm_campaign") || "").toLowerCase().slice(0, 60)
    };
    set("session", "hb_utm", JSON.stringify(utm));
  }

  var mode = window.HB_MODE || C.MODE || "fakedoor";
  var device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : (/iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop");
  var referrer = "";
  try { referrer = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}

  // ---- Cola y envío
  var queue = [];
  var timer = null;

  function send(events, useBeacon) {
    if (!events.length) return;
    var body = JSON.stringify({ events: events });
    if (!URL_) {
      // Modo local: se guarda en este navegador para probar el dashboard
      try {
        var arr = JSON.parse(get("local", LOCAL_KEY) || "[]");
        arr = arr.concat(events).slice(-3000);
        set("local", LOCAL_KEY, JSON.stringify(arr));
      } catch (e) {}
      if (window.console) console.debug("[healtybite] eventos (modo local)", events);
      return;
    }
    try {
      if (useBeacon && navigator.sendBeacon) {
        var ok = navigator.sendBeacon(URL_, new Blob([body], { type: "text/plain;charset=UTF-8" }));
        if (ok) return;
      }
      fetch(URL_, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body
      }).catch(function () {});
    } catch (e) {}
  }

  function flush(useBeacon) {
    clearTimeout(timer); timer = null;
    var batch = queue.splice(0, queue.length);
    send(batch, useBeacon);
  }

  function track(event, props, opts) {
    var ev = {
      ts: new Date().toISOString(),
      session_id: sid,
      visitor_id: vid,
      event: event,
      page: location.pathname.replace(/index\.html$/, "") || "/",
      mode: mode,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      device: device,
      referrer: referrer
    };
    if (props) for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) ev[k] = props[k];
    queue.push(ev);
    if (opts && opts.now) flush(false);
    else if (!timer) timer = setTimeout(function () { flush(false); }, 1500);
  }

  // ---- Tiempo en página (solo tiempo visible) y scroll máximo
  var start = Date.now();
  var visibleMs = 0;
  var visibleSince = document.visibilityState === "visible" ? Date.now() : null;
  var maxScroll = 0;

  function scrollPct() {
    var h = document.documentElement;
    var total = Math.max(h.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
    if (total <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / total) * 100));
  }
  window.addEventListener("scroll", function () {
    var p = scrollPct(); if (p > maxScroll) maxScroll = p;
  }, { passive: true });

  var lastEng = 0;
  function engagement() {
    var now = Date.now();
    if (now - lastEng < 1000) return; // pagehide + visibilitychange llegan juntos
    lastEng = now;
    var ms = visibleMs + (visibleSince ? now - visibleSince : 0);
    track("page_engagement", {
      time_on_page_s: Math.round(ms / 1000),
      max_scroll_pct: Math.max(maxScroll, scrollPct())
    });
    flush(true);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (visibleSince) { visibleMs += Date.now() - visibleSince; visibleSince = null; }
      engagement();
    } else {
      visibleSince = Date.now();
    }
  });
  window.addEventListener("pagehide", function () {
    if (visibleSince) { visibleMs += Date.now() - visibleSince; visibleSince = Date.now(); }
    engagement();
  });

  window.HBTrack = { track: track, flush: flush, sessionId: sid, utm: utm, isLocal: !URL_ };
  track("page_view", { referrer: referrer });
})();

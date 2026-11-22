/* healtybite · dashboard */
(function () {
  var C = window.HB_CONFIG || {};
  var URL_ = (C.APPS_SCRIPT_URL || "").trim();
  var LOCAL = !URL_;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var pct = function (a, b) { return b ? Math.round((a / b) * 1000) / 10 + "%" : "—"; };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("es-MX"); };

  var key = new URLSearchParams(location.search).get("key") || "";
  var all = [], names = {}, meta = {};

  // Nombres de platillos desde menu.json
  fetch("menu.json").then(function (r) { return r.json(); }).then(function (m) {
    m.items.forEach(function (it) { names[it.id] = it.name; }); if (all.length) render();
  }).catch(function () {});

  $("lockForm").onsubmit = function (e) {
    e.preventDefault(); key = $("lockKey").value.trim();
    history.replaceState(null, "", "?key=" + encodeURIComponent(key)); start();
  };
  $("reload").onclick = start;
  ["fSource", "fDay", "fTest"].forEach(function (id) { $(id).onchange = render; });
  $("csv").onclick = downloadCsv;

  start();

  function start() {
    if (!key) { $("lock").hidden = false; $("app").hidden = true; return; }
    $("updated").textContent = "Cargando…";
    load().then(function (rows) {
      all = rows; $("lock").hidden = true; $("app").hidden = false;
      $("banner").hidden = !LOCAL;
      $("banner").textContent = "Modo local: APPS_SCRIPT_URL está vacío en js/config.js, así que ves solo los eventos guardados en este navegador.";
      fillFilters(); render();
      $("updated").textContent = "Actualizado " + new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }).catch(function (err) {
      $("app").hidden = true; $("lock").hidden = false;
      $("lockErr").hidden = false;
      $("lockErr").textContent = err && err.message === "unauthorized" ? "Clave incorrecta." : "No se pudieron cargar los datos: " + (err && err.message);
    });
  }

  function load() {
    if (LOCAL) {
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem("hb_events_local") || "[]"); } catch (e) {}
      arr.forEach(function (ev) { if (ev.email) ev.has_email = "si"; delete ev.email; delete ev.name; });
      return Promise.resolve(arr);
    }
    var u = URL_ + (URL_.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(key);
    return fetch(u).then(function (r) { return r.json(); }).catch(function () { return jsonp(u); }).then(function (d) {
      if (!d.ok) throw new Error(d.error || "error");
      meta = d;
      return d.rows.map(function (r) { var o = {}; d.headers.forEach(function (h, i) { o[h] = r[i]; }); return o; });
    });
  }
  function jsonp(u) {
    return new Promise(function (res, rej) {
      var cb = "hbcb" + Date.now(), s = document.createElement("script");
      window[cb] = function (d) { delete window[cb]; s.remove(); res(d); };
      s.onerror = function () { rej(new Error("red")); };
      s.src = u + "&callback=" + cb; document.body.appendChild(s);
    });
  }

  function dayOf(ev) { var d = new Date(ev.ts || ev.received_at); return isNaN(d) ? "?" : d.toLocaleDateString("en-CA"); }
  function src(ev) { return ev.utm_source || "directo"; }

  function fillFilters() {
    var sources = {}, days = {};
    all.forEach(function (ev) { sources[src(ev)] = 1; days[dayOf(ev)] = 1; });
    var sv = $("fSource").value, dv = $("fDay").value;
    $("fSource").innerHTML = '<option value="">Todas</option>' + Object.keys(sources).sort().map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    $("fDay").innerHTML = '<option value="">Todos</option>' + Object.keys(days).sort().map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    $("fSource").value = sources[sv] ? sv : ""; $("fDay").value = days[dv] ? dv : "";
  }

  function base() {
    var d = $("fDay").value, noTest = $("fTest").checked;
    return all.filter(function (ev) {
      if (noTest && /^test/.test(src(ev))) return false;
      if (d && dayOf(ev) !== d) return false;
      return true;
    });
  }

  // Agrupa por sesión
  function sessions(events) {
    var S = {};
    events.forEach(function (ev) {
      var s = S[ev.session_id] || (S[ev.session_id] = { src: src(ev), ev: {}, order: null, time: 0, scroll: 0, day: dayOf(ev) });
      s.ev[ev.event] = (s.ev[ev.event] || 0) + 1;
      if (ev.event === "submit_email" && ev.has_email) s.email = true;
      if (ev.event === "click_order" && (!s.order || ev.ts >= s.order.ts)) s.order = ev;
      if (ev.event === "page_engagement") {
        s.time = Math.max(s.time, Number(ev.time_on_page_s) || 0);
        s.scroll = Math.max(s.scroll, Number(ev.max_scroll_pct) || 0);
      }
    });
    return S;
  }
  function funnel(S) {
    var f = { visits: 0, view: 0, cart: 0, pickup: 0, order: 0, email: 0, timeSum: 0, timeN: 0, scrollSum: 0, ticketSum: 0 };
    Object.keys(S).forEach(function (k) {
      var s = S[k];
      if (!s.ev.page_view) return;
      f.visits++;
      if (s.ev.view_item) f.view++;
      if (s.ev.add_to_cart) f.cart++;
      if (s.ev.select_pickup_time) f.pickup++;
      if (s.order) { f.order++; f.ticketSum += Number(s.order.value) || 0; }
      if (s.email) f.email++;
      if (s.time) { f.timeSum += s.time; f.scrollSum += s.scroll; f.timeN++; }
    });
    return f;
  }
  function parseItems(str) {
    var out = {};
    String(str || "").split("|").forEach(function (p) { var a = p.split(":"); if (a[0]) out[a[0]] = (out[a[0]] || 0) + (Number(a[1]) || 1); });
    return out;
  }
  function itemStats(events, S) {
    var r = {};
    function g(id) { return r[id] || (r[id] = { views: 0, cart: 0, orders: 0 }); }
    events.forEach(function (ev) {
      if (ev.event === "view_item" && ev.item_id) g(ev.item_id).views++;
      if (ev.event === "add_to_cart" && ev.item_id) g(ev.item_id).cart += Number(ev.qty) || 1;
    });
    Object.keys(S).forEach(function (k) {
      if (!S[k].order) return;
      var it = parseItems(S[k].order.items);
      Object.keys(it).forEach(function (id) { g(id).orders += it[id]; });
    });
    return r;
  }

  function render() {
    var events = base();
    var fs = $("fSource").value;
    var filtered = fs ? events.filter(function (ev) { return src(ev) === fs; }) : events;
    var S = sessions(filtered), f = funnel(S);

    // KPIs
    var avgT = f.timeN ? Math.round(f.timeSum / f.timeN) : 0;
    $("kpis").innerHTML = [
      ["Visitas", f.visits, "sesiones únicas"],
      ["Clic en Ordenar", pct(f.order, f.visits), f.order + " sesiones", true],
      ["Correos", f.email, pct(f.email, f.order) + " de los que ordenaron"],
      ["Ticket promedio", f.order ? money(f.ticketSum / f.order) : "—", "en clic Ordenar"],
      ["Tiempo / scroll", avgT + " s", (f.timeN ? Math.round(f.scrollSum / f.timeN) : 0) + "% scroll prom."]
    ].map(function (k) {
      return '<div class="kpi' + (k[3] ? " kpi--main" : "") + '"><span>' + k[0] + "</span><strong>" + k[1] + "</strong><em>" + esc(k[2]) + "</em></div>";
    }).join("");

    // Embudo
    var steps = [["Visitas", f.visits], ["Vieron platillo", f.view], ["Agregaron al carrito", f.cart], ["Clic en Ordenar", f.order, true], ["Dejaron correo", f.email]];
    $("funnel").innerHTML = steps.map(function (s, i) {
      var prev = i ? steps[i - 1][1] : s[1];
      var w = f.visits ? (s[1] / f.visits) * 100 : 0;
      return '<div class="funnel-row"><span class="lbl">' + s[0] + '</span><div class="bar' + (s[2] ? " bar--main" : "") + '"><i style="width:' + w + '%"></i></div>' +
        '<span class="num"><strong>' + s[1] + "</strong> · " + pct(s[1], f.visits) + (i ? "<small>↳ " + pct(s[1], prev) + "</small>" : "") + "</span></div>";
    }).join("");

    // Rankings
    var it = itemStats(filtered, S);
    rank("rankViews", it, "views"); rank("rankCart", it, "cart"); rank("rankOrders", it, "orders");

    // Por fuente (sin filtro de fuente)
    var bySrc = {};
    events.forEach(function (ev) { (bySrc[src(ev)] = bySrc[src(ev)] || []).push(ev); });
    var srcRows = Object.keys(bySrc).map(function (k) {
      var Sx = sessions(bySrc[k]), fx = funnel(Sx), ix = itemStats(bySrc[k], Sx);
      var top = Object.keys(ix).sort(function (a, b) { return (ix[b].orders - ix[a].orders) || (ix[b].cart - ix[a].cart); })[0];
      return { k: k, f: fx, rate: fx.visits ? fx.order / fx.visits : 0, top: top ? (names[top] || top) : "—" };
    }).filter(function (r) { return r.f.visits; }).sort(function (a, b) { return b.f.visits - a.f.visits; });
    var best = Math.max.apply(null, srcRows.map(function (r) { return r.rate; }).concat([0]));
    $("bySource").innerHTML = "<thead><tr><th>Fuente</th><th>Visitas</th><th>Vieron</th><th>Carrito</th><th>Ordenar</th><th>% Ordenar</th><th>Correos</th><th>Tiempo prom.</th><th>Top platillo</th></tr></thead><tbody>" +
      (srcRows.map(function (r) {
        var x = r.f;
        return "<tr><td><strong>" + esc(r.k) + "</strong></td><td>" + x.visits + "</td><td>" + x.view + " <span class=muted>(" + pct(x.view, x.visits) + ")</span></td><td>" + x.cart + " <span class=muted>(" + pct(x.cart, x.visits) + ")</span></td><td>" + x.order +
          '</td><td class="' + (r.rate === best && best > 0 ? "hi" : "") + '">' + pct(x.order, x.visits) + "</td><td>" + x.email + "</td><td>" + (x.timeN ? Math.round(x.timeSum / x.timeN) + " s" : "—") + "</td><td>" + esc(r.top) + "</td></tr>";
      }).join("") || '<tr><td colspan="9" class="muted">Sin datos todavía.</td></tr>') + "</tbody>";

    // Horarios
    var slots = {};
    var st = toMin(C.PICKUP_START || "12:00"), en = toMin(C.PICKUP_END || "16:00"), step = C.PICKUP_STEP_MIN || 15;
    for (var m = st; m <= en; m += step) slots[toHHMM(m)] = 0;
    Object.keys(S).forEach(function (k) { var t = S[k].order && S[k].order.pickup_time; if (t) slots[t] = (slots[t] || 0) + 1; });
    var mx = Math.max.apply(null, Object.values(slots).concat([1]));
    $("slotsChart").innerHTML = Object.keys(slots).sort().map(function (t) {
      return '<div title="' + t + ": " + slots[t] + '"><span class="n">' + (slots[t] || "") + '</span><b style="height:' + (slots[t] / mx) * 100 + '%"></b><span class="t">' + t + "</span></div>";
    }).join("");

    // Por día
    var byDay = {};
    filtered.forEach(function (ev) { (byDay[dayOf(ev)] = byDay[dayOf(ev)] || []).push(ev); });
    $("byDay").innerHTML = "<thead><tr><th>Día</th><th>Visitas</th><th>Carrito</th><th>Ordenar</th><th>% Ordenar</th><th>Correos</th></tr></thead><tbody>" +
      (Object.keys(byDay).sort().map(function (d) {
        var x = funnel(sessions(byDay[d]));
        return "<tr><td>" + d + "</td><td>" + x.visits + "</td><td>" + x.cart + "</td><td>" + x.order + "</td><td>" + pct(x.order, x.visits) + "</td><td>" + x.email + "</td></tr>";
      }).join("") || '<tr><td colspan="6" class="muted">Sin datos todavía.</td></tr>') + "</tbody>";
  }

  function rank(id, it, metric) {
    var ids = Object.keys(names).length ? Object.keys(names) : Object.keys(it);
    Object.keys(it).forEach(function (k) { if (ids.indexOf(k) < 0) ids.push(k); });
    ids.sort(function (a, b) { return ((it[b] || {})[metric] || 0) - ((it[a] || {})[metric] || 0); });
    var mx = Math.max.apply(null, ids.map(function (k) { return (it[k] || {})[metric] || 0; }).concat([1]));
    $(id).innerHTML = ids.map(function (k) {
      var v = (it[k] || {})[metric] || 0;
      return '<div class="rank-row"><span>' + esc(names[k] || k) + '</span><span class="num">' + v + '</span><div class="bar"><i style="width:' + (v / mx) * 100 + '%"></i></div></div>';
    }).join("") || '<p class="muted small">Sin datos.</p>';
  }
  function toMin(h) { var p = h.split(":"); return +p[0] * 60 + +p[1]; }
  function toHHMM(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }

  function downloadCsv() {
    var rows = base();
    var cols = ["ts", "session_id", "visitor_id", "event", "utm_source", "utm_medium", "utm_campaign", "item_id", "item_name", "qty", "value", "items", "cart_qty", "pickup_time", "time_on_page_s", "max_scroll_pct", "has_email", "mode", "device", "extra"];
    var csv = [cols.join(",")].concat(rows.map(function (r) {
      return cols.map(function (c) { var v = r[c] == null ? "" : String(r[c]); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(",");
    })).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "healtybite-eventos.csv"; a.click();
  }
})();

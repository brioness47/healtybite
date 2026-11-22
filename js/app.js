/* healtybite · lógica de la tienda */
(function () {
  var C = window.HB_CONFIG || {};
  var MODE = window.HB_MODE || "fakedoor";
  var T = window.HBTrack || { track: function () {}, flush: function () {} };
  var PLACEHOLDER = "img/placeholder.svg";

  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return "$" + Number(n).toLocaleString("es-MX"); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var menu = null, byId = {};
  var cart = load("hb_cart", []);       // [{id, qty}]
  var pickup = load("hb_pickup", null); // "12:30"
  var current = null, qty = 1, activeCat = "todos";
  var lastFocus = null;

  function load(k, d) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save() { try { sessionStorage.setItem("hb_cart", JSON.stringify(cart)); sessionStorage.setItem("hb_pickup", JSON.stringify(pickup)); } catch (e) {} }

  $("year").textContent = new Date().getFullYear();
  $("pickupPlace").textContent = C.PICKUP_PLACE || "";
  $("fdDiscount").textContent = C.DISCOUNT_TEXT || "tu primer bowl con descuento";

  // ---------- Menú ----------
  fetch("menu.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (m) {
      menu = m;
      m.items.forEach(function (it) { byId[it.id] = it; });
      cart = cart.filter(function (c) { return byId[c.id]; });
      renderChips(); renderGrid(); renderCart();
    })
    .catch(function () {
      $("grid").innerHTML = '<p class="muted">No se pudo cargar el menú. Abre el sitio desde un servidor (ver README).</p>';
    });

  function tagHtml(it) {
    var labels = menu.tagLabels || {};
    var out = '<span class="tag tag--protein">' + esc(it.protein) + "</span>";
    it.tags.forEach(function (t) {
      if (t === "snack" || t === "bebida") return;
      out += '<span class="tag' + (t === "mas-pedido" ? " tag--hot" : "") + '">' + esc(labels[t] || t) + "</span>";
    });
    return out;
  }
  function img(src, alt, cls) {
    return '<img class="' + cls + '" src="' + esc(src || PLACEHOLDER) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">';
  }

  function renderChips() {
    $("chips").innerHTML = menu.categories.map(function (c) {
      return '<button class="chip" role="tab" data-cat="' + esc(c.id) + '" aria-selected="' + (c.id === activeCat) + '">' + esc(c.label) + "</button>";
    }).join("");
  }
  $("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    activeCat = b.dataset.cat;
    renderChips(); renderGrid();
    T.track("filter_menu", { extra: activeCat });
  });

  function renderGrid() {
    var items = menu.items.filter(function (it) { return activeCat === "todos" || it.tags.indexOf(activeCat) >= 0; });
    $("menuCount").textContent = items.length + " platillos";
    $("grid").innerHTML = items.map(function (it) {
      return '<article class="card" data-id="' + esc(it.id) + '" role="button" tabindex="0" aria-label="Ver ' + esc(it.name) + '">' +
        img(it.image, it.name, "card__img") +
        '<div class="card__body"><div class="tags">' + tagHtml(it) + "</div>" +
        '<h3 class="card__name">' + esc(it.name) + "</h3>" +
        '<p class="card__desc">' + esc(it.description) + "</p>" +
        '<div class="card__foot"><span class="price">' + money(it.price) + "</span>" +
        '<button class="add" data-quick="' + esc(it.id) + '" aria-label="Agregar ' + esc(it.name) + '">+</button></div></div></article>';
    }).join("");
  }
  $("grid").addEventListener("click", function (e) {
    var q = e.target.closest("[data-quick]");
    if (q) { e.stopPropagation(); addToCart(q.dataset.quick, 1, "quick_add"); return; }
    var card = e.target.closest(".card"); if (card) openItem(card.dataset.id);
  });
  $("grid").addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) { e.preventDefault(); openItem(e.target.dataset.id); }
  });

  // ---------- Detalle ----------
  function openItem(id) {
    var it = byId[id]; if (!it) return;
    current = it; qty = 1;
    var im = $("itemImg");
    im.onerror = function () { im.onerror = null; im.src = PLACEHOLDER; };
    im.src = it.image || PLACEHOLDER; im.alt = it.name;
    $("itemTags").innerHTML = tagHtml(it);
    $("itemTitle").textContent = it.name;
    $("itemDesc").textContent = it.description;
    $("itemProtein").textContent = /\d/.test(it.protein) ? it.protein.replace(/\s*prote[ií]na/i, "") : "—";
    $("itemKcal").textContent = it.kcal || "—";
    updateQty();
    openSheet("itemSheet");
    T.track("view_item", { item_id: it.id, item_name: it.name, value: it.price });
  }
  function updateQty() {
    $("qtyVal").textContent = qty;
    $("addPrice").textContent = money(current.price * qty);
  }
  $("qtyMinus").onclick = function () { if (qty > 1) { qty--; updateQty(); } };
  $("qtyPlus").onclick = function () { if (qty < 10) { qty++; updateQty(); } };
  $("addBtn").onclick = function () { addToCart(current.id, qty, "detail"); closeSheet("itemSheet"); };

  // ---------- Carrito ----------
  function addToCart(id, n, from) {
    var it = byId[id]; if (!it) return;
    var line = cart.find(function (c) { return c.id === id; });
    if (line) line.qty = Math.min(10, line.qty + n); else cart.push({ id: id, qty: n });
    save(); renderCart();
    toast("Agregado: " + it.name);
    var b = $("cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    T.track("add_to_cart", { item_id: id, item_name: it.name, qty: n, value: it.price * n, extra: from, cart_qty: cartQty() });
  }
  function changeQty(id, d) {
    var line = cart.find(function (c) { return c.id === id; }); if (!line) return;
    line.qty += d;
    if (line.qty <= 0) {
      cart = cart.filter(function (c) { return c.id !== id; });
      T.track("remove_from_cart", { item_id: id, item_name: byId[id].name });
    }
    save(); renderCart();
  }
  function cartQty() { return cart.reduce(function (s, c) { return s + c.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, c) { return s + c.qty * byId[c.id].price; }, 0); }
  function cartItemsStr() { return cart.map(function (c) { return c.id + ":" + c.qty; }).join("|"); }

  function renderCart() {
    if (!menu) return;
    var n = cartQty(), total = cartTotal();
    $("cartBadge").hidden = n === 0; $("cartBadge").textContent = n;
    $("cartBar").hidden = n === 0 || isOpen();
    $("cartBarQty").textContent = n; $("cartBarTotal").textContent = money(total);
    $("cartEmpty").hidden = n > 0; $("cartFooter").hidden = n === 0;
    $("cartList").innerHTML = cart.map(function (c) {
      var it = byId[c.id];
      return '<li class="cart-item">' + img(it.image, it.name, "") +
        '<div><div class="cart-item__name">' + esc(it.name) + '</div><div class="cart-item__price">' + money(it.price) + " · " + esc(it.protein) + "</div></div>" +
        '<div class="stepper stepper--sm"><button data-d="-1" data-id="' + esc(c.id) + '" aria-label="Menos">−</button><span>' + c.qty +
        '</span><button data-d="1" data-id="' + esc(c.id) + '" aria-label="Más">+</button></div></li>';
    }).join("");
    $("subtotal").textContent = money(total); $("total").textContent = money(total);
    renderSlots(); updateOrderBtn();
  }
  $("cartList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-d]"); if (b) changeQty(b.dataset.id, Number(b.dataset.d));
  });
  function openCart(src) { renderCart(); openSheet("cartSheet"); T.track("open_cart", { cart_qty: cartQty(), value: cartTotal(), extra: src }); }
  $("cartBtn").onclick = function () { openCart("header"); };
  $("cartBar").onclick = function () { openCart("bar"); };

  // ---------- Horarios ----------
  function toMin(hhmm) { var p = hhmm.split(":"); return Number(p[0]) * 60 + Number(p[1]); }
  function toHHMM(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function slotInfo() {
    var start = toMin(C.PICKUP_START || "12:00"), end = toMin(C.PICKUP_END || "16:00"), step = C.PICKUP_STEP_MIN || 15;
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var today = nowMin + step <= end;
    var slots = [];
    for (var m = start; m <= end; m += step) slots.push({ t: toHHMM(m), ok: !today || m >= nowMin + step });
    return { day: today ? "Hoy" : "Mañana", slots: slots };
  }
  function renderSlots() {
    var info = slotInfo();
    $("pickupDay").textContent = info.day;
    if (pickup && !info.slots.some(function (s) { return s.t === pickup && s.ok; })) pickup = null;
    $("slots").innerHTML = info.slots.map(function (s) {
      return '<button class="slot" role="radio" data-t="' + s.t + '" aria-checked="' + (s.t === pickup) + '"' + (s.ok ? "" : " disabled") + ">" + s.t + "</button>";
    }).join("");
  }
  $("slots").addEventListener("click", function (e) {
    var b = e.target.closest(".slot"); if (!b || b.disabled) return;
    pickup = b.dataset.t; save(); renderSlots(); updateOrderBtn();
    T.track("select_pickup_time", { pickup_time: pickup, extra: slotInfo().day });
  });
  function updateOrderBtn() {
    var btn = $("orderBtn");
    btn.disabled = !pickup || cart.length === 0;
    btn.textContent = pickup ? "Ordenar · " + money(cartTotal()) : "Elige un horario";
  }

  // ---------- Ordenar (puerta falsa) ----------
  $("orderBtn").onclick = function () {
    if (!pickup || !cart.length) return;
    T.track("click_order", { items: cartItemsStr(), cart_qty: cartQty(), value: cartTotal(), pickup_time: pickup }, { now: true });
    closeSheet("cartSheet");
    if (MODE === "preventa") openCheckout(); else openFakeDoor();
  };

  function openFakeDoor() {
    $("emailForm").hidden = false; $("emailDone").hidden = true; $("emailError").hidden = true; $("emailInput").value = "";
    openSheet("fakeDoor");
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $("emailForm").onsubmit = function (e) {
    e.preventDefault();
    var v = $("emailInput").value.trim();
    if (!EMAIL_RE.test(v)) { $("emailError").hidden = false; $("emailInput").focus(); return; }
    T.track("submit_email", { email: v.slice(0, 120), items: cartItemsStr(), pickup_time: pickup, value: cartTotal() }, { now: true });
    $("emailForm").hidden = true; $("emailDone").hidden = false;
  };
  $("fdClose").onclick = function () {
    T.track("close_fakedoor", { extra: $("emailDone").hidden ? "sin_correo" : "con_correo" });
    closeSheet("fakeDoor");
  };

  // ---------- Preventa ----------
  function openCheckout() {
    $("coForm").hidden = false; $("coDone").hidden = true; $("coError").hidden = true;
    $("coSummary").innerHTML = cart.map(function (c) {
      var it = byId[c.id]; return "<li><span>" + c.qty + " × " + esc(it.name) + "</span><span>" + money(it.price * c.qty) + "</span></li>";
    }).join("") + "<li><strong>Total</strong><strong>" + money(cartTotal()) + "</strong></li>";
    $("coTime").innerHTML = slotInfo().slots.filter(function (s) { return s.ok; }).map(function (s) {
      return '<option value="' + s.t + '"' + (s.t === pickup ? " selected" : "") + ">" + slotInfo().day + " " + s.t + "</option>";
    }).join("");
    $("coTotal").textContent = money(cartTotal());
    openSheet("checkout");
  }
  $("checkoutForm").onsubmit = function (e) {
    e.preventDefault();
    var name = $("coName").value.trim(), email = $("coEmail").value.trim(), time = $("coTime").value;
    if (!name || !EMAIL_RE.test(email) || !time) { $("coError").hidden = false; return; }
    pickup = time; save();
    var folio = "HB-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    T.track("preorder_confirm", { name: name.slice(0, 60), email: email.slice(0, 120), folio: folio, items: cartItemsStr(), cart_qty: cartQty(), value: cartTotal(), pickup_time: time }, { now: true });
    $("coFolio").textContent = folio; $("coDoneTime").textContent = time;
    $("payTotal").textContent = money(cartTotal());
    var link = C.PAYMENT_LINK || "#";
    $("payLink").href = link;
    $("payLink").onclick = function () { T.track("click_payment_link", { extra: folio, value: cartTotal() }, { now: true }); };
    $("coForm").hidden = true; $("coDone").hidden = false;
  };

  // ---------- Sheets ----------
  function isOpen() { return !!document.querySelector(".sheet:not([hidden])"); }
  function openSheet(id) {
    lastFocus = document.activeElement;
    $(id).hidden = false; document.body.style.overflow = "hidden"; $("cartBar").hidden = true;
    var f = $(id).querySelector("button, input, a"); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 50);
  }
  function closeSheet(id) {
    $(id).hidden = true;
    if (!isOpen()) { document.body.style.overflow = ""; renderCart(); }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]"); if (!c) return;
    var s = c.closest(".sheet"); if (s) closeSheet(s.id);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = document.querySelectorAll(".sheet:not([hidden])");
    if (open.length) closeSheet(open[open.length - 1].id);
  });

  var tt;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 1600); }
})();

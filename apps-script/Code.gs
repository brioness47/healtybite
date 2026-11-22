/**
 * healtybite · receptor de eventos (Google Apps Script)
 *
 * Crea 3 pestañas en tu Google Sheet:
 *   - eventos  → cada interacción (anónima)
 *   - correos  → correos de la puerta falsa (separados de los eventos)
 *   - pedidos  → pedidos del modo preventa (nombre, correo, horario; NUNCA datos de tarjeta)
 *
 * doPost → recibe eventos del sitio
 * doGet  → entrega los eventos al dashboard (stats.html) si la clave coincide
 */

// ⚠️ Cambia esta clave. Es la que pondrás en stats.html?key=...
var STATS_KEY = 'cambia-esta-clave';

var EVENT_HEADERS = [
  'received_at', 'ts', 'session_id', 'visitor_id', 'event', 'page', 'mode',
  'utm_source', 'utm_medium', 'utm_campaign',
  'item_id', 'item_name', 'qty', 'value', 'items', 'cart_qty', 'pickup_time',
  'time_on_page_s', 'max_scroll_pct', 'has_email', 'device', 'referrer', 'extra'
];
var EMAIL_HEADERS = ['received_at', 'session_id', 'email', 'utm_source', 'items', 'pickup_time', 'value'];
var ORDER_HEADERS = ['received_at', 'folio', 'session_id', 'name', 'email', 'items', 'cart_qty', 'value', 'pickup_time', 'utm_source', 'pagado'];

var ALLOWED = [
  'page_view', 'view_item', 'add_to_cart', 'remove_from_cart', 'open_cart', 'filter_menu',
  'select_pickup_time', 'click_order', 'submit_email', 'close_fakedoor',
  'preorder_confirm', 'click_payment_link', 'page_engagement'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var events = Array.isArray(body.events) ? body.events : [body];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var evSheet = sheet_(ss, 'eventos', EVENT_HEADERS);
    var now = new Date();
    var rows = [], emailRows = [], orderRows = [];

    events.slice(0, 100).forEach(function (ev) {
      if (!ev || ALLOWED.indexOf(ev.event) < 0) return;
      var email = clean_(ev.email, 120);
      if (ev.event === 'submit_email' && email) {
        emailRows.push([now, clean_(ev.session_id), email, clean_(ev.utm_source), clean_(ev.items), clean_(ev.pickup_time), num_(ev.value)]);
      }
      if (ev.event === 'preorder_confirm') {
        orderRows.push([now, clean_(ev.folio, 20), clean_(ev.session_id), clean_(ev.name, 60), email, clean_(ev.items),
          num_(ev.cart_qty), num_(ev.value), clean_(ev.pickup_time), clean_(ev.utm_source), '']);
      }
      ev.has_email = email ? 'si' : '';
      rows.push(EVENT_HEADERS.map(function (h) {
        if (h === 'received_at') return now;
        if (h === 'qty' || h === 'value' || h === 'cart_qty' || h === 'time_on_page_s' || h === 'max_scroll_pct') return num_(ev[h]);
        return clean_(ev[h]); // email y nombre NO se guardan en "eventos"
      }));
    });

    append_(evSheet, rows);
    if (emailRows.length) append_(sheet_(ss, 'correos', EMAIL_HEADERS), emailRows);
    if (orderRows.length) append_(sheet_(ss, 'pedidos', ORDER_HEADERS), orderRows);
    return json_({ ok: true, saved: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.key !== STATS_KEY) return json_({ ok: false, error: 'unauthorized' }, p.callback);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheet_(ss, 'eventos', EVENT_HEADERS);
  var values = sh.getDataRange().getValues();
  var headers = values.shift() || EVENT_HEADERS;
  var rows = values.map(function (r) {
    return r.map(function (v) { return v instanceof Date ? v.toISOString() : v; });
  });
  var emails = ss.getSheetByName('correos');
  var orders = ss.getSheetByName('pedidos');
  return json_({
    ok: true,
    generated_at: new Date().toISOString(),
    headers: headers,
    rows: rows,
    emails_count: emails ? Math.max(0, emails.getLastRow() - 1) : 0,
    orders_count: orders ? Math.max(0, orders.getLastRow() - 1) : 0
  }, p.callback);
}

// ---------- utilidades ----------
function sheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function append_(sh, rows) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
function clean_(v, max) {
  if (v === undefined || v === null) return '';
  var s = String(v).slice(0, max || 300);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita inyección de fórmulas en Sheets
  return s;
}
function num_(v) {
  var n = Number(v);
  return isFinite(n) && v !== '' && v !== null && v !== undefined ? n : '';
}
function json_(obj, callback) {
  var out = JSON.stringify(obj);
  if (callback && /^[\w.]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + out + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/** Ejecuta esto una vez desde el editor para crear las pestañas y dar permisos. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sheet_(ss, 'eventos', EVENT_HEADERS);
  sheet_(ss, 'correos', EMAIL_HEADERS);
  sheet_(ss, 'pedidos', ORDER_HEADERS);
}

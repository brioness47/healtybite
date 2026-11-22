/* =========================================================
   healtybite · configuración del sitio
   Edita SOLO este archivo para cambiar el comportamiento.
   ========================================================= */
window.HB_CONFIG = {
  // "fakedoor"  → el botón Ordenar muestra la pantalla honesta + correo opcional
  // "preventa"  → el botón Ordenar pide nombre/correo y muestra el link de pago externo
  MODE: "fakedoor",

  // URL de tu Google Apps Script desplegado como "Aplicación web" (termina en /exec).
  // Si se deja vacío, los eventos se guardan solo en este navegador (modo prueba local).
  APPS_SCRIPT_URL: "",

  // Link de pago externo (Mercado Pago). Solo se usa en MODE = "preventa".
  // healtybite NUNCA pide ni guarda datos de tarjeta: el pago ocurre en Mercado Pago.
  PAYMENT_LINK: "https://mpago.la/TU-LINK",

  // Franjas de recogida
  PICKUP_START: "12:00",
  PICKUP_END: "16:00",
  PICKUP_STEP_MIN: 15,

  // Textos
  PICKUP_PLACE: "Puesto healtybite · Campus Tec",
  DISCOUNT_TEXT: "tu primer bowl con descuento",

  // Permite forzar el modo con ?mode=preventa en la URL (útil para probar). Pon false al publicar si no lo quieres.
  ALLOW_MODE_OVERRIDE: true
};

// --- No editar: resuelve el modo activo (permite ?mode=preventa para pruebas)
(function () {
  var m = window.HB_CONFIG.MODE;
  try {
    var q = new URLSearchParams(location.search).get("mode");
    if (window.HB_CONFIG.ALLOW_MODE_OVERRIDE && (q === "fakedoor" || q === "preventa")) m = q;
  } catch (e) {}
  window.HB_MODE = m === "preventa" ? "preventa" : "fakedoor";
})();

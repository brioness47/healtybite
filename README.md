👉 **Pruébalo aquí: [brioness47.github.io/healtybite](https://brioness47.github.io/healtybite/?utm_source=general&utm_medium=social&utm_campaign=fakedoor)**

# healtybite 🥗

**No hagas filas.** Comida saludable y accesible para estudiantes del Tec de Monterrey: pides desde tu celular, eliges a qué hora y recoges en el puesto sin hacer fila.

---

## ¿Qué es esto?

Comer en el campus cuesta entre $150 y $250 MXN y puede costar unos 20 minutos de fila, sobre todo entre clases. **healtybite** propone una alternativa: bowls, wraps y snacks altos en proteína desde **$49**, listos a la hora que tú elijas.

## ⚠️ Importante: es un experimento

healtybite **todavía no abre en el campus**. Esta página es un **pretotipo** (una "puerta falsa") hecho para un proyecto universitario de emprendimiento. Sirve para medir si a los estudiantes les interesaría un servicio así antes de construirlo de verdad.

- **No se cobra nada** y no se piden datos de pago.
- Al dar clic en **Ordenar** verás un mensaje que explica que aún no abrimos.
- Ahí puedes dejar tu correo (es opcional) para que te avisemos cuando abramos, con tu primer bowl con descuento.

## Cómo probarlo

1. Abre el [link de la página](https://brioness47.github.io/healtybite/?utm_source=general&utm_medium=social&utm_campaign=fakedoor), de preferencia desde tu celular.
2. Mira el menú y toca un platillo para ver el detalle.
3. Agrégalo al carrito y elige un horario de recogida (franjas de 15 minutos, de 12:00 a 16:00).
4. Da clic en **Ordenar**.

## Menú de ejemplo

| Platillo | Precio | Proteína |
|---|---|---|
| Bowl pollo y quinoa | $99 | 38 g |
| Wrap de atún | $89 | 30 g |
| Bowl veggie con huevo | $85 | 24 g |
| Ensalada de pasta con pollo | $95 | 32 g |
| Fruta + yogurt griego | $49 | Snack |
| Smoothie de proteína | $59 | Bebida |

El menú puede cambiar. Lo que más te llame la atención nos ayuda a decidir qué ofrecer.

## Privacidad

Tu privacidad importa, así que esto es lo que pasa con tus datos:

- **Qué medimos, de forma anónima:** qué platillos ves, cuáles agregas al carrito, qué horario eliges, si das clic en Ordenar, cuánto tiempo estás en la página y de qué QR o link llegaste.
- **No sabemos quién eres.** Usamos un identificador aleatorio que no está ligado a tu nombre. No usamos cookies de publicidad ni herramientas de terceros para rastrearte.
- **Tu correo es opcional.** Solo lo usamos para avisarte cuando abramos. Si quieres que lo borremos, escríbenos y lo eliminamos.
- **Nunca pedimos ni guardamos datos de tarjeta.**

---

## Para quien quiera ver cómo está hecho

El sitio está hecho con HTML, CSS y JavaScript simples, sin servidor propio. Las interacciones se guardan en una hoja de Google Sheets mediante Google Apps Script, y un pequeño panel de resultados muestra el embudo de conversión, los platillos más populares y las visitas por fuente de tráfico.

Si quieres adaptarlo para validar tu propia idea de negocio, la guía paso a paso está en **[GUIA-TECNICA.md](GUIA-TECNICA.md)**. Explica cómo editar el menú (`menu.json`), cambiar el modo de la tienda, conectar la hoja de cálculo, publicar el sitio gratis y leer el panel de resultados.

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La tienda |
| `menu.json` | El menú, fácil de editar |
| `js/config.js` | Configuración (modo, conexión a la hoja de cálculo) |
| `stats.html` | Panel de resultados (privado, con clave) |
| `apps-script/Code.gs` | Código que recibe y guarda los datos en Google Sheets |
| `qr-urls.md` | Links con etiqueta para cada grupo de estudiantes |

---

Proyecto universitario · Tec de Monterrey

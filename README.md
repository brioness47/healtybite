# healtybite · fake door (pretotipo)

Tienda de pedidos que parece real para **medir demanda** de healtybite en el campus Tec. Nadie paga nada: al dar clic en **Ordenar** se muestra una pantalla honesta y se invita (opcionalmente) a dejar el correo. Cada interacción se registra de forma anónima en una Google Sheet.

```
healtybite/
├── index.html          tienda (hero, menú, detalle, carrito, horario, puerta falsa / preventa)
├── stats.html          dashboard  →  stats.html?key=TU_CLAVE
├── menu.json           ← EDITA AQUÍ EL MENÚ
├── js/config.js        ← EDITA AQUÍ: MODE, URL del Apps Script, link de pago, horarios
├── js/tracker.js       medición (sesión anónima, UTM, eventos, tiempo, scroll)
├── js/app.js           lógica de la tienda
├── js/stats.js         cálculos del dashboard
├── css/styles.css      estilos
├── img/placeholder.svg imagen de respaldo si una foto no carga
├── apps-script/Code.gs código para Google Apps Script (backend gratis)
└── qr-urls.md          URLs con UTM por segmento, listas para QR
```

---

## 1. Correrlo en local

El sitio carga `menu.json` con `fetch`, así que **no funciona abriendo el archivo con doble clic**. Abre una terminal en la carpeta y ejecuta:

```bash
python3 -m http.server 8080
```

Abre <http://localhost:8080/?utm_source=test>. Sin `APPS_SCRIPT_URL`, los eventos se guardan en tu navegador y puedes verlos en <http://localhost:8080/stats.html?key=local> (en modo local acepta cualquier clave). Para verlos ahí, desmarca “Excluir pruebas”.

---

## 2. Editar el menú (`menu.json`)

Cada platillo:

```json
{
  "id": "bowl-pollo-quinoa",          // único, sin espacios (se usa en las métricas: no lo cambies a mitad del experimento)
  "name": "Bowl pollo y quinoa",
  "price": 99,
  "protein": "38 g proteína",         // o "Snack", "Bebida"
  "kcal": 560,
  "tags": ["alto-proteina", "mas-pedido"],
  "description": "Texto corto…",
  "image": "https://images.unsplash.com/photo-…?w=700&q=70&auto=format&fit=crop"
}
```

- **Etiquetas disponibles:** `alto-proteina`, `vegetariano`, `snack`, `bebida`, `mas-pedido`. Las categorías de los filtros están en `categories` y los textos de las etiquetas en `tagLabels`.
- **Imágenes:** puedes usar una URL de Unsplash (abre la foto → clic derecho → *Copiar dirección de imagen* y agrega `?w=700&q=70&auto=format&fit=crop`) o una foto propia: guárdala en `img/` y escribe `"image": "img/mi-bowl.jpg"`. Si una imagen falla, se muestra `img/placeholder.svg`. **Revisa que todas las fotos carguen antes de imprimir los QR.**

---

## 3. Cambiar el modo (`js/config.js`)

```js
MODE: "fakedoor",   // o "preventa"
```

| Modo | Qué pasa al dar clic en **Ordenar** |
|---|---|
| `fakedoor` (por defecto) | “¡Gracias! healtybite aún no abre…” + correo opcional + botón **Avísenme** |
| `preventa` | Formulario con nombre, correo y horario → folio → botón al `PAYMENT_LINK` de Mercado Pago |

- En preventa, pon tu link en `PAYMENT_LINK` (Mercado Pago → *Cobrar* → *Link de pago*). Los pedidos se guardan en la pestaña **pedidos** de la Sheet, con la columna `pagado` para que la marques a mano al confirmar el pago en Mercado Pago.
- **Ningún modo pide ni guarda datos de tarjeta.**
- Puedes ver el modo preventa sin cambiar la configuración con `?mode=preventa` en la URL. Para desactivar eso, pon `ALLOW_MODE_OVERRIDE: false`.
- Cada evento guarda el `mode` en que ocurrió, así que puedes separar los resultados de ambos modos.

---

## 4. Desplegar el Google Apps Script (backend gratis)

1. Crea una Google Sheet nueva, por ejemplo “healtybite – datos”.
2. Menú **Extensiones → Apps Script**.
3. Borra lo que haya en `Código.gs` y pega todo el contenido de `apps-script/Code.gs`.
4. **Cambia la clave** en la línea `var STATS_KEY = 'cambia-esta-clave';` por una tuya, por ejemplo `bowl-2026-xyz`. Guarda (💾).
5. En el selector de funciones elige **`setup`** y da **Ejecutar**. Google pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir*. Es normal porque el script es tuyo. Esto crea las pestañas `eventos`, `correos` y `pedidos`.
6. **Implementar → Nueva implementación** → ⚙️ tipo **Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona** (no “cualquier persona con cuenta de Google”)
   - **Implementar** → copia la **URL de la aplicación web** (termina en `/exec`).
7. Pega esa URL en `js/config.js`:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfy…/exec",
   ```
8. Prueba: abre el sitio con `?utm_source=test`, agrega algo y da clic en Ordenar. En unos segundos deben aparecer filas en la pestaña `eventos`. Luego abre `stats.html?key=TU_CLAVE`.

> **Si editas el código del script**, ve a **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así se conserva la misma URL. Si haces “Nueva implementación”, la URL cambia.

**Qué se guarda en cada pestaña:**
- `eventos`: una fila por interacción, con `session_id` anónimo, `utm_source`, platillo, cantidad, horario, tiempo, scroll, etc. **Sin correos ni nombres.**
- `correos`: correos que dejaron en la puerta falsa (separados del resto de los datos).
- `pedidos`: pedidos del modo preventa.

---

## 5. Publicar el sitio gratis

**Opción A, GitHub Pages:**
1. Crea un repositorio público `healtybite` en GitHub y sube todos los archivos (en la web: *Add file → Upload files*, arrastra la carpeta completa).
2. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En 1–2 minutos queda en `https://TU-USUARIO.github.io/healtybite/`.

**Opción B, Netlify (la más rápida):** entra a <https://app.netlify.com/drop> y arrastra la carpeta `healtybite`. Te da una URL al instante, y puedes cambiar el subdominio en *Site settings*.

**Opción C, Vercel:** *Add New → Project*, importa el repositorio de GitHub y da *Deploy* (sin configurar nada).

No hay paso de compilación: son archivos estáticos.

---

## 6. URLs con UTM para los QR

Están en `qr-urls.md`. Después de publicar, reemplaza la URL base con tu URL real:

```bash
sed -i 's#https://TU-USUARIO.github.io/healtybite/#https://TU-URL-REAL/#g' qr-urls.md
```

Formato: `TU-URL/?utm_source=SEGMENTO&utm_medium=qr&utm_campaign=fakedoor`

Segmentos: `life-deportes`, `atletas`, `gym`, `area-salud`, `difusion`, `general`. Para un segmento nuevo, solo cambia `utm_source`: aparecerá solo en el dashboard.

**Generar los QR:** pega cada URL en un generador gratuito (por ejemplo <https://www.qrcode-monkey.com> o el de Canva), descárgalo en PNG/SVG y **escanéalo con tu celular antes de imprimir** para confirmar que abre la URL correcta. Rotula cada impresión con su segmento para no mezclarlos.

**Tus propias pruebas:** usa siempre `?utm_source=test`. El dashboard las excluye por defecto.

---

## 7. Leer el dashboard (`stats.html?key=TU_CLAVE`)

La clave la valida el Apps Script, así que nadie ve datos sin ella. Es seguridad básica, adecuada para un examen.

- **KPIs:** visitas (sesiones únicas), **% clic en Ordenar** (la métrica principal), correos, ticket promedio del carrito al ordenar y tiempo/scroll promedio.
- **Embudo:** visitas → vieron platillo → agregaron al carrito → clic en Ordenar → dejaron correo. Muestra el % sobre visitas y, debajo (↳), el % sobre el paso anterior. Todo se cuenta por **sesión única**: si alguien da clic en Ordenar 3 veces, cuenta 1.
- **Ranking de platillos:** por vistas de detalle, por unidades agregadas al carrito y por unidades en el carrito al dar clic en Ordenar (última orden de cada sesión).
- **Por fuente:** el embudo de cada `utm_source` lado a lado. En verde, el segmento con mejor % de Ordenar. Esta tabla ignora el filtro de fuente.
- **Horarios:** franja elegida al dar clic en Ordenar.
- **Por día:** útil para comparar los días 1–3.
- **Filtros:** fuente, día y excluir pruebas. **Descargar CSV** exporta los eventos filtrados para Excel o para tus gráficas del reporte.

**Cómo interpretarlo, en breve:** la tasa *clic en Ordenar / visitas* es tu evidencia de demanda (la gente intentó comprar). *Correos / clic en Ordenar* mide qué tanto interés sobrevive después de saber que no existe todavía. Compara segmentos con al menos ~30 visitas cada uno antes de sacar conclusiones.

---

## 8. Eventos que se registran

| Evento | Cuándo | Datos extra |
|---|---|---|
| `page_view` | carga la página | referrer |
| `view_item` | abre el detalle de un platillo | item_id, item_name, value |
| `add_to_cart` | agrega (desde el detalle o con “+”) | item_id, qty, value, extra=`detail`/`quick_add` |
| `remove_from_cart`, `open_cart`, `filter_menu` | interacciones secundarias | — |
| `select_pickup_time` | elige un horario | pickup_time |
| **`click_order`** | **clic en Ordenar** (evento principal) | items (`id:qty|id:qty`), cart_qty, value, pickup_time |
| `submit_email` | deja su correo | has_email (el correo va a la pestaña `correos`) |
| `close_fakedoor` | cierra la pantalla | con/sin correo |
| `preorder_confirm`, `click_payment_link` | solo en preventa | folio, total |
| `page_engagement` | al salir o cambiar de pestaña | time_on_page_s (tiempo visible), max_scroll_pct |

Todos llevan `ts`, `session_id` (aleatorio por visita), `visitor_id` (aleatorio por dispositivo), `utm_source/medium/campaign`, `mode` y `device`.

## Privacidad

En el footer hay un aviso breve: qué se mide, que es anónimo, que el correo es opcional y que nunca se piden datos de tarjeta. No se usan cookies ni pixeles de terceros. Al terminar el examen, borra la pestaña `correos` si ya no la necesitas.

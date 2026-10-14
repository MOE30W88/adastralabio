// scripts/vinetas-eventos.js
// Contenedor #vinetas-eventos: aloja las tarjetas emergentes (eclipse, evento lunar, mapa del eclipse) y decide dónde van.
//  - modo "rincones": columnas izquierda/derecha ancladas al fondo del reloj. Solo si no chocan con controles, botones, hora/fecha ni el dial.
//  - modo "debajo": fila centrada bajo el reloj (modo por defecto; siempre en pantallas de 1100 px o menos).
// Uso: colocarVineta(elemento, "izq" | "der"). El modo se recalcula solo (cambio de tamaño, tarjetas que aparecen/desaparecen).

const VINETAS = {
  anchoMaximoPantalla: 1100, // por debajo (o igual), siempre "debajo"
  radioDial: 0.4262,         // radio del dial / ancho del reloj (mismo valor que hora/fecha en estructura.css)
  margenDial: 12,            // px de aire alrededor del dial
  margenLado: 0.75,          // rem, igual que el CSS de las tarjetas
  margenFondo: 0.9,          // rem
  separacion: 0.6,           // rem entre tarjetas apiladas
};

let vinetasContenedor = null, vinetasColumnas = null, vinetasPendiente = false, vinetasModo = "";

function asegurarContenedorVinetas() {
  if (vinetasContenedor) return vinetasContenedor;
  const esc = document.getElementById("escenario");
  const c = document.createElement("div");
  c.id = "vinetas-eventos";
  c.className = "modo-debajo";
  const izq = document.createElement("div"), der = document.createElement("div");
  izq.className = "vinetas-col vinetas-izq";
  der.className = "vinetas-col vinetas-der";
  c.append(izq, der);
  esc.after(c);
  vinetasContenedor = c;
  vinetasColumnas = { izq, der };

  const pedir = () => programarAjusteVinetas();
  window.addEventListener("resize", pedir);
  document.addEventListener("cambio-idioma", pedir);
  if (document.fonts?.ready) document.fonts.ready.then(pedir);
  if (window.ResizeObserver) new ResizeObserver(pedir).observe(esc);
  if (window.MutationObserver) new MutationObserver(pedir).observe(c, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
  return c;
}

function colocarVineta(el, lado) {
  asegurarContenedorVinetas();
  vinetasColumnas[lado === "izq" ? "izq" : "der"].appendChild(el);
  if (window.ResizeObserver) new ResizeObserver(programarAjusteVinetas).observe(el);
  programarAjusteVinetas();
}

function programarAjusteVinetas() {
  if (vinetasPendiente) return;
  vinetasPendiente = true;
  requestAnimationFrame(() => { vinetasPendiente = false; ajustarVinetas(); });
}

const rectsChocan = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// ¿Cabe la columna (rect) sin tocar el dial (círculo) ni los obstáculos?
function columnaLibre(rect, obstaculos, circulo) {
  if (obstaculos.some((o) => rectsChocan(rect, o))) return false;
  const px = Math.max(rect.left, Math.min(circulo.x, rect.right)), py = Math.max(rect.top, Math.min(circulo.y, rect.bottom));
  return Math.hypot(px - circulo.x, py - circulo.y) > circulo.r;
}

function modoVinetasPosible() {
  if (window.innerWidth <= VINETAS.anchoMaximoPantalla) return "debajo";
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const esc = document.getElementById("escenario").getBoundingClientRect();
  const reloj = document.getElementById("reloj").getBoundingClientRect();
  const circulo = { x: reloj.left + reloj.width / 2, y: reloj.top + reloj.height * (1000 / 1990), r: reloj.width * VINETAS.radioDial + VINETAS.margenDial };
  const obstaculos = [...document.querySelectorAll("#hora-digital, #fecha-digital, .controles-tiempo, .tirador, #boton-vista-solar")]
    .filter((o) => !o.hidden && o.offsetParent !== null)
    .map((o) => o.getBoundingClientRect());
  const fondo = esc.bottom - VINETAS.margenFondo * rem;
  for (const lado of ["izq", "der"]) {
    const vis = [...vinetasColumnas[lado].children].filter((t) => !t.hidden);
    if (!vis.length) continue;
    const ancho = Math.max(...vis.map((t) => t.offsetWidth));
    const alto = vis.reduce((s, t) => s + t.offsetHeight, 0) + (vis.length - 1) * VINETAS.separacion * rem;
    const x = lado === "izq" ? esc.left + VINETAS.margenLado * rem : esc.right - VINETAS.margenLado * rem - ancho;
    const rect = { left: x, right: x + ancho, top: fondo - alto, bottom: fondo };
    if (!columnaLibre(rect, obstaculos, circulo)) return "debajo";
  }
  return "rincones";
}

function ajustarVinetas() {
  if (!vinetasContenedor) return;
  const modo = modoVinetasPosible();
  if (modo === vinetasModo) return;
  vinetasModo = modo;
  vinetasContenedor.className = `modo-${modo}`;
}

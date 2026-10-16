// scripts/mapa-selector.js
// Mapa del panel de geolocalización: arrastrar, rueda, pellizco, botones +/− y teclado; un clic fija latitud y longitud en los
// campos del panel (el botón "Ir a esta ubicación" los aplica). Proyección equirectangular: x = longitud, y = −latitud (grados),
// por eso el clic → coordenadas es exacto; lo que es aproximado es solo el dibujo (costas simplificadas a 0,15°).
// Incluye buscador de ciudades y países (lista local) y, solo si el usuario lo pide, búsqueda en línea con Nominatim.
// Los datos (scripts/mapa-fronteras-datos.js, ~80 KB comprimido) se cargan la primera vez que se abre el panel.
// Depende de: ubicacion.js (ubicacion, opcional), paneles-laterales.js (el panel recibe la clase "abierto")

const MAPA_SEL = {
  archivoDatos: "scripts/mapa-fronteras-datos.js",
  zoomMax: 200,          // px por grado (≈ 0,5 km por píxel)
  umbralClic: 5,         // px que distinguen un clic de un arrastre
  pausaEnLineaMs: 1100,  // política de Nominatim: máx. 1 petición por segundo
  maxEtiquetas: 45,
  tamanoEtiqueta: 11,    // px
};

const TEXTOS_MAPA_SELECTOR = {
  es: {
    elegido: (lat, lon) => `${lat}°, ${lon}° · pulsa «Ir a esta ubicación»`,
    pais: "país",
    enLinea: (t) => `Buscar «${t}» en línea (OpenStreetMap)`,
    buscando: "Buscando en línea…", sinResultados: "Sin resultados en línea.",
    errorEnLinea: "No se pudo buscar en línea. Revisa tu conexión.",
    cargando: "Cargando mapa…", errorMapa: "No se pudo cargar el mapa. Puedes escribir las coordenadas.",
  },
  en: {
    elegido: (lat, lon) => `${lat}°, ${lon}° · press "Go to this location"`,
    pais: "country",
    enLinea: (t) => `Search "${t}" online (OpenStreetMap)`,
    buscando: "Searching online…", sinResultados: "No online results.",
    errorEnLinea: "Online search failed. Check your connection.",
    cargando: "Loading map…", errorMapa: "The map could not be loaded. You can type the coordinates.",
  },
};
const textoMapaSel = (clave, ...args) => textoDe(TEXTOS_MAPA_SELECTOR, clave, ...args);

const mapa = { listo: false, w: 0, h: 0, cx: 0, cy: 0, s: 0, elegido: null, indice: [], resultados: [], activo: -1, ultimaEnLinea: 0, pendiente: false };
const mapaPunteros = new Map();
let mapaDatosPromesa = null;
let mapaArrastre = null;

const mapaEl = (id) => document.getElementById(id);
const mapaNorm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mapaLimitar = (v, a, b) => Math.min(b, Math.max(a, v));

// ───── Carga de datos (una sola vez) ─────
function cargarDatosMapa() {
  if (typeof MAPA_COSTAS_DET !== "undefined") return Promise.resolve();
  mapaDatosPromesa ??= new Promise((ok, fallo) => {
    const s = document.createElement("script");
    s.src = MAPA_SEL.archivoDatos;
    s.onload = ok;
    s.onerror = () => { mapaDatosPromesa = null; fallo(new Error("datos del mapa")); };
    document.head.append(s);
  });
  return mapaDatosPromesa;
}

// ───── Vista ─────
function mapaAjustarVista() {
  const sMin = Math.min(mapa.w / 360, mapa.h / 180);
  mapa.s = mapaLimitar(mapa.s, sMin, MAPA_SEL.zoomMax);
  const hw = mapa.w / (2 * mapa.s), hh = mapa.h / (2 * mapa.s);
  mapa.cx = hw >= 180 ? 0 : mapaLimitar(mapa.cx, -180 + hw, 180 - hw);
  mapa.cy = hh >= 90 ? 0 : mapaLimitar(mapa.cy, -90 + hh, 90 - hh);
}

function mapaAplicarVista() {
  mapaAjustarVista();
  const { w, h, cx, cy, s } = mapa;
  mapaEl("mapa-svg").setAttribute("viewBox", `${cx - w / (2 * s)} ${cy - h / (2 * s)} ${w / s} ${h / s}`);
  if (!mapa.pendiente) {
    mapa.pendiente = true;
    requestAnimationFrame(() => { mapa.pendiente = false; mapaDibujarEtiquetas(); });
  }
}

// píxel del visor → [latitud, longitud]
function mapaCoordenadas(px, py) {
  const lon = mapa.cx + (px - mapa.w / 2) / mapa.s;
  const lat = -(mapa.cy + (py - mapa.h / 2) / mapa.s);
  return [mapaLimitar(lat, -90, 90), mapaLimitar(lon, -180, 180)];
}

function mapaZoomEn(px, py, factor) {
  const lonA = mapa.cx + (px - mapa.w / 2) / mapa.s;
  const yA = mapa.cy + (py - mapa.h / 2) / mapa.s;
  mapa.s *= factor;
  mapaAjustarVista(); // s definitivo antes de recolocar el centro
  mapa.cx = lonA - (px - mapa.w / 2) / mapa.s;
  mapa.cy = yA - (py - mapa.h / 2) / mapa.s;
  mapaAplicarVista();
}

function mapaIrA(lat, lon, s) {
  mapa.cx = lon; mapa.cy = -lat; mapa.s = s;
  mapaAplicarVista();
}

// ───── Dibujo ─────
function mapaCrearBase() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = mapaEl("mapa-svg");
  svg.replaceChildren();
  // Un salto de más de 180° de longitud es una costura en el antimeridiano (p. ej. Rusia): se corta la línea ahí en vez de cruzar todo el mapa.
  const trazo = (anillo, cerrar) => anillo.map(([x, y], i) => `${i === 0 || Math.abs(x - anillo[i - 1][0]) > 180 ? "M" : "L"}${x} ${-y}`).join("") + (cerrar ? "Z" : "");
  const tierra = document.createElementNS(ns, "path");
  tierra.setAttribute("class", "mapa-tierra");
  tierra.setAttribute("d", MAPA_COSTAS_DET.map((a) => trazo(a, true)).join(""));
  const fronteras = document.createElementNS(ns, "path");
  fronteras.setAttribute("class", "mapa-fronteras");
  fronteras.setAttribute("d", MAPA_FRONTERAS.map((a) => trazo(a, false)).join(""));
  const etiquetas = document.createElementNS(ns, "g"); etiquetas.id = "mapa-etiquetas";
  const marcas = document.createElementNS(ns, "g"); marcas.id = "mapa-marcas";
  svg.append(tierra, fronteras, etiquetas, marcas);
}

function mapaNodo(nombre, atributos, texto) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  for (const k in atributos) e.setAttribute(k, atributos[k]);
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// Países (alejado) y ciudades por población, sin que se pisen las etiquetas. Todo en píxeles de pantalla.
function mapaDibujarEtiquetas() {
  const g = mapaEl("mapa-etiquetas");
  if (!g || !mapa.listo) return;
  const { w, h, cx, cy, s } = mapa;
  const u = 1 / s, fs = MAPA_SEL.tamanoEtiqueta;
  const px = (lon) => (lon - cx) * s + w / 2, py = (lat) => (-lat - cy) * s + h / 2;
  const ocupadas = [];
  const libre = (x, y, ancho) => {
    const c = { x1: x - 3, x2: x + ancho + 3, y1: y - fs, y2: y + 3 };
    if (ocupadas.some((o) => c.x1 < o.x2 && c.x2 > o.x1 && c.y1 < o.y2 && c.y2 > o.y1)) return false;
    ocupadas.push(c); return true;
  };
  const nodos = [];
  let n = 0;
  const poner = (nombre, lat, lon, clase, punto) => {
    const x = px(lon), y = py(lat);
    if (x < 0 || x > w || y < 0 || y > h) return;
    const ancho = nombre.length * fs * 0.58;
    const xt = punto ? x + 5 : x - ancho / 2;
    if (!libre(xt, y, ancho) || n >= MAPA_SEL.maxEtiquetas) return;
    n++;
    if (punto) nodos.push(mapaNodo("circle", { class: punto, cx: lon, cy: -lat, r: 2.6 * u }));
    nodos.push(mapaNodo("text", { class: clase, x: punto ? lon + 5 * u : lon - ancho / 2 * u, y: -lat + 3.5 * u, "font-size": fs * u, "stroke-width": 3 * u }, nombre));
  };
  if (s < 9) MAPA_PAISES.forEach(([nombre, lat, lon]) => poner(nombreMapa(nombre), lat, lon, "mapa-etq-pais", null));
  if (s >= 3.5) for (const [nombre, , lat, lon, capital] of MAPA_CIUDADES) poner(nombreMapa(nombre), lat, lon, "mapa-etq", capital ? "mapa-capital" : "mapa-ciudad");
  g.replaceChildren(...nodos);
  mapaDibujarMarcas();
}

function mapaDibujarMarcas() {
  const g = mapaEl("mapa-marcas");
  if (!g) return;
  const u = 1 / mapa.s, nodos = [];
  if (typeof ubicacion !== "undefined" && ubicacion.latitud !== null)
    nodos.push(mapaNodo("circle", { class: "mapa-actual", cx: ubicacion.longitud, cy: -ubicacion.latitud, r: 7 * u }));
  if (mapa.elegido) {
    const [lat, lon] = mapa.elegido;
    nodos.push(mapaNodo("circle", { class: "mapa-marcador", cx: lon, cy: -lat, r: 6 * u }));
  }
  g.replaceChildren(...nodos);
}

// ───── Elegir un punto ─────
function mapaElegir(lat, lon) {
  mapa.elegido = [lat, lon];
  mapaEl("input-latitud").value = lat.toFixed(4);
  mapaEl("input-longitud").value = lon.toFixed(4);
  mapaEl("mapa-estado").textContent = textoMapaSel("elegido", lat.toFixed(4), lon.toFixed(4));
  mapaDibujarMarcas();
}

// Si el usuario escribe las coordenadas a mano, el marcador las sigue
function mapaSeguirCampos() {
  const lat = parseFloat(mapaEl("input-latitud").value), lon = parseFloat(mapaEl("input-longitud").value);
  mapa.elegido = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
  mapaDibujarMarcas();
}

// ───── Gestos ─────
function mapaPosicion(e) {
  const r = mapaEl("mapa-visor").getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function mapaIniciarGestos() {
  const visor = mapaEl("mapa-visor");
  visor.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".mapa-zoom")) return;
    visor.setPointerCapture(e.pointerId);
    mapaPunteros.set(e.pointerId, [e.clientX, e.clientY]);
    mapaArrastre = mapaPunteros.size === 1 ? { x: e.clientX, y: e.clientY, movido: false } : { ...(mapaArrastre || {}), movido: true };
    visor.focus({ preventScroll: true });
  });
  visor.addEventListener("pointermove", (e) => {
    const previo = mapaPunteros.get(e.pointerId);
    if (!previo) return;
    mapaPunteros.set(e.pointerId, [e.clientX, e.clientY]);
    if (mapaPunteros.size === 1) {
      if (!mapaArrastre.movido && Math.hypot(e.clientX - mapaArrastre.x, e.clientY - mapaArrastre.y) < MAPA_SEL.umbralClic) return;
      mapaArrastre.movido = true;
      mapa.cx -= (e.clientX - previo[0]) / mapa.s;
      mapa.cy -= (e.clientY - previo[1]) / mapa.s;
      mapaAplicarVista();
    } else if (mapaPunteros.size === 2) {
      // pellizco: la distancia entre los dedos cambia el zoom y su punto medio mueve el mapa
      const otro = [...mapaPunteros].find(([id]) => id !== e.pointerId)[1];
      const antes = Math.hypot(previo[0] - otro[0], previo[1] - otro[1]);
      const ahora = Math.hypot(e.clientX - otro[0], e.clientY - otro[1]);
      const r = visor.getBoundingClientRect();
      const mx = (e.clientX + otro[0]) / 2 - r.left, my = (e.clientY + otro[1]) / 2 - r.top;
      mapa.cx -= (e.clientX - previo[0]) / 2 / mapa.s;
      mapa.cy -= (e.clientY - previo[1]) / 2 / mapa.s;
      if (antes > 0) mapaZoomEn(mx, my, ahora / antes); else mapaAplicarVista();
    }
  });
  const soltar = (e) => {
    if (!mapaPunteros.has(e.pointerId)) return;
    const fueClic = mapaPunteros.size === 1 && mapaArrastre && !mapaArrastre.movido && e.type === "pointerup";
    mapaPunteros.delete(e.pointerId);
    if (fueClic) mapaElegir(...mapaCoordenadas(...mapaPosicion(e)));
    if (mapaPunteros.size === 0) mapaArrastre = null;
  };
  visor.addEventListener("pointerup", soltar);
  visor.addEventListener("pointercancel", soltar);
  visor.addEventListener("wheel", (e) => {
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    mapaZoomEn(...mapaPosicion(e), Math.exp(-d * 0.0015));
  }, { passive: false });
  visor.addEventListener("keydown", (e) => {
    const paso = 60 / mapa.s;
    const acciones = {
      ArrowLeft: () => (mapa.cx -= paso), ArrowRight: () => (mapa.cx += paso),
      ArrowUp: () => (mapa.cy -= paso), ArrowDown: () => (mapa.cy += paso),
      "+": () => (mapa.s *= 1.4), "=": () => (mapa.s *= 1.4), "-": () => (mapa.s /= 1.4),
      Enter: () => mapaElegir(-mapa.cy, mapa.cx), // el centro del mapa
    };
    if (!acciones[e.key]) return;
    e.preventDefault();
    acciones[e.key]();
    mapaAplicarVista();
  });
  mapaEl("mapa-mas").addEventListener("click", () => mapaZoomEn(mapa.w / 2, mapa.h / 2, 1.6));
  mapaEl("mapa-menos").addEventListener("click", () => mapaZoomEn(mapa.w / 2, mapa.h / 2, 1 / 1.6));
}

// ───── Búsqueda (local y en línea) ─────
// Al cambiar de idioma: el subtítulo "país" del índice y la lista abierta se reescriben; el mensaje de estado se actualiza si es el de la elección de punto
document.addEventListener("cambio-idioma", () => {
  if (!mapa.listo) return;
  mapaConstruirIndice();
  const ul = mapaEl("mapa-resultados"), campo = mapaEl("mapa-buscar");
  if (ul && !ul.hidden && campo) { const t = campo.value.trim(); mapaMostrarLista(mapaBuscarLocal(t), t.length >= 3 ? t : null); }
  if (mapa.elegido && mapaEl("mapa-estado").textContent.includes("°, ")) mapaEl("mapa-estado").textContent = textoMapaSel("elegido", mapa.elegido[0].toFixed(4), mapa.elegido[1].toFixed(4));
});

function mapaConstruirIndice() {
  mapa.indice = [
    ...MAPA_PAISES.map(([n, lat, lon]) => ({ n: nombreMapa(n), sub: textoMapaSel("pais"), nn: mapaNorm(n + " " + nombreMapa(n)), lat, lon, s: 7, pais: true, pob: 1e9 })),
    ...MAPA_CIUDADES.map(([n, p, lat, lon, , pob]) => ({ n: nombreMapa(n), sub: nombreMapa(p), nn: mapaNorm(n + " " + nombreMapa(n)), lat, lon, s: 40, pais: false, pob })),
  ];
}

function mapaBuscarLocal(texto) {
  const q = mapaNorm(texto.trim());
  if (q.length < 2) return [];
  const rango = (e) => (e.nn.startsWith(q) ? 0 : e.nn.includes(" " + q) ? 1 : e.nn.includes(q) ? 2 : 9);
  return mapa.indice.map((e) => [rango(e), e]).filter(([r]) => r < 9)
    .sort((a, b) => a[0] - b[0] || b[1].pais - a[1].pais || b[1].pob - a[1].pob)
    .slice(0, 8).map(([, e]) => e);
}

async function mapaBuscarEnLinea(texto) {
  const espera = MAPA_SEL.pausaEnLineaMs - (Date.now() - mapa.ultimaEnLinea);
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  mapa.ultimaEnLinea = Date.now();
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=${idiomaActual()}&q=${encodeURIComponent(texto)}`);
  if (!r.ok) throw new Error("Nominatim " + r.status);
  return (await r.json()).map((d) => {
    const [sur, norte, oeste, este] = (d.boundingbox || []).map(Number);
    const ancho = Math.max(este - oeste, 0.02), alto = Math.max(norte - sur, 0.02);
    return { n: d.display_name, sub: "", lat: +d.lat, lon: +d.lon, s: mapaLimitar(Math.min(mapa.w / ancho, mapa.h / alto) * 0.7, 3, 80) };
  });
}

function mapaMostrarLista(items, textoEnLinea) {
  const ul = mapaEl("mapa-resultados");
  mapa.resultados = items; mapa.activo = -1;
  ul.replaceChildren(...items.map((e, i) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.i = i;
    li.append(e.n);
    if (e.sub) { const m = document.createElement("small"); m.textContent = " · " + e.sub; li.append(m); }
    return li;
  }));
  if (textoEnLinea) {
    const li = document.createElement("li");
    li.className = "mapa-en-linea"; li.dataset.enlinea = "1"; li.setAttribute("role", "option");
    li.textContent = textoMapaSel("enLinea", textoEnLinea);
    ul.append(li);
  }
  ul.hidden = ul.children.length === 0;
}

function mapaSeleccionarResultado(e) {
  mapaEl("mapa-resultados").hidden = true;
  mapaEl("mapa-buscar").value = e.n.split(",")[0];
  mapaIrA(e.lat, e.lon, e.s);
  mapaElegir(e.lat, e.lon);
}

async function mapaEjecutarEnLinea() {
  const texto = mapaEl("mapa-buscar").value.trim();
  if (texto.length < 3) return;
  const estado = mapaEl("mapa-estado");
  estado.textContent = "Buscando en línea…";
  try {
    const items = await mapaBuscarEnLinea(texto);
    estado.textContent = items.length ? "" : "Sin resultados en línea.";
    mapaMostrarLista(items, null);
  } catch (e) {
    estado.textContent = "No se pudo buscar en línea. Revisa tu conexión.";
  }
}

function mapaIniciarBusqueda() {
  const campo = mapaEl("mapa-buscar"), ul = mapaEl("mapa-resultados");
  campo.addEventListener("input", () => {
    const t = campo.value.trim();
    mapaMostrarLista(mapaBuscarLocal(t), t.length >= 3 ? t : null);
  });
  campo.addEventListener("keydown", (e) => {
    const filas = [...ul.children];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!filas.length) return;
      e.preventDefault();
      mapa.activo = (mapa.activo + (e.key === "ArrowDown" ? 1 : -1) + filas.length) % filas.length;
      filas.forEach((f, i) => f.setAttribute("aria-selected", i === mapa.activo));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const fila = filas[mapa.activo >= 0 ? mapa.activo : 0];
      if (!fila) mapaEjecutarEnLinea();
      else if (fila.dataset.enlinea) mapaEjecutarEnLinea();
      else mapaSeleccionarResultado(mapa.resultados[+fila.dataset.i]);
    } else if (e.key === "Escape") ul.hidden = true;
  });
  ul.addEventListener("click", (e) => {
    const fila = e.target.closest("li");
    if (!fila) return;
    if (fila.dataset.enlinea) mapaEjecutarEnLinea(); else mapaSeleccionarResultado(mapa.resultados[+fila.dataset.i]);
  });
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".mapa-busqueda")) ul.hidden = true; });
}

// ───── Arranque: al abrir el panel por primera vez ─────
async function mapaAbrir() {
  const visor = mapaEl("mapa-visor"), estado = mapaEl("mapa-estado");
  if (mapa.listo) { mapaMedir(); return; }
  estado.textContent = "Cargando mapa…";
  try { await cargarDatosMapa(); } catch (e) {
    estado.textContent = "No se pudo cargar el mapa. Puedes escribir las coordenadas.";
    return;
  }
  mapaConstruirIndice();
  mapaCrearBase();
  mapa.listo = true;
  mapaMedir();
  if (typeof ubicacion !== "undefined" && ubicacion.latitud !== null) mapaIrA(ubicacion.latitud, ubicacion.longitud, 8);
  else { mapa.s = 0; mapaAplicarVista(); }
  mapaSeguirCampos();
  estado.textContent = "";
  new ResizeObserver(mapaMedir).observe(visor);
}

function mapaMedir() {
  const r = mapaEl("mapa-visor").getBoundingClientRect();
  if (!r.width) return; // panel oculto
  mapa.w = r.width; mapa.h = r.height;
  mapaAplicarVista();
}

// Tras "Mi ubicación": cuando llega la posición del dispositivo, el mapa se centra en ella
function mapaCentrarEnActual() {
  if (!mapa.listo || typeof ubicacion === "undefined" || ubicacion.latitud === null) return;
  mapaIrA(ubicacion.latitud, ubicacion.longitud, 20);
}

function inicializarMapaSelector() {
  const panel = mapaEl("panel-geolocalizacion");
  if (!panel || !mapaEl("mapa-visor")) return;
  if (typeof mostrarUbicacion === "function") { // viajero.js lo busca por nombre al hacer clic, así que el envoltorio se usa
    const original = mostrarUbicacion;
    window.mostrarUbicacion = function () { const r = original.apply(this, arguments); mapaCentrarEnActual(); return r; };
  }
  mapaIniciarGestos();
  mapaIniciarBusqueda();
  ["input-latitud", "input-longitud"].forEach((id) => mapaEl(id).addEventListener("input", mapaSeguirCampos));
  mapaEl("boton-ubicacion-real").addEventListener("click", () => setTimeout(mapaSeguirCampos, 0)); // vacía los campos → quita el marcador
  mapaEl("boton-ir-ubicacion").addEventListener("click", () => setTimeout(mapaDibujarMarcas, 0));    // actualiza el anillo de "ubicación activa"
  // El panel manda: "mapa-abierto" (que corre el reloj) se pone y se quita según la clase "abierto" del panel, sin depender de paneles-laterales.js
  const contenedor = document.getElementById("contenedor-app");
  new MutationObserver(() => {
    const abierto = panel.classList.contains("abierto");
    contenedor?.classList.toggle("mapa-abierto", abierto);
    if (abierto) mapaAbrir();
  })
    .observe(panel, { attributes: true, attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", inicializarMapaSelector);
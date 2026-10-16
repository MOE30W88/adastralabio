// scripts/evento-detalle.js
// Viñeta de detalle de un próximo evento: se abre al pulsar un evento del carrusel.
// Muestra icono, título, cuenta regresiva (con el reloj de la app, no el del sistema), fecha y hora, nota, visibilidad y "ver en reloj ▶".
// "Ver en reloj" fija fecha, hora y posición del evento y pone el tiempo en pausa; "⟲ Volver" devuelve la hora real y tu ubicación.
// También refresca el carrusel cuando el reloj de la app cambia de hora (actualizarEventosSegunReloj, llamada desde main.js).
// Depende de: evento-detalle.js (propio), infografias.js / eventos-carrusel.js (colocarIconoEvento, renderizarEventosProximos, renderizarGaleria), eventos-datos.js, estado-tiempo.js,
//             ubicacion.js (ubicacion, establecerUbicacionManual), eclipses.js (condicionesSolares), eclipse-vista.js (geometriaVistaLunar)

const EVD_HORA_MS = 3600000;
const EVD_SEGUNDOS_POR_EVENTO = 2.5; // velocidad del carrusel: más segundos = más lento
const EVD_ETIQUETA = { si: "Sí", regular: "Regular", no: "No", reloj: "En el reloj" };

const TEXTOS_EVD = {
  es: {
    ahora: "ahora", en: (t) => `en ${t}`, hace: (t) => `hace ${t}`,
    min: (n) => `${n} min`, h: (n) => `${n} h`, d: (n) => `${n} d`, meses: (n) => `${n} meses`, anios: (n) => `${n} años`,
    detalle: "Detalle del evento", cerrar: "Cerrar", visibilidad: "Visibilidad desde tu ubicación", noAplica: "No aplica",
    verEnReloj: "ver en reloj ▶", mejorLugar: "ir al mejor lugar ▶", volver: "⟲ Volver",
  },
  en: {
    ahora: "now", en: (t) => `in ${t}`, hace: (t) => `${t} ago`,
    min: (n) => `${n} min`, h: (n) => `${n} h`, d: (n) => `${n} d`, meses: (n) => `${n} ${n === 1 ? "month" : "months"}`, anios: (n) => `${n} ${n === 1 ? "year" : "years"}`,
    detalle: "Event details", cerrar: "Close", visibilidad: "Visibility from your location", noAplica: "Not applicable",
    verEnReloj: "view on clock ▶", mejorLugar: "go to the best place ▶", volver: "⟲ Back",
  },
};
const textoEvd = (clave, ...args) => textoDe(TEXTOS_EVD, clave, ...args);

let evdEventos = new Map();   // id → evento del carrusel
let evdAbierto = null;        // id del evento con la viñeta abierta
let evdRespaldo = null;       // lugar previo mientras se "ve en el reloj"

function evdCuenta(ms, ahoraMs) {
  const d = ms - ahoraMs, a = Math.abs(d), min = Math.round(a / 60000);
  if (a < 30 * 60000) return textoEvd("ahora");
  const txt = min < 60 ? textoEvd("min", min) : a < 48 * EVD_HORA_MS ? textoEvd("h", Math.round(a / EVD_HORA_MS)) : a < 60 * 86400000 ? textoEvd("d", Math.round(a / 86400000)) : a < 2 * 365 * 86400000 ? textoEvd("meses", Math.round(a / 2629800000)) : textoEvd("anios", Math.round(a / 31557600000));
  return d > 0 ? textoEvd("en", txt) : textoEvd("hace", txt);
}

// Gancho que llama evento-detalle.js / infografias.js al crear cada evento del carrusel
function decorarEventoTicker(nodo, evento) {
  nodo.dataset.id = evento.id;
  evdEventos.set(evento.id, evento);
  const cuenta = document.createElement("span");
  cuenta.className = "evento-ticker-cuenta";
  nodo.appendChild(cuenta);
  nodo.addEventListener("click", (ev) => { ev.preventDefault(); evdAbrir(evento.id, nodo); });
}

// Velocidad del carrusel: segundos por vuelta = eventos × EVD_SEGUNDOS_POR_EVENTO. Va con !important para ganar a cualquier regla de css/ y se reaplica cada segundo,
// así no depende de lo que escriba infografias.js.
function evdAjustarVelocidad() {
  const pista = document.getElementById("eventos-pista");
  if (!pista || !pista.classList.contains("hay-eventos")) return;
  const n = [...pista.children].filter((el) => el.classList.contains("evento-ticker-item")).length;
  const valor = `${Math.max(40, n * EVD_SEGUNDOS_POR_EVENTO)}s`;
  if (pista.style.getPropertyValue("animation-duration") !== valor || pista.style.getPropertyPriority("animation-duration") !== "important") pista.style.setProperty("animation-duration", valor, "important");
}

function evdActualizarCuentas() {
  evdAjustarVelocidad();
  const ahora = obtenerFechaActual().getTime();
  document.querySelectorAll(".evento-ticker-item[data-id]").forEach((nodo) => {
    const ev = evdEventos.get(nodo.dataset.id), el = nodo.querySelector(".evento-ticker-cuenta"), t = ev ? evdCuenta(ev._evento.maximo, ahora) : "";
    if (el && el.textContent !== t) el.textContent = t;
  });
  const det = document.getElementById("evento-detalle");
  if (det && !det.hidden && evdAbierto && evdEventos.get(evdAbierto)) det.querySelector(".ed-cuenta").textContent = evdCuenta(evdEventos.get(evdAbierto)._evento.maximo, ahora);
}

// ───── Viñeta ─────
function evdCrear() {
  let det = document.getElementById("evento-detalle");
  if (det) return det;
  det = document.createElement("div");
  det.id = "evento-detalle";
  det.setAttribute("role", "dialog");
  det.setAttribute("aria-label", textoEvd("detalle"));
  det.hidden = true;
  det.innerHTML = `<button type="button" class="ed-cerrar" aria-label="${textoEvd("cerrar")}">×</button>
    <div class="ed-cab"><span class="evento-icono ed-icono"><span class="evento-icono-fallback">✦</span></span>
      <div><h3 class="ed-titulo"></h3><p class="ed-cuenta"></p></div></div>
    <p class="ed-fecha"></p><p class="ed-nota"></p>
    <p class="ed-vis"><span class="ed-vis-etq">${textoEvd("visibilidad")}</span><strong class="ed-vis-val"></strong></p>
    <button type="button" class="ed-ver">${textoEvd("verEnReloj")}</button>
    <button type="button" class="ed-mejor" hidden>${textoEvd("mejorLugar")}</button>`;
  document.body.appendChild(det);
  document.addEventListener("cambio-idioma", () => { // los textos fijos se reescriben; la viñeta abierta se cierra (su título y fecha son del idioma anterior)
    det.setAttribute("aria-label", textoEvd("detalle"));
    det.querySelector(".ed-cerrar").setAttribute("aria-label", textoEvd("cerrar"));
    det.querySelector(".ed-vis-etq").textContent = textoEvd("visibilidad");
    det.querySelector(".ed-ver").textContent = textoEvd("verEnReloj");
    det.querySelector(".ed-mejor").textContent = textoEvd("mejorLugar");
    evdCerrar();
  });
  det.querySelector(".ed-cerrar").addEventListener("click", evdCerrar);
  det.querySelector(".ed-ver").addEventListener("click", () => { const ev = evdEventos.get(evdAbierto); if (ev) { evdCerrar(); evdVerEnReloj(ev); } });
  det.querySelector(".ed-mejor").addEventListener("click", () => { const ev = evdEventos.get(evdAbierto); if (ev) { evdCerrar(); evdVerEnReloj(ev, true); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") evdCerrar(); });
  document.addEventListener("pointerdown", (e) => { if (evdAbierto && !det.contains(e.target) && !e.target.closest(".evento-ticker-item")) evdCerrar(); });
  return det;
}

function evdAbrir(id, nodo) {
  const ev = evdEventos.get(id), det = evdCrear();
  if (!ev) return;
  evdAbierto = id;
  det.querySelector(".ed-titulo").textContent = ev.titulo;
  det.querySelector(".ed-fecha").textContent = ev.fecha;
  det.querySelector(".ed-nota").textContent = ev.alcance || "";
  det.querySelector(".ed-nota").hidden = !ev.alcance;
  const vis = ev.visibilidad || { estado: null, texto: textoEvd("noAplica") }, val = det.querySelector(".ed-vis-val");
  val.textContent = vis.texto; val.dataset.estado = vis.estado || "";
  // "Mejor lugar": solo si el evento no se ve (bien) desde aquí y existe un lugar mejor (evento-mejor-lugar.js)
  const mejor = det.querySelector(".ed-mejor");
  mejor.hidden = !(["no", "regular"].includes(vis.estado) && typeof evdMejorLugar === "function" && evdMejorLugar(ev._evento));
  const icono = det.querySelector(".ed-icono");
  icono.classList.remove("con-icono"); icono.style.removeProperty("--icono");
  colocarIconoEvento(icono, ev.icono);
  det.hidden = false;
  evdActualizarCuentas();
  const r = nodo.getBoundingClientRect(), w = det.offsetWidth, h = det.offsetHeight;
  det.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  det.style.top = `${r.bottom + h + 12 > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8}px`;
  document.getElementById("eventos-pista").classList.add("eventos-pausados");
}

function evdCerrar() {
  const det = document.getElementById("evento-detalle");
  if (!det || det.hidden) return;
  det.hidden = true; evdAbierto = null;
  const pista = document.getElementById("eventos-pista");
  if (!pista.dataset.pausaUsuario) pista.classList.remove("eventos-pausados"); // si el usuario lo pausó con ❚❚, sigue pausado
}

// ───── Ver en reloj ─────
// Mejor punto de la Tierra para f(lat, lon): rejilla de 10° y refinado local
function evdMejorPunto(f) {
  let mejor = { v: -Infinity, lat: 0, lon: 0 };
  const probar = (lat, lon) => { const v = f(lat, lon); if (v > mejor.v) mejor = { v, lat, lon }; };
  for (let lat = -80; lat <= 80; lat += 10) for (let lon = -180; lon < 180; lon += 10) probar(lat, lon);
  for (let paso = 5; paso > 0.1; paso /= 2) {
    let movido = true;
    while (movido) { const { lat, lon } = mejor, v0 = mejor.v; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) probar(Math.max(-90, Math.min(90, lat + a * paso)), lon + b * paso); movido = mejor.v > v0; }
  }
  return { lat: mejor.lat, lon: ((mejor.lon + 540) % 360) - 180 };
}

// Dónde y cuándo mirar: eclipse solar → punto de máximo; eclipse lunar → punto bajo la Luna; el resto → tu lugar.
// Lluvias: 02:00 solar local más cercano al pico; oposiciones: medianoche solar local (el planeta culmina).
function evdVista(e) {
  const hayLugar = typeof ubicacion.latitud === "number" && typeof ubicacion.longitud === "number";
  let ms = e.maximo, punto = hayLugar ? { lat: ubicacion.latitud, lon: ubicacion.longitud } : null;
  if (e.eclipse && e.eclipse.tipo === "solar") punto = evdMejorPunto((lat, lon) => -condicionesSolares(ms, lat, lon).separacion);
  else if (e.eclipse) punto = evdMejorPunto((lat, lon) => geometriaVistaLunar(ms, lat, lon).alturaLuna);
  const horaObjetivo = (e.tipo || "").startsWith("lluvia-") ? 2 : (e.tipo || "").startsWith("oposicion-") ? 0 : null;
  if (horaObjetivo !== null && punto) {
    const solar = (((ms / EVD_HORA_MS + punto.lon / 15) % 24) + 24) % 24;
    ms += ((((horaObjetivo - solar + 36) % 24) - 12)) * EVD_HORA_MS;
  }
  return { ms, punto };
}

// Capa del menú que mejor muestra cada tipo de evento
function evdCapaDelEvento(e) {
  const t = e.tipo || "";
  if (e.eclipse) return "dia-noche";
  if (/^(lluvia|cometa|oposicion|elongacion|alineacion)/.test(t)) return "sistema-solar";
  if (/^(estacion|anio-nuevo)/.test(t)) return "calendario";
  return "lunario"; // superluna, microluna, luna azul/negra/cosecha, mareas vivas
}
let evdClicInterno = false, evdPastillaOn = false, evdRelojVisible = true;
const evdBotonCapa = (clave) => document.querySelector(`.nav-capas button[data-enfoque="${clave}"]`);
function evdClicCapa(clave) { evdClicInterno = true; evdBotonCapa(clave)?.click(); evdClicInterno = false; }

// La pastilla solo se ve mientras se muestra el evento: se oculta al cambiar de capa a mano o al alejarse del reloj
function evdSincronizarPastilla() {
  if (evdPastillaOn) evdPastilla().hidden = !evdRelojVisible;
  else document.getElementById("evento-en-reloj")?.setAttribute("hidden", "");
}
document.querySelectorAll(".nav-capas button").forEach((b) => b.addEventListener("click", () => {
  if (evdClicInterno || !evdPastillaOn) return;
  evdPastillaOn = false; // cambio de capa manual: se abandona la vista del evento (el botón "Ahora" sigue restaurando el lugar)
  if (evdRespaldo) evdRespaldo.capa = null;
  evdSincronizarPastilla();
}));
const evdSvgReloj = document.getElementById("reloj");
if (evdSvgReloj && "IntersectionObserver" in window) {
  new IntersectionObserver(([en]) => { evdRelojVisible = en.isIntersecting; evdSincronizarPastilla(); }, { threshold: 0.15 }).observe(evdSvgReloj);
}

function evdVerEnReloj(evento, mejorLugar = false) {
  const { ms, punto } = (mejorLugar && evdMejorLugar(evento._evento)) || evdVista(evento._evento);
  if (!evdRespaldo) evdRespaldo = { lat: ubicacion.latitud, lon: ubicacion.longitud, manual: ubicacion.esManual, capa: document.querySelector(".nav-capas button.activa")?.dataset.enfoque, trayectorias: trayectoriasActivas?.() };
  evdClicCapa(evdCapaDelEvento(evento._evento)); // enfoca la capa adecuada
  if (typeof establecerTrayectorias === "function") establecerTrayectorias(/^(lluvia|cometa)/.test(evento._evento.tipo)); // órbitas solo para lluvias y cometas
  if (punto) establecerUbicacionManual(punto.lat, punto.lon);
  establecerFechaViajero(new Date(ms));
  if (typeof pausarControlesVelocidad === "function") pausarControlesVelocidad(); else establecerMultiplicador(0); // velocidad.js: congela y muestra ❚❚
  evdPastilla().querySelector(".ep-texto").textContent = evento.titulo;
  evdPastillaOn = true;
  evdSincronizarPastilla();
  document.getElementById("reloj")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function evdPastilla() {
  let p = document.getElementById("evento-en-reloj");
  if (p) return p;
  p = document.createElement("div");
  p.id = "evento-en-reloj";
  p.hidden = true;
  p.innerHTML = `<span class="ep-texto"></span><button type="button" class="ep-volver">${textoEvd("volver")}</button>`;
  document.body.appendChild(p);
  document.addEventListener("cambio-idioma", () => { p.querySelector(".ep-volver").textContent = textoEvd("volver"); });
  p.querySelector(".ep-volver").addEventListener("click", () => document.getElementById("boton-ahora").click());
  return p;
}

// Se ejecuta con cualquier "Ahora" (el del viajero o el de la pastilla): devuelve tu lugar
function evdRestaurar() {
  evdPastillaOn = false;
  evdSincronizarPastilla();
  if (!evdRespaldo) return;
  const r = evdRespaldo; evdRespaldo = null;
  if (r.capa) evdClicCapa(r.capa);
  if (typeof establecerTrayectorias === "function") establecerTrayectorias(Boolean(r.trayectorias));
  if (typeof r.lat === "number") { establecerUbicacionManual(r.lat, r.lon); ubicacion.esManual = r.manual; }
}
document.getElementById("boton-ahora")?.addEventListener("click", evdRestaurar);

// ───── El carrusel sigue al reloj de la app ─────
// Cada hora del reloj (como máximo una vez cada 3 s reales) recalcula la lista; solo se redibuja si cambió, para no reiniciar la cinta.
const evdReloj = { hora: null, firma: null, ultimo: 0 };
function actualizarEventosSegunReloj(ahora) {
  const h = Math.floor(ahora.getTime() / EVD_HORA_MS), t = performance.now();
  if (h === evdReloj.hora || t - evdReloj.ultimo < 3000) return;
  evdReloj.hora = h; evdReloj.ultimo = t;
  const lista = obtenerEventosProximos(), firma = lista.map((e) => e.id).join("|");
  if (evdReloj.firma !== null && firma !== evdReloj.firma) { renderizarEventosProximos(lista); renderizarGaleria(lista); }
  evdReloj.firma = firma;
}
setInterval(evdActualizarCuentas, 1000);
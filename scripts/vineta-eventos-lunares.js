// scripts/vineta-eventos-lunares.js
// Viñeta con mini animación para los eventos lunares (superluna, microluna, luna azul, luna negra, luna de la cosecha y mareas vivas
// extremas). Usa la misma tarjeta que el eclipse (clases .etiqueta-eclipse de css/eclipse.css) y se apila encima de ella si coinciden.
// Solo se ve mientras el evento está en curso según el cálculo (±24 h del instante exacto; ±36 h en mareas vivas).
// Depende de: eventos-lunares.js (eventosLunares, fasesLunares, textoEventoLunar), lunario.js (lunMareas, LUNARIO_MAREAS),
//             efemerides-precisas.js, eclipse-lupa.js (estadoEclipseActual, elementosEclipse; opcional)

const VINETA_LUNAR = {
  ventanaHoras: { "luna-azul": 24, "luna-negra": 24, "luna-cosecha": 24, superluna: 24, microluna: 24, "mareas-vivas": 36 },
  prioridad: ["luna-azul", "luna-negra", "luna-cosecha", "superluna", "microluna", "mareas-vivas"],
  recalcularCadaMs: 400,
  exageracionTamano: 3,     // la diferencia de tamaño de la superluna/microluna se amplía ×3 en el dibujo
  exageracionMarea: 0.45,   // deformación visual del agua en la viñeta de mareas
  horizonteLuna: -0.83,     // altura (°) del centro de la Luna en su salida
};

const TEXTOS_VINETAS = {
  es: {
    tamano: (km, pct) => `A ${km} km · ${pct >= 0 ? "+" : ""}${pct} % de tamaño`,
    avisoTamano: "Diferencia ampliada ×3 en el dibujo",
    azul: "Segunda luna llena del mes",
    negra: "Segunda luna nueva del mes",
    cosechaRetraso: (min) => `Sale ${min} min más tarde cada noche`,
    cosechaPromedio: "El promedio de la Luna es de ~50 min",
    cosechaSinLugar: "La luna llena más cercana al equinoccio",
    cosechaLatitud: "El efecto es más notable en latitudes medias y altas",
    mareas: (p) => `Fuerza de marea ${p} %`,
    avisoMareas: "Las mareas reales llegan 1 o 2 días después",
    exactoAhora: "Instante exacto ahora",
    exactoEn: (t) => `Instante exacto en ${t}`,
    exactoHace: (t) => `Instante exacto hace ${t}`,
    ayer: "ayer", hoy: "hoy", manana: "mañana",
    meses: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  },
  en: {
    tamano: (km, pct) => `${km} km · ${pct >= 0 ? "+" : ""}${pct} % in size`,
    avisoTamano: "Difference enlarged ×3 in the drawing",
    azul: "Second full moon of the month",
    negra: "Second new moon of the month",
    cosechaRetraso: (min) => `Rises ${min} min later each night`,
    cosechaPromedio: "The Moon's average is ~50 min",
    cosechaSinLugar: "The full moon closest to the equinox",
    cosechaLatitud: "The effect is most noticeable at mid and high latitudes",
    mareas: (p) => `Tidal force ${p} %`,
    avisoMareas: "Real tides arrive 1 or 2 days later",
    exactoAhora: "Exact moment now",
    exactoEn: (t) => `Exact moment in ${t}`,
    exactoHace: (t) => `Exact moment ${t} ago`,
    ayer: "yesterday", hoy: "today", manana: "tomorrow",
    meses: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};
function textoVineta(clave, a, b) {
  const t = TEXTOS_VINETAS[typeof idiomaActual === "function" ? idiomaActual() : "es"] || TEXTOS_VINETAS.es;
  const v = t[clave] ?? TEXTOS_VINETAS.es[clave];
  return typeof v === "function" ? v(a, b) : v;
}

let vineta = null, vinetaFirma = "";
const vinetaCache = { centro: null, lista: [], cuando: -1e9 };
const vinetaPrevia = {};

const VCOL = { cielo: "#0b1226", luna: "#cfd8e3", crater: "#b7c2d1", lunaAzul: "#9ec6f2", sol: "#f2a93b", tierra: "#2f7fc0", agua: "#58b0ea", sombraSuelo: "#05070f", linea: "rgba(255,255,255,0.35)" };

// ───── Evento en curso ─────
function eventoLunarEnCurso(ms) {
  const ahora = performance.now();
  const fuera = vinetaCache.centro === null || Math.abs(ms - vinetaCache.centro) > 2 * 86400000;
  if (fuera && ahora - vinetaCache.cuando > VINETA_LUNAR.recalcularCadaMs) {
    vinetaCache.centro = ms;
    vinetaCache.cuando = ahora;
    vinetaCache.lista = eventosLunares(ms - 3 * 86400000, ms + 3 * 86400000).filter((e) => !e.eclipse);
  }
  const activos = vinetaCache.lista.filter((e) => Math.abs(ms - e.maximo) <= VINETA_LUNAR.ventanaHoras[e.tipo] * 3600000);
  activos.sort((a, b) => VINETA_LUNAR.prioridad.indexOf(a.tipo) - VINETA_LUNAR.prioridad.indexOf(b.tipo));
  return activos[0] || null;
}

// ───── Utilidades ─────
const vHuso = (ms) => { try { return typeof husoDelLugar === "function" ? husoDelLugar(new Date(ms)) : 0; } catch (e) { return 0; } };
function vFechaCorta(ms) { const d = new Date(ms + vHuso(ms) * 3600000); return `${d.getUTCDate()} ${textoVineta("meses")[d.getUTCMonth()]}`; }
function vTiempoRelativo(ms, instante) {
  const d = instante - ms, min = Math.round(Math.abs(d) / 60000);
  if (min < 1) return textoVineta("exactoAhora");
  const t = min >= 120 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  return textoVineta(d > 0 ? "exactoEn" : "exactoHace", t);
}
function vAltitudLuna(ms, lat, lon) {
  const o = vectorObservador(ms, lat, lon), v = epResta(vectorLuna(ms), o.posicion);
  return Math.asin(epDot(v, o.zenit) / epNorma(v)) / EP.RAD;
}
function vSalidaLunar(desdeMs, lat, lon) { // primera salida de la Luna en las 26 h siguientes
  const h0 = VINETA_LUNAR.horizonteLuna;
  let t = desdeMs, previa = vAltitudLuna(t, lat, lon) - h0;
  for (let i = 1; i <= 78; i++) {
    const t2 = desdeMs + i * 20 * 60000, a = vAltitudLuna(t2, lat, lon) - h0;
    if (previa < 0 && a >= 0) {
      let lo = t, hi = t2;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (vAltitudLuna(m, lat, lon) - h0 < 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    previa = a; t = t2;
  }
  return null;
}
function vRetrasoCosecha(maximo, lat, lon) {
  const r0 = vSalidaLunar(maximo - 36 * 3600000, lat, lon), r1 = vSalidaLunar(maximo - 12 * 3600000, lat, lon), r2 = vSalidaLunar(maximo + 12 * 3600000, lat, lon);
  if (r0 === null || r1 === null || r2 === null) return null;
  return Math.round(((r1 - r0 - 86400000) + (r2 - r1 - 86400000)) / 2 / 60000);
}
function vFechaPrevia(e) { // primera luna llena (o nueva) del mismo mes, para el recuadro de la luna azul o negra
  if (vinetaPrevia[e.maximo] !== undefined) return vinetaPrevia[e.maximo];
  const tipo = e.tipo === "luna-azul" ? "llena" : "nueva";
  const previas = fasesLunares(e.maximo - 40 * 86400000, e.maximo - 20 * 86400000).filter((f) => f.fase === tipo);
  return (vinetaPrevia[e.maximo] = previas.length ? previas[previas.length - 1].ms : null);
}

// Perfil 2D (vista desde el polo) de un abultamiento de marea de excentricidad eps para un astro en el ángulo th (rad, antihorario)
function vPerfilMarea(th, eps, R, delta) {
  const A = R * (1 + (2 * eps) / 3), B = R * (1 - eps / 3), N = delta.length;
  for (let i = 0; i < N; i++) {
    const p = (i / N) * 2 * Math.PI - th;
    delta[i] += (A * B) / Math.sqrt((B * Math.cos(p)) ** 2 + (A * Math.sin(p)) ** 2) - R;
  }
}

// ───── Lentes (cada una es una mini animación en un cuadro de -2,4…2,4) ─────
function vDiscoLuna(cx, cy, r, extra = "", color = VCOL.luna) {
  return `<g ${extra}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx - r * 0.35}" cy="${cy - r * 0.3}" r="${r * 0.2}" fill="${VCOL.crater}"/><circle cx="${cx + r * 0.3}" cy="${cy + r * 0.35}" r="${r * 0.26}" fill="${VCOL.crater}"/><circle cx="${cx - r * 0.4}" cy="${cy + r * 0.45}" r="${r * 0.12}" fill="${VCOL.crater}"/></g>`;
}

function lenteTamano(ms, e) {
  const d = posicionLunarPrecisa(ms).distancia, razon = 384400 / d, pct = Math.round((razon - 1) * 100);
  const base = 1.05, visual = 1 + (razon - 1) * VINETA_LUNAR.exageracionTamano;
  const html = `<circle r="${base}" fill="none" stroke="${VCOL.linea}" stroke-width="0.04" stroke-dasharray="0.12 0.1"/>
    ${vDiscoLuna(0, 0, base, `class="vineta-latido" style="--v-min:1;--v-max:${visual.toFixed(3)}"`)}
    <text x="0" y="1.95" fill="#cfd8e3" font-size="0.3" text-anchor="middle">${pct >= 0 ? "+" : ""}${pct} %</text>`;
  return { html, dato: textoVineta("tamano", (Math.round(d / 10) * 10).toLocaleString(localeActual()), pct), aviso: textoVineta("avisoTamano") };
}

function lenteMes(ms, e) {
  const azul = e.tipo === "luna-azul", previa = vFechaPrevia(e), color = azul ? VCOL.lunaAzul : "#1b2036";
  const disco = (x, activo) => azul ? vDiscoLuna(x, -0.1, 0.78, activo ? 'class="vineta-pulso"' : "", color)
    : `<g ${activo ? 'class="vineta-pulso"' : ""}><circle cx="${x}" cy="-0.1" r="0.78" fill="${color}" stroke="${VCOL.linea}" stroke-width="0.05"/></g>`;
  const html = `${disco(-1.05, false)}${disco(1.05, true)}
    <text x="-1.05" y="1.35" fill="#cfd8e3" font-size="0.32" text-anchor="middle">${previa ? vFechaCorta(previa) : ""}</text>
    <text x="1.05" y="1.35" fill="#ffffff" font-size="0.32" text-anchor="middle" font-weight="bold">${vFechaCorta(e.maximo)}</text>
    <path d="M -0.1 -0.1 H 0.2 m -0.1 -0.1 l 0.1 0.1 l -0.1 0.1" fill="none" stroke="${VCOL.linea}" stroke-width="0.05"/>`;
  return { html, dato: textoVineta(azul ? "azul" : "negra"), aviso: "" };
}

function lenteCosecha(ms, e) {
  const u = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? ubicacion : null;
  const luna = (x, retardo) => vDiscoLuna(x, 0.5, 0.62, `class="vineta-sube" style="--v-retardo:${retardo}s"`);
  const html = `${luna(-1.35, 0)}${luna(0, 0.45)}${luna(1.35, 0.9)}
    <rect x="-2.4" y="0.9" width="4.8" height="1.6" fill="${VCOL.sombraSuelo}"/><line x1="-2.4" y1="0.9" x2="2.4" y2="0.9" stroke="${VCOL.linea}" stroke-width="0.05"/>
    <text x="-1.35" y="1.5" fill="#cfd8e3" font-size="0.28" text-anchor="middle">${textoVineta("ayer")}</text>
    <text x="0" y="1.5" fill="#ffffff" font-size="0.28" text-anchor="middle" font-weight="bold">${textoVineta("hoy")}</text>
    <text x="1.35" y="1.5" fill="#cfd8e3" font-size="0.28" text-anchor="middle">${textoVineta("manana")}</text>`;
  const retraso = u ? vRetrasoCosecha(e.maximo, u.latitud, u.longitud) : null;
  return {
    html,
    dato: retraso === null ? textoVineta("cosechaSinLugar") : textoVineta("cosechaRetraso", retraso),
    aviso: retraso === null ? "" : Math.abs(u.latitud) < 30 ? textoVineta("cosechaLatitud") : textoVineta("cosechaPromedio"),
  };
}

function lenteMareas(ms, e) {
  const l = posicionLunarPrecisa(ms), s = posicionSolarPrecisa(ms), f = faseLunarPrecisa(ms), m = lunMareas(l.distancia, s.distanciaUA, f.elongacion);
  const R = 0.62, N = 90, delta = new Array(N).fill(0), thS = (150 * Math.PI) / 180;
  const dif = ((((l.longitud - s.longitud) % 360) + 360) % 360) * (Math.PI / 180), thM = thS + dif; // la Luna avanza en sentido antihorario
  vPerfilMarea(thM, VINETA_LUNAR.exageracionMarea * m.Lm, R, delta);
  vPerfilMarea(thS, VINETA_LUNAR.exageracionMarea * m.Ls, R, delta);
  const pts = delta.map((d, i) => { const a = (i / N) * 2 * Math.PI; return `${((R + d) * Math.cos(a)).toFixed(3)} ${(-(R + d) * Math.sin(a)).toFixed(3)}`; });
  const P = (th, r) => [(r * Math.cos(th)).toFixed(3), (-r * Math.sin(th)).toFixed(3)];
  const [sx, sy] = P(thS, 1.95), [lx, ly] = P(thM, 1.75);
  const html = `<line x1="${sx}" y1="${sy}" x2="0" y2="0" stroke="${VCOL.linea}" stroke-width="0.04" stroke-dasharray="0.1 0.1"/>
    <path d="M ${pts.join(" L ")} Z" fill="${VCOL.agua}" opacity="0.65" class="vineta-latido-suave"/>
    <circle r="${R}" fill="${VCOL.tierra}"/>
    <g class="vineta-gira"><circle cx="${R}" cy="0" r="0.08" fill="#f2c94c"/></g>
    <circle cx="${sx}" cy="${sy}" r="0.24" fill="${VCOL.sol}"/>${vDiscoLuna(Number(lx), Number(ly), 0.2)}`;
  return { html, dato: textoVineta("mareas", Math.round(m.indice)), aviso: textoVineta("avisoMareas") };
}

// ───── Tarjeta ─────
function asegurarVineta() {
  if (vineta) return vineta;
  const t = document.createElement("aside");
  t.id = "vineta-evento-lunar";
  t.className = "etiqueta-eclipse vineta-evento-lunar";
  t.hidden = true;
  t.setAttribute("role", "status");
  t.innerHTML = `<svg class="lupa-eclipse" viewBox="-2.4 -2.4 4.8 4.8" aria-hidden="true"><clipPath id="clip-lupa-vineta"><circle r="2.4"/></clipPath><circle r="2.4" fill="${VCOL.cielo}"/><g class="vineta-contenido" clip-path="url(#clip-lupa-vineta)"></g></svg>
    <div class="etiqueta-eclipse-texto"><p class="etiqueta-eclipse-titulo"></p><p class="etiqueta-eclipse-dato"></p><p class="etiqueta-eclipse-dato etiqueta-eclipse-maximo"></p><p class="etiqueta-eclipse-aviso" hidden></p></div>`;
  colocarVineta(t, "der");
  document.addEventListener("cambio-idioma", () => { vinetaFirma = ""; });
  vineta = { t, contenido: t.querySelector(".vineta-contenido"), titulo: t.querySelector(".etiqueta-eclipse-titulo"), datos: t.querySelectorAll(".etiqueta-eclipse-dato"), aviso: t.querySelector(".etiqueta-eclipse-aviso") };
  return vineta;
}

// Se llama en cada fotograma desde main.js, después de actualizarEclipse()
function actualizarVinetaEventoLunar(fecha) {
  const v = asegurarVineta(), ms = fecha.getTime(), e = eventoLunarEnCurso(ms);
  if (!e) { if (!v.t.hidden) { v.t.hidden = true; v.contenido.innerHTML = ""; vinetaFirma = ""; } return; }
  v.t.hidden = false;

  const lente = e.tipo === "superluna" || e.tipo === "microluna" ? lenteTamano(ms, e) : e.tipo === "luna-azul" || e.tipo === "luna-negra" ? lenteMes(ms, e)
    : e.tipo === "luna-cosecha" ? lenteCosecha(ms, e) : lenteMareas(ms, e);
  const titulo = textoEventoLunar(e.tipo);
  v.titulo.textContent = titulo;
  v.datos[0].textContent = lente.dato;
  v.datos[1].textContent = vTiempoRelativo(ms, e.maximo);
  v.aviso.hidden = !lente.aviso;
  v.aviso.textContent = lente.aviso;
  v.t.setAttribute("aria-label", `${titulo}. ${lente.dato}`);

  // La lente solo se redibuja si cambia el evento o su contenido (las animaciones son de CSS)
  const firma = `${e.tipo}|${e.maximo}|${lente.dato}|${Math.round(ms / 600000)}`;
  if (firma !== vinetaFirma) { vinetaFirma = firma; v.contenido.innerHTML = lente.html; }
}

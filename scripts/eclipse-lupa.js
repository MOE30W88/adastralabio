// scripts/eclipse-lupa.js
// Dibuja el eclipse en curso (calculado en eclipse-vista.js): etiqueta con lupa junto al reloj, halo sobre el astro
// en el dial, la Luna eclipsando al Sol y la sombra de la Tierra sobre la Luna. Fuera del evento no hay nada visible.
// Depende de: eclipse-vista.js, constelaciones/main (polar, SVG_NS, RADIO_ORBITA_SOL, anguloDeLaHora, intensidadSolar)

// Textos en un solo sitio para traducirlos: añade una clave "en" con las mismas entradas (se usa "es" si falta).
const TEXTOS_ECLIPSE = {
  es: {
    "solar-parcial": "Eclipse solar parcial",
    "solar-total": "Eclipse solar total",
    "solar-anular": "Eclipse solar anular",
    "lunar-penumbral": "Eclipse lunar penumbral",
    "lunar-parcial": "Eclipse lunar parcial",
    "lunar-total": "Eclipse lunar total",
    ocultacion: (p) => `Ocultación del Sol ${p} %`,
    faseTotal: "Totalidad",
    faseAnular: "Fase anular",
    umbra: (p) => `Umbra sobre el ${p} % de la Luna`,
    penumbra: (p) => `Penumbra sobre el ${p} % de la Luna`,
    maximoAhora: "Máximo ahora",
    maximoEn: (t) => `Máximo en ${t}`,
    maximoHace: (t) => `Máximo hace ${t}`,
    lunaBajoHorizonte: "La Luna está bajo el horizonte",
    maximoBajoHorizonte: "El máximo ocurre con el Sol bajo el horizonte",
    etiquetaLupa: "Vista del eclipse",
  },
  en: {
    "solar-parcial": "Partial solar eclipse",
    "solar-total": "Total solar eclipse",
    "solar-anular": "Annular solar eclipse",
    "lunar-penumbral": "Penumbral lunar eclipse",
    "lunar-parcial": "Partial lunar eclipse",
    "lunar-total": "Total lunar eclipse",
    ocultacion: (p) => `Sun obscured ${p} %`,
    faseTotal: "Totality",
    faseAnular: "Annular phase",
    umbra: (p) => `Umbra over ${p} % of the Moon`,
    penumbra: (p) => `Penumbra over ${p} % of the Moon`,
    maximoAhora: "Maximum now",
    maximoEn: (t) => `Maximum in ${t}`,
    maximoHace: (t) => `Maximum ${t} ago`,
    lunaBajoHorizonte: "The Moon is below the horizon",
    maximoBajoHorizonte: "The maximum occurs with the Sun below the horizon",
    etiquetaLupa: "Eclipse view",
  },
};
function textoEclipse(clave, dato) {
  const tabla = TEXTOS_ECLIPSE[idiomaActual?.()] || TEXTOS_ECLIPSE.es;
  const v = tabla[clave] ?? TEXTOS_ECLIPSE.es[clave];
  return typeof v === "function" ? v(dato) : v;
}

let estadoEclipseActual = null; // lo calcula actualizarEclipse() en cada fotograma; fase-lunar.js lo lee

const ECLIPSE_COLORES = { cielo: "#0b1226", sol: "#f2a93b", luna: "#cfd8e3", crater: "#b7c2d1", umbra: "#7a2a20", corona: "#f1e6c4", anillo: "#ffd27a" };
let elementosEclipse = null;
let firmaLupa = "";

// ───── Fragmentos SVG reutilizados (lupa y dial) ─────
function marcaCoronaSolar(k, R) {
  if (k <= 0) return "";
  let rayos = "";
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + 0.2, largo = 1.28 + 0.5 * (((i * 7) % 5) / 4);
    rayos += `<line x1="${(Math.cos(a) * R * 1.07).toFixed(2)}" y1="${(Math.sin(a) * R * 1.07).toFixed(2)}" x2="${(Math.cos(a) * R * largo).toFixed(2)}" y2="${(Math.sin(a) * R * largo).toFixed(2)}"/>`;
  }
  return `<g opacity="${k.toFixed(2)}"><circle r="${R * 1.14}" fill="none" stroke="${ECLIPSE_COLORES.corona}" stroke-width="${R * 0.12}" opacity="0.3"/><circle r="${R * 1.32}" fill="none" stroke="${ECLIPSE_COLORES.corona}" stroke-width="${R * 0.2}" opacity="0.12"/><g stroke="${ECLIPSE_COLORES.corona}" stroke-width="${R * 0.04}" stroke-linecap="round" opacity="0.6">${rayos}</g></g>`;
}
const factorCorona = (ocultacion) => Math.max(0, Math.min(1, (ocultacion - 0.985) / 0.015));

// Sombra de la Tierra sobre un disco lunar de radio R centrado en el origen del contenedor
function marcaSombraLunar(vista, R, idClip) {
  const f = (v) => (v * R).toFixed(2);
  return `<clipPath id="${idClip}"><circle r="${R}"/></clipPath><g clip-path="url(#${idClip})"><circle cx="${f(vista.penumbra.cx)}" cy="${f(vista.penumbra.cy)}" r="${f(vista.penumbra.r)}" fill="${ECLIPSE_COLORES.cielo}" opacity="0.22"/><circle cx="${f(vista.umbra.cx)}" cy="${f(vista.umbra.cy)}" r="${f(vista.umbra.r)}" fill="${ECLIPSE_COLORES.umbra}"/></g>`;
}
// fase-lunar.js la llama para dibujar la sombra sobre la Luna del dial
function dibujarSombraLunar(capa, vista, R) {
  capa.insertAdjacentHTML("beforeend", marcaSombraLunar(vista, R, "clip-sombra-luna-dial"));
}

// ───── Elementos fijos (se crean una vez) ─────
function asegurarElementosEclipse() {
  if (elementosEclipse) return elementosEclipse;
  const svg = document.getElementById("reloj");
  const capa = document.createElementNS(SVG_NS, "g");
  capa.setAttribute("id", "capa-eclipse");
  const posicion = document.createElementNS(SVG_NS, "g");
  const halo = document.createElementNS(SVG_NS, "circle");
  halo.setAttribute("class", "halo-eclipse");
  halo.setAttribute("r", 64);
  const contenido = document.createElementNS(SVG_NS, "g");
  posicion.append(contenido, halo);
  capa.appendChild(posicion);
  document.getElementById("capa-luna").after(capa);

  const tarjeta = document.createElement("aside");
  tarjeta.id = "etiqueta-eclipse";
  tarjeta.className = "etiqueta-eclipse";
  tarjeta.hidden = true;
  tarjeta.setAttribute("role", "status");
  tarjeta.innerHTML = `<svg class="lupa-eclipse" viewBox="-2.4 -2.4 4.8 4.8" aria-hidden="true"><g class="lupa-contenido"></g></svg>
    <div class="etiqueta-eclipse-texto"><p class="etiqueta-eclipse-titulo"></p><p class="etiqueta-eclipse-dato"></p><p class="etiqueta-eclipse-dato etiqueta-eclipse-maximo"></p><p class="etiqueta-eclipse-aviso" hidden></p></div>`;
  colocarVineta(tarjeta, "der");
  document.addEventListener("cambio-idioma", () => { firmaLupa = ""; });

  elementosEclipse = {
    capa, posicion, halo, contenido, tarjeta,
    lupa: tarjeta.querySelector(".lupa-contenido"),
    titulo: tarjeta.querySelector(".etiqueta-eclipse-titulo"),
    datos: tarjeta.querySelectorAll(".etiqueta-eclipse-dato"),
    aviso: tarjeta.querySelector(".etiqueta-eclipse-aviso"),
  };
  return elementosEclipse;
}

const porcentaje = (x) => (x >= 0.9995 ? 100 : Math.min(99, Math.max(0, Math.round(x * 100))));
function textoMaximoEclipse(ms, maximo) {
  if (maximo === null || maximo === undefined) return "";
  const d = maximo - ms, min = Math.round(Math.abs(d) / 60000);
  if (min < 1) return textoEclipse("maximoAhora");
  const t = min >= 90 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  return textoEclipse(d > 0 ? "maximoEn" : "maximoHace", t);
}

function contenidoLupa(e) {
  const C = ECLIPSE_COLORES;
  const L = e.tipo === "solar" ? 2.4 : 1.7; // radio visible de la lupa (la Luna se ve más grande que el campo solar)
  let s = `<clipPath id="clip-lupa"><circle r="${L}"/></clipPath><circle r="${L}" fill="${C.cielo}"/><g clip-path="url(#clip-lupa)">`;
  if (e.tipo === "solar") {
    const m = e.vista.luna;
    s += marcaCoronaSolar(factorCorona(e.ocultacion), 1);
    s += `<circle r="1" fill="${C.sol}"/><circle cx="${m.cx.toFixed(3)}" cy="${m.cy.toFixed(3)}" r="${m.r.toFixed(3)}" fill="${C.cielo}" stroke="rgba(255,255,255,0.2)" stroke-width="0.02"/>`;
  } else {
    const v = e.vista;
    s += `<circle r="1" fill="${C.luna}"/><circle cx="-0.35" cy="-0.3" r="0.2" fill="${C.crater}"/><circle cx="0.3" cy="0.35" r="0.26" fill="${C.crater}"/><circle cx="-0.4" cy="0.45" r="0.12" fill="${C.crater}"/>`;
    s += marcaSombraLunar(v, 1, "clip-sombra-luna-lupa");
    s += `<circle cx="${v.umbra.cx.toFixed(3)}" cy="${v.umbra.cy.toFixed(3)}" r="${v.umbra.r.toFixed(3)}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.02" stroke-dasharray="0.08 0.08"/>`;
  }
  return s + "</g>";
}

function posicionDelAstro(fecha, lunar = false) {
  return polar(RADIO_ORBITA_SOL, lunar ? anguloDeLaLuna(fecha) : anguloDeLaHora(fecha));
}

// Se llama en cada fotograma desde main.js, ANTES de dibujar el Sol y la Luna
function actualizarEclipse(fecha, alturaSolar) {
  const el = asegurarElementosEclipse();
  const ms = fecha.getTime();
  const e = (estadoEclipseActual = estadoEclipse(ms, ubicacion.latitud, ubicacion.longitud));

  if (!e) {
    if (!el.tarjeta.hidden) { el.tarjeta.hidden = true; el.capa.classList.remove("activo"); el.contenido.innerHTML = ""; firmaLupa = ""; }
    el.capa.style.opacity = 0;
    return;
  }
  el.tarjeta.hidden = false;
  el.capa.classList.add("activo");

  // Dial: halo sobre el astro y, si es solar, la Luna cubriendo al Sol
  const p = posicionDelAstro(fecha, e.tipo !== "solar");
  el.posicion.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
  let opacidad;
  if (e.tipo === "solar") {
    const R = Number(document.getElementById("sol").getAttribute("r")) || 43, m = e.vista.luna;
    opacidad = alturaSolar === null ? 0 : intensidadSolar(alturaSolar);
    el.contenido.innerHTML = `${marcaCoronaSolar(factorCorona(e.ocultacion), R)}<clipPath id="clip-sol-eclipse"><circle r="${R}"/></clipPath><g clip-path="url(#clip-sol-eclipse)"><circle cx="${(m.cx * R).toFixed(2)}" cy="${(m.cy * R).toFixed(2)}" r="${(m.r * R).toFixed(2)}" fill="${ECLIPSE_COLORES.cielo}"/></g><circle r="${R}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>`;
  } else {
    opacidad = Number(document.getElementById("capa-fase-lunar").style.opacity) || 0;
    el.contenido.innerHTML = "";
  }
  el.capa.style.opacity = opacidad;

  // Etiqueta
  const clave = `${e.tipo}-${e.clase}`;
  el.titulo.textContent = textoEclipse(clave);
  const dato1 = e.tipo === "solar"
    ? (e.fase === "total" ? textoEclipse("faseTotal") : e.fase === "anular" ? textoEclipse("faseAnular") : textoEclipse("ocultacion", porcentaje(e.ocultacion)))
    : (e.fase === "total" ? textoEclipse("faseTotal") : textoEclipse(e.fase === "parcial" ? "umbra" : "penumbra", porcentaje(e.cobertura)));
  el.datos[0].textContent = dato1;
  el.datos[1].textContent = textoMaximoEclipse(ms, e.maximo);
  const aviso = e.lunaBajoHorizonte ? textoEclipse("lunaBajoHorizonte") : e.maximoBajoHorizonte ? textoEclipse("maximoBajoHorizonte") : "";
  el.aviso.hidden = !aviso;
  el.aviso.textContent = aviso;
  el.tarjeta.setAttribute("aria-label", `${el.titulo.textContent}. ${dato1}`);

  // Lupa (solo se redibuja si cambia algo visible)
  const v = e.tipo === "solar" ? e.vista.luna : e.vista.umbra;
  const firma = `${clave}|${v.cx.toFixed(3)}|${v.cy.toFixed(3)}|${v.r.toFixed(3)}|${e.ocultacion ? e.ocultacion.toFixed(3) : ""}`;
  if (firma !== firmaLupa) {
    firmaLupa = firma;
    const L = e.tipo === "solar" ? 2.4 : 1.7;
    el.lupa.parentNode.setAttribute("viewBox", `${-L} ${-L} ${2 * L} ${2 * L}`);
    el.lupa.innerHTML = contenidoLupa(e);
  }
}

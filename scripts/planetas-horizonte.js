// scripts/planetas-horizonte.js
// Capa Día y noche: un punto por cada planeta visible a simple vista desde tu ubicación, en el borde exterior del anillo,
// con su nombre. Solo se dibuja lo que el cálculo indica que se ve (sobre el horizonte, cielo lo bastante oscuro y brillo suficiente).
// Su brillo crece con el margen sobre la magnitud límite: aparecen poco a poco al oscurecer y se apagan al amanecer.
// Depende de: cuerpos-horizonte.js, main.js (polar), astronomia.js

const PLANETAS_HORIZONTE = { radio: 578, radioEtiqueta: 632 };
let planetasHorizonte = null;

function asegurarPlanetasHorizonte() {
  if (planetasHorizonte) return planetasHorizonte;
  const capa = document.createElementNS(SVG_NS, "g");
  capa.setAttribute("id", "capa-planetas-horizonte");
  document.getElementById("capa-luna").after(capa);
  const mapa = {};
  for (const nombre of CUERPOS.OBSERVABLES) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "planeta-horizonte");
    g.innerHTML = `<title>${tx(nombre)}</title><circle class="planeta-halo" r="12"/><circle class="planeta-punto" r="4"/><text class="planeta-etiqueta" text-anchor="middle" dominant-baseline="central">${tx(nombre)}</text>`;
    capa.appendChild(g);
    mapa[nombre] = { g, halo: g.querySelector(".planeta-halo"), punto: g.querySelector(".planeta-punto"), texto: g.querySelector("text"), titulo: g.querySelector("title") };
  }
  planetasHorizonte = { capa, mapa };
  return planetasHorizonte;
}

// Se llama en cada fotograma desde main.js, después de actualizarLuna()
function actualizarPlanetasHorizonte(fecha) {
  const P = asegurarPlanetasHorizonte();
  if (typeof ubicacion === "undefined" || typeof ubicacion.latitud !== "number") return;
  const lista = planetasVisibles(fecha, ubicacion.latitud, ubicacion.longitud);
  // Si dos planetas quedan a menos de 7° en el dial, sus nombres se escalonan para no pisarse
  const orden = lista.filter((x) => x.visible).sort((x, y) => x.angulo - y.angulo);
  orden.forEach((x, i) => { const prev = orden[i - 1]; x.nivel = prev && x.angulo - prev.angulo < 7 ? (prev.nivel + 1) % 3 : 0; });
  for (const pl of lista) {
    const e = P.mapa[pl.nombre];
    e.g.classList.toggle("visible", pl.visible);
    if (!pl.visible) continue;
    const r = Math.max(3, Math.min(9, 3.2 + (1.6 - pl.magnitud) * 0.85)), p = polar(PLANETAS_HORIZONTE.radio, pl.angulo), t = polar(PLANETAS_HORIZONTE.radioEtiqueta + 24 * pl.nivel, pl.angulo);
    const brillo = Math.max(0.35, Math.min(1, pl.margen / 1.5 + 0.3));
    e.g.style.opacity = brillo.toFixed(2);
    e.punto.setAttribute("cx", p.x); e.punto.setAttribute("cy", p.y); e.punto.setAttribute("r", r.toFixed(1)); e.punto.style.fill = pl.color;
    e.halo.setAttribute("cx", p.x); e.halo.setAttribute("cy", p.y); e.halo.setAttribute("r", (r * 2.8).toFixed(1)); e.halo.style.fill = pl.color;
    e.texto.setAttribute("x", t.x); e.texto.setAttribute("y", t.y);
    e.titulo.textContent = tx`${tx(pl.nombre)} · magnitud ${pl.magnitud.toFixed(1)} · altura ${pl.altura.toFixed(0)}°`;
  }
}
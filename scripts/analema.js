// Dos relojes auxiliares y analema: ecuación del tiempo frente a declinación solar.
// Depende de astronomia.js, efemerides-solares.js y marco.js.
const ANALEMA = { cx: 600, cy: 590, rx: 342, ry: 500, relojR: 190 };
const CENTROS_RELOJES_AUXILIARES = [{ x: 300, y: 400 }, { x: 900, y: 400 }];
const ANALEMA_NS = "http://www.w3.org/2000/svg";

function svgAnalema(nombre, attrs = {}, padre) {
  const el = document.createElementNS(ANALEMA_NS, nombre);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (padre) padre.appendChild(el);
  return el;
}

function puntoAnalema(instante) {
  const { declinacion } = posicionSolar(instante);
  return {
    x: ANALEMA.cx + (ecuacionDelTiempoMin(instante) / 16) * ANALEMA.rx,
    y: ANALEMA.cy - (declinacion / OBLICUIDAD) * ANALEMA.ry,
  };
}

function construirAnalema(anio = aHoraDePared(obtenerFechaActual()).getUTCFullYear()) {
  const capa = document.getElementById("capa-analema");
  if (!capa || capa.childElementCount) return;

  // La curva anual se muestrea cada día a las 12:00 de hora media solar.
  const curva = [];
  for (let d = 0; d < 366; d++) {
    const fecha = new Date(Date.UTC(anio, 0, 1 + d, 12) - ubicacion.longitud / 15 * 3600000);
    curva.push(puntoAnalema(fecha));
  }
  svgAnalema("path", {
    class: "analema-curva",
    d: curva.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "),
  }, capa);

  const estaciones = [
    { longitud: 0, nombre: tx("Equinoccio de marzo") },
    { longitud: 90, nombre: tx("Solsticio de junio") },
    { longitud: 180, nombre: tx("Equinoccio de septiembre") },
    { longitud: 270, nombre: tx("Solsticio de diciembre") },
  ];
  estaciones.forEach(({ longitud, nombre }) => {
    let mejorInstante = null;
    let menorDiferencia = Infinity;
    for (let d = 0; d < 366; d++) {
      const candidato = new Date(Date.UTC(anio, 0, 1 + d, 12) - ubicacion.longitud / 15 * 3600000);
      const l = posicionSolar(candidato).longitudEcliptica;
      const diferencia = Math.abs((((l - longitud + 540) % 360) + 360) % 360 - 180);
      if (diferencia < menorDiferencia) { menorDiferencia = diferencia; mejorInstante = candidato; }
    }
    const punto = puntoAnalema(mejorInstante);
    const marca = svgAnalema("circle", {
      class: "analema-estacion", cx: punto.x, cy: punto.y, r: 5,
      "aria-label": nombre,
    }, capa);
    const t = svgAnalema("title", {}, marca);
    t.textContent = nombre;
  });

  [0, 1].forEach((i) => {
    const { x: cx, y: cy } = CENTROS_RELOJES_AUXILIARES[i];
    const g = svgAnalema("g", { class: `reloj-auxiliar reloj-auxiliar-${i ? "civil" : "solar"}` }, capa);
    svgAnalema("circle", { class: "reloj-auxiliar-cara", cx, cy, r: ANALEMA.relojR }, g);
    for (let h = 1; h <= 12; h++) {
      const a = (h * 30) * Math.PI / 180;
      const radioNumero = ANALEMA.relojR - 18;
      const numero = svgAnalema("text", {
        class: "reloj-auxiliar-numero",
        x: cx + radioNumero * Math.sin(a),
        y: cy - radioNumero * Math.cos(a),
        "text-anchor": "middle",
        "dominant-baseline": "central",
      }, g);
      numero.textContent = String(h);
      const r1 = ANALEMA.relojR - 7, r2 = ANALEMA.relojR - 3;
      svgAnalema("line", { class: "reloj-auxiliar-marca", x1: cx + r1 * Math.sin(a), y1: cy - r1 * Math.cos(a), x2: cx + r2 * Math.sin(a), y2: cy - r2 * Math.cos(a) }, g);
    }
    svgAnalema("line", { class: "reloj-auxiliar-aguja hora", x1: cx, y1: cy, x2: cx, y2: cy - ANALEMA.relojR * 0.55, id: `aguja-aux-${i}-hora` }, g);
    svgAnalema("line", { class: "reloj-auxiliar-aguja minuto", x1: cx, y1: cy, x2: cx, y2: cy - ANALEMA.relojR * 0.8, id: `aguja-aux-${i}-minuto` }, g);
    svgAnalema("circle", { class: "reloj-auxiliar-centro", cx, cy, r: 4 }, g);
    const label = svgAnalema("text", { class: "reloj-auxiliar-etiqueta", x: cx, y: cy + ANALEMA.relojR + 45, "text-anchor": "middle" }, g);
    label.textContent = i ? tx("HORA CIVIL") : tx("HORA SOLAR");
  });
  const etiqueta = svgAnalema("text", { class: "analema-etiqueta", x: 600, y: 790, "text-anchor": "middle" }, capa);
  etiqueta.textContent = tx("ANALEMA · ECUACIÓN DEL TIEMPO / DECLINACIÓN");
  svgAnalema("text", {
    id: "etiqueta-evento-analema",
    x: 600,
    y: 836,
    class: "analema-etiqueta analema-etiqueta-evento",
    "text-anchor": "middle",
    visibility: "hidden",
  }, capa);
}

function actualizarAnalema(instante) {
  const capa = document.getElementById("capa-analema");
  if (!capa || !document.getElementById("reloj").classList.contains("enfoque-reloj")) return;
  const anio = aHoraDePared(instante).getUTCFullYear();
  if (!capa.childElementCount || Number(capa.dataset.anio) !== anio) {
    capa.replaceChildren();
    construirAnalema(anio);
    capa.dataset.anio = String(anio);
  }

  const solar = ((horaSolarVerdadera(instante) % 24) + 24) % 24;
  const pared = aHoraDePared(instante);
  const civil = pared.getUTCHours() + pared.getUTCMinutes() / 60 + pared.getUTCSeconds() / 3600;
  [solar, civil].forEach((hora, i) => {
    const { x: cx, y: cy } = CENTROS_RELOJES_AUXILIARES[i];
    const minuto = hora * 60;
    const anguloMin = (minuto % 60) * 6;
    const anguloHora = ((hora % 12) + (minuto % 60) / 60) * 30;
    document.getElementById(`aguja-aux-${i}-hora`)?.setAttribute("transform", `rotate(${anguloHora} ${cx} ${cy})`);
    document.getElementById(`aguja-aux-${i}-minuto`)?.setAttribute("transform", `rotate(${anguloMin} ${cx} ${cy})`);
  });

  const punto = puntoAnalema(instante);
  let sol = document.getElementById("sol-analema");
  if (!sol) sol = svgAnalema("circle", { id: "sol-analema", class: "analema-sol", r: 10 }, capa);
  sol.setAttribute("cx", punto.x);
  sol.setAttribute("cy", punto.y);

  const etiquetaEvento = document.getElementById("etiqueta-evento-analema");
  const longitud = posicionSolar(instante).longitudEcliptica;
  const evento = EVENTOS_ESTACIONALES.find(({ longitud: objetivo }) => {
    const diferencia = Math.abs((((longitud - objetivo + 540) % 360) + 360) % 360 - 180);
    return diferencia <= TOLERANCIA_GRADOS;
  });
  etiquetaEvento.textContent = evento?.etiqueta ?? "";
  etiquetaEvento.setAttribute("visibility", evento ? "visible" : "hidden");

}

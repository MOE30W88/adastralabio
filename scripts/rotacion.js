// scripts/rotacion.js
// Capa Rotación: dos grupos del SVG.
//   capa-eje-rotacion → línea punteada del eje terrestre (visible en "Astrolabio" y en "Rotación")
//   capa-rotacion     → globo terrestre (visible SOLO al elegir "Rotación"; ver css/rotacion.css)
// El globo se ve desde el Sol: el meridiano central es el que tiene el Sol en el cenit, y gira con el
// tiempo simulado (así responde a los botones de velocidad). Proyección ortográfica real.

const ROTACION = {
  centro: 600,
  radioGlobo: 596,
  inclinacion: 23.44,          // grados; el polo norte se inclina hacia la derecha
  largoEje: 1000,              // del centro a cada extremo del eje
  velocidadEcuatorial: 465.1,  // m/s (2π·6378 km / 23 h 56 min)
  pasoMeridianos: 15,          // un meridiano por huso horario
  paralelos: [-60, -30, 0, 30, 60],
};

const TEXTOS_ROTACION = {
  es: {
    angulo: "Ángulo de inclinación",
    ecuador: "Ecuador", tropicoCancer: "Trópico de Cáncer", tropicoCapricornio: "Trópico de Capricornio",
    polarArtico: "Círculo polar ártico", polarAntartico: "Círculo polar antártico",
    poloNorte: "Polo norte", poloSur: "Polo sur",
    velocidad: (valor, ecuador) => `Velocidad de rotación · ${valor} m/s${ecuador ? " (ecuador)" : ""}`,
    ubicacion: (lat, lon) => `Lat ${lat} · Lon ${lon}`,
  },
  en: {
    angulo: "Tilt angle",
    ecuador: "Equator", tropicoCancer: "Tropic of Cancer", tropicoCapricornio: "Tropic of Capricorn",
    polarArtico: "Arctic Circle", polarAntartico: "Antarctic Circle",
    poloNorte: "North Pole", poloSur: "South Pole",
    velocidad: (valor, ecuador) => `Rotation speed · ${valor} m/s${ecuador ? " (equator)" : ""}`,
    ubicacion: (lat, lon) => `Lat ${lat} · Lon ${lon}`,
  },
};
const textoRotacion = (clave, ...args) => textoDe(TEXTOS_ROTACION, clave, ...args);
let etiquetasRotacion = []; // { el, clave }: textos fijos que se reescriben al cambiar de idioma

const NS_SVG = "http://www.w3.org/2000/svg";
let rotacionConstruida = false;
let meridianosGlobo = [];      // { linea, longitud }
let puntoUbicacionGlobo = null;
let etiquetaUbicacionGlobo = null;
let textoVelocidadRotacion = null;
let valorEjeRotacion = null;
let ultimaLatitudEtiqueta = undefined;
let ultimaLatitudUbicacion = undefined;
let ultimaLongitudUbicacion = undefined;

function crearSvg(nombre, atributos = {}, padre = null) {
  const el = document.createElementNS(NS_SVG, nombre);
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  if (padre) padre.appendChild(el);
  return el;
}

function formatoGrados(valor) {
  const t = valor.toFixed(2);
  return `${idiomaActual() === "en" ? t : t.replace(".", ",")}°`;
}

function construirEjeRotacion(capa) {
  const { centro: c, inclinacion: eps, largoEje: L } = ROTACION;
  const extremoSup = polar(L, eps);        // polar() viene de marco.js (grados desde arriba, horario)
  const extremoInf = polar(L, eps + 180);

  crearSvg("line", { class: "eje-rotacion-linea", x1: extremoInf.x, y1: extremoInf.y, x2: extremoSup.x, y2: extremoSup.y }, capa);
  crearSvg("circle", { class: "eje-rotacion-punta", cx: extremoSup.x, cy: extremoSup.y, r: 7 }, capa);
  crearSvg("circle", { class: "eje-rotacion-punta", cx: extremoInf.x, cy: extremoInf.y, r: 7 }, capa);

  // Trazo matemático del ángulo: arco entre la vertical y el eje, con su valor
  const rArco = 945;
  const a = polar(rArco, 0);
  const b = polar(rArco, eps);
  crearSvg("path", { class: "eje-rotacion-arco", d: `M ${a.x} ${a.y} A ${rArco} ${rArco} 0 0 1 ${b.x} ${b.y}` }, capa);
  [a, b].forEach((p) => {
    const dentro = polar(rArco - 16, p === a ? 0 : eps);
    const fuera = polar(rArco + 16, p === a ? 0 : eps);
    crearSvg("line", { class: "eje-rotacion-arco", x1: dentro.x, y1: dentro.y, x2: fuera.x, y2: fuera.y }, capa);
  });
  const medio = polar(rArco + 34, eps / 2);
  const valor = crearSvg("text", { class: "texto-eje-rotacion", x: medio.x, y: medio.y, "text-anchor": "middle" }, capa);
  valor.textContent = formatoGrados(eps);
  valorEjeRotacion = valor;

  // Extremo superior: nombre del ángulo. Extremo inferior: velocidad de rotación.
  const etiquetaAngulo = crearSvg("text", { class: "texto-eje-rotacion", x: extremoSup.x + 22, y: extremoSup.y + 8, "text-anchor": "start" }, capa);
  etiquetaAngulo.textContent = textoRotacion("angulo");
  etiquetasRotacion.push({ el: etiquetaAngulo, clave: "angulo" });
  textoVelocidadRotacion = crearSvg("text", { class: "texto-eje-rotacion", x: extremoInf.x - 22, y: extremoInf.y + 8, "text-anchor": "end" }, capa);
}

function construirGlobo(capa) {
  const { centro: c, radioGlobo: R, inclinacion: eps } = ROTACION;

  const defs = crearSvg("defs", {}, capa);
  const grad = crearSvg("radialGradient", { id: "grad-globo", cx: "42%", cy: "38%", r: "72%" }, defs);
  crearSvg("stop", { offset: "0%", style: "stop-color: var(--globo-1)" }, grad);
  crearSvg("stop", { offset: "55%", style: "stop-color: var(--globo-2)" }, grad);
  crearSvg("stop", { offset: "100%", style: "stop-color: var(--globo-3)" }, grad);
  const limbo = crearSvg("radialGradient", { id: "grad-limbo", cx: "50%", cy: "50%", r: "50%" }, defs);
  crearSvg("stop", { offset: "72%", "stop-color": "#04101f", "stop-opacity": "0" }, limbo);
  crearSvg("stop", { offset: "100%", "stop-color": "#04101f", "stop-opacity": "0.55" }, limbo);

  crearSvg("circle", { class: "globo-esfera", cx: c, cy: c, r: R }, capa);

  // Todo lo que pertenece a la Tierra va en un grupo inclinado por el ángulo del eje
  const tierra = crearSvg("g", { transform: `rotate(${eps} ${c} ${c})` }, capa);

  // Paralelos: con el eje en el plano de la pantalla se proyectan como rectas perpendiculares al eje
  const lats = [...ROTACION.paralelos, eps, -eps, 90 - eps, -(90 - eps)];
  const referenciasGlobo = [];
  lats.forEach((lat) => {
    const y = c - R * Math.sin((lat * Math.PI) / 180);
    const medio = R * Math.cos((lat * Math.PI) / 180);
    let especial = "";
    let etiqueta = "";
    if (lat === 0) { especial = "ecuador"; etiqueta = "ecuador"; }
    else if (lat === eps) { especial = "circulo-notable tropico-cancer"; etiqueta = "tropicoCancer"; }
    else if (lat === -eps) { especial = "circulo-notable tropico-capricornio"; etiqueta = "tropicoCapricornio"; }
    else if (lat === 90 - eps) { especial = "circulo-notable circulo-polar"; etiqueta = "polarArtico"; }
    else if (lat === -(90 - eps)) { especial = "circulo-notable circulo-polar"; etiqueta = "polarAntartico"; }
    crearSvg("line", { class: `globo-paralelo ${especial}`.trim(), x1: c - medio, y1: y, x2: c + medio, y2: y }, tierra);
    if (etiqueta) {
      const ladoDerecho = lat > 0;
      const xEtiqueta = ladoDerecho ? c + medio + 25 : c - medio - 75;
      referenciasGlobo.push({ etiqueta, especial, x: xEtiqueta, y: y - 20, ladoDerecho });
    }
  });

  // Eje de la Tierra dentro del globo (fuera lo dibuja capa-eje-rotacion).
  crearSvg("line", { class: "globo-eje", x1: c, y1: c - R, x2: c, y2: c + R }, tierra);

  // Meridianos: semielipses cuyo ancho depende del ángulo respecto al meridiano central
  for (let lon = -180; lon < 180; lon += ROTACION.pasoMeridianos) {
    const linea = crearSvg("path", { class: lon === 0 ? "globo-meridiano meridiano-cero" : "globo-meridiano" }, tierra);
    meridianosGlobo.push({ linea, longitud: lon });
  }

  // Las etiquetas van sobre la retícula y fuera del borde para no tapar el globo.
  const etiquetasReferencia = crearSvg("g", { class: "globo-etiquetas-referencia" }, tierra);
  referenciasGlobo.forEach(({ etiqueta, especial, x, y, ladoDerecho }) => {
    const texto = crearSvg("text", {
      class: `globo-etiqueta-paralelo ${especial}`,
      x,
      y,
      transform: `rotate(${-eps} ${x} ${y})`,
      "text-anchor": ladoDerecho ? "start" : "end",
    }, etiquetasReferencia);
    texto.textContent = textoRotacion(etiqueta);
    etiquetasRotacion.push({ el: texto, clave: etiqueta });
  });

  const poloNorte = crearSvg("text", { class: "globo-etiqueta-polo", x: c + 20, y: c - R - 25, transform: `rotate(${-eps} ${c + 18} ${c - R - 18})`, "text-anchor": "start" }, etiquetasReferencia);
  poloNorte.textContent = textoRotacion("poloNorte");
  etiquetasRotacion.push({ el: poloNorte, clave: "poloNorte" });
  const poloSur = crearSvg("text", { class: "globo-etiqueta-polo", x: c + 20, y: c + R + 65, transform: `rotate(${-eps} ${c + 18} ${c + R + 28})`, "text-anchor": "start" }, etiquetasReferencia);
  poloSur.textContent = textoRotacion("poloSur");
  etiquetasRotacion.push({ el: poloSur, clave: "poloSur" });

  puntoUbicacionGlobo = crearSvg("circle", { class: "globo-ubicacion", cx: c, cy: c, r: 6, visibility: "hidden" }, tierra);
  etiquetaUbicacionGlobo = crearSvg("text", { class: "globo-etiqueta-ubicacion", visibility: "hidden" }, tierra);

  crearSvg("circle", { class: "globo-limbo", cx: c, cy: c, r: R }, capa);
  crearSvg("circle", { class: "globo-borde", cx: c, cy: c, r: R }, capa);
}

function construirRotacion() {
  construirEjeRotacion(document.getElementById("capa-eje-rotacion"));
  construirGlobo(document.getElementById("capa-rotacion"));
  rotacionConstruida = true;
}

// Velocidad lineal de la superficie a la latitud del usuario (o en el ecuador si aún no hay ubicación)
function actualizarEtiquetaVelocidad() {
  if (ubicacion.latitud === ultimaLatitudEtiqueta) return;
  ultimaLatitudEtiqueta = ubicacion.latitud;
  const lat = ubicacion.latitud;
  const v = ROTACION.velocidadEcuatorial * Math.cos(((lat ?? 0) * Math.PI) / 180);
  const valor = Math.round(v).toLocaleString(localeActual());
  textoVelocidadRotacion.textContent = textoRotacion("velocidad", valor, lat === null);
}

// Longitud (este +) del punto subsolar: el meridiano que mira hacia el Sol
function longitudSubsolar(instante) {
  const { ascensionRecta } = posicionSolar(instante);
  const l = normalizarGrados(ascensionRecta - horaSideral(instante, 0));
  return l > 180 ? l - 360 : l;
}

function actualizarRotacion(ahora) {
  if (!rotacionConstruida) construirRotacion();
  actualizarEtiquetaVelocidad();
  if (!document.getElementById("reloj").classList.contains("enfoque-rotacion")) return; // globo oculto: no gastar

  const { centro: c, radioGlobo: R } = ROTACION;
  const central = longitudSubsolar(ahora);

  meridianosGlobo.forEach(({ linea, longitud }) => {
    let t = longitud - central;
    t = ((((t + 180) % 360) + 360) % 360) - 180;
    if (Math.abs(t) >= 90) {
      linea.setAttribute("d", "");
      return;
    }
    const rx = R * Math.abs(Math.sin((t * Math.PI) / 180));
    linea.setAttribute("d", `M ${c} ${c - R} A ${rx} ${R} 0 0 ${t > 0 ? 1 : 0} ${c} ${c + R}`);
  });

  if (ubicacion.latitud === null) {
    puntoUbicacionGlobo.setAttribute("visibility", "hidden");
    etiquetaUbicacionGlobo.setAttribute("visibility", "hidden");
    return;
  }
  const lat = (ubicacion.latitud * Math.PI) / 180;
  let t = ubicacion.longitud - central;
  t = (((((t + 180) % 360) + 360) % 360) - 180) * (Math.PI / 180);
  const visible = Math.cos(lat) * Math.cos(t) > 0;
  puntoUbicacionGlobo.setAttribute("visibility", visible ? "visible" : "hidden");
  etiquetaUbicacionGlobo.setAttribute("visibility", visible ? "visible" : "hidden");
  if (visible) {
    const x = c + R * Math.cos(lat) * Math.sin(t);
    const y = c - R * Math.sin(lat);
    puntoUbicacionGlobo.setAttribute("cx", x);
    puntoUbicacionGlobo.setAttribute("cy", y);
    etiquetaUbicacionGlobo.setAttribute("x", x + (x < c ? 12 : -12));
    etiquetaUbicacionGlobo.setAttribute("y", y - 12);
    etiquetaUbicacionGlobo.setAttribute("transform", `rotate(${-ROTACION.inclinacion} ${x + (x < c ? 12 : -12)} ${y - 12})`);
    etiquetaUbicacionGlobo.setAttribute("text-anchor", x < c ? "start" : "end");
    if (ubicacion.latitud !== ultimaLatitudUbicacion || ubicacion.longitud !== ultimaLongitudUbicacion) {
      etiquetaUbicacionGlobo.textContent = textoRotacion("ubicacion", formatoGrados(ubicacion.latitud), formatoGrados(ubicacion.longitud));
      ultimaLatitudUbicacion = ubicacion.latitud;
      ultimaLongitudUbicacion = ubicacion.longitud;
    }
  }
}

document.addEventListener("cambio-idioma", () => {
  etiquetasRotacion.forEach(({ el, clave }) => { el.textContent = textoRotacion(clave); });
  if (valorEjeRotacion) valorEjeRotacion.textContent = formatoGrados(ROTACION.inclinacion);
  ultimaLatitudEtiqueta = ultimaLatitudUbicacion = ultimaLongitudUbicacion = undefined;
});

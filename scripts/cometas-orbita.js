// scripts/cometas-orbita.js
// Cometas en la vista Sistema solar: órbita (línea de puntos), posición según la fecha del reloj y cola que apunta lejos del Sol.
// Es una VISTA, no una efeméride: cada cometa usa sus elementos osculadores (JPL Small-Body Database, J2000) y se repite con su período
// desde el perihelio conocido más cercano; con los años la órbita real se desvía por los planetas. La parte fuera del dial (30,3 UA) no se dibuja.
// Para añadir un cometa: una entrada en COMETAS_ORBITA (q, e, i, nodo, argumento del perihelio en °; perihelios en JD; período en días).
// Depende de: planetas.js (GRAD, coordenadasOrbitales, resumenHeliocentrico, posicionEnVistaSistemaSolar, siglosDesdeJ2000, DIAL_UA_MAXIMA), astronomia.js (normalizarGrados)

const COMETAS_ORBITA = [
  { nombre: tx("Halley (1P)"), q: 0.5748638313743413, e: 0.9679359956953211, i: 162.1905300439129, nodo: 59.09894720612437, arg: 112.2414314637764,
    perihelios: [2391598.5, 2418781.5, 2446470.5, 2474033.5], periodo: 27728.05 },
  { nombre: tx("Encke (2P)"), q: 0.3380578611304654, e: 0.8477003352638754, i: 11.40704098723543, nodo: 334.1851099834068, arg: 187.1421582207019,
    perihelios: [2460239.681188389], periodo: 1207.915530076109 },
  { nombre: tx("Churyumov-Gerasimenko (67P)"), q: 1.243265640702404, e: 0.6409081308996354, i: 7.040294937543767, nodo: 50.13557377155012, arg: 12.79824970228189,
    perihelios: [2457247.5886578, 2459520.5], periodo: 2353.076067903661 },
  { nombre: tx("Hartley–IRAS (161P)"), q: 1.277330149886204, e: 0.8346684889670795, i: 95.6428369693173, nodo: 1.312092735709084, arg: 46.90947271024465,
    perihelios: [2461373.309104741], periodo: 7843.677327531275 },
  { nombre: tx("Hale-Bopp (C/1995 O1)"), q: 0.890537663547794, e: 0.9949810027633206, i: 89.28759424740302, nodo: 282.7334213961641, arg: 130.4146670659176,
    perihelios: [2450537.134907144], periodo: 863279.5 },
];
const COMETAS_UA_MAX = 30; // más allá la órbita sale del dial (radio 480)

let capaCometas = null, vistaCometasDibujada = null;
const cometasDibujo = []; // { c, el, orbita, marcador, cola }

function cometaElementos(c) {
  const a = c.q / (1 - c.e);
  return { a, e: c.e, I: c.i * GRAD, O: c.nodo * GRAD, w: c.arg + c.nodo };
}

function cometaKepler(M, e) {
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e > 0.8 ? Math.PI * Math.sign(M || 1) : M;
  for (let k = 0; k < 60; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
  return E;
}

// Perihelio más cercano a la fecha: de la lista conocida o repetido con el período desde el extremo más próximo
function cometaPerihelio(c, jd) {
  const lista = c.perihelios;
  let mejor = lista.reduce((m, t) => (Math.abs(t - jd) < Math.abs(m - jd) ? t : m), lista[0]);
  if (Math.abs(mejor - jd) > c.periodo / 2) mejor += Math.round((jd - mejor) / c.periodo) * c.periodo;
  return mejor;
}

function cometaPosicion(c, el, fecha) {
  const jd = fecha.getTime() / 86400000 + 2440587.5;
  const M = (2 * Math.PI * (jd - cometaPerihelio(c, jd))) / c.periodo;
  return resumenHeliocentrico(coordenadasOrbitales(el, cometaKepler(M, c.e)), siglosDesdeJ2000(fecha));
}

function cometaOrbitaTrazo(c, el, fecha) {
  const T = siglosDesdeJ2000(fecha);
  let d = "", dentro = false;
  for (let k = 0; k <= 360; k++) {
    const u = k / 180 - 1, E = Math.PI * (0.35 * u + 0.65 * u * u * u); // más puntos cerca del perihelio (E = 0)
    const r = resumenHeliocentrico(coordenadasOrbitales(el, E), T);
    if (r.distancia > COMETAS_UA_MAX) { dentro = false; continue; }
    const p = posicionEnVistaSistemaSolar(r);
    d += `${dentro ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    dentro = true;
  }
  return d;
}

function obtenerCapaCometas() {
  if (capaCometas?.isConnected) return capaCometas;
  capaCometas = null; cometasDibujo.length = 0; vistaCometasDibujada = null; // el cambio XY/XZ vacía capa-orbita-terrestre: se redibuja
  const padre = document.getElementById("capa-orbita-terrestre"); // se escala con el resto del Sistema solar
  if (!padre) return null;
  capaCometas = document.createElementNS(SVG_NS, "g");
  capaCometas.setAttribute("id", "capa-cometas");
  padre.appendChild(capaCometas);
  return capaCometas;
}

function dibujarCometas(fecha) {
  const capa = obtenerCapaCometas();
  if (!capa) return;
  if (!cometasDibujo.length) {
    COMETAS_ORBITA.forEach((c) => {
      const grupo = document.createElementNS(SVG_NS, "g");
      const orbita = document.createElementNS(SVG_NS, "path");
      orbita.setAttribute("class", "orbita-cometa");
      const cola = document.createElementNS(SVG_NS, "line");
      cola.setAttribute("class", "cola-cometa");
      const marcador = document.createElementNS(SVG_NS, "circle");
      marcador.setAttribute("class", "cometa");
      marcador.setAttribute("r", 3.6);
      marcador.setAttribute("role", "img");
      marcador.setAttribute("tabindex", "0");
      grupo.append(orbita, cola, marcador);
      capa.appendChild(grupo);
      cometasDibujo.push({ c, el: cometaElementos(c), orbita, marcador, cola });
    });
  }
  // La órbita solo se recalcula al cambiar de vista (XY/XZ) o cuando la fecha se aleja >1 año de la que se usó
  const clave = `${vistaSistemaSolar}|${Math.round(fecha.getTime() / 31557600000)}`;
  if (clave !== vistaCometasDibujada) {
    vistaCometasDibujada = clave;
    cometasDibujo.forEach((x) => x.orbita.setAttribute("d", cometaOrbitaTrazo(x.c, x.el, fecha)));
  }
}

// Se llama en cada fotograma desde main.js
function actualizarCometas(fecha) {
  if (!obtenerCapaCometas()) return;
  dibujarCometas(fecha);
  cometasDibujo.forEach((x) => {
    const r = cometaPosicion(x.c, x.el, fecha);
    const fuera = r.distancia > COMETAS_UA_MAX;
    x.marcador.style.display = x.cola.style.display = fuera ? "none" : "";
    if (fuera) return;
    const p = posicionEnVistaSistemaSolar(r);
    x.marcador.setAttribute("cx", p.x);
    x.marcador.setAttribute("cy", p.y);
    const lejos = Math.hypot(p.x - 600, p.y - 600) || 1, largo = r.distancia < 3 ? 6 + 18 * (1 - r.distancia / 3) : 0; // la cola crece cerca del Sol
    x.cola.setAttribute("x1", p.x);
    x.cola.setAttribute("y1", p.y);
    x.cola.setAttribute("x2", p.x + ((p.x - 600) / lejos) * largo);
    x.cola.setAttribute("y2", p.y + ((p.y - 600) / lejos) * largo);
    const txt = tx`${x.c.nombre} · a ${r.distancia.toLocaleString(localeActual(), { maximumFractionDigits: 1 })} UA del Sol`;
    if (x.marcador.getAttribute("data-tooltip") !== txt) { x.marcador.setAttribute("data-tooltip", txt); x.marcador.setAttribute("aria-label", txt); }
  });
}
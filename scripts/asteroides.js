// scripts/asteroides.js
// Cinturón principal de asteroides entre Marte y Júpiter: rocas marrón y negras que giran sobre sí mismas
// y orbitan el Sol (una vuelta cada a^1,5 años, ley de Kepler). Posición según la fecha simulada.
// Depende de: planetas.js (radioDelDial, anguloDelDial, siglosDesdeJ2000), astronomia.js (polar)

const CINTURON = {
  cantidad: 170,
  uaInterna: 2.1,      // borde interior del cinturón (UA); en el dial queda entre Marte y Júpiter
  uaExterna: 3.3,      // borde exterior (UA)
  tamanoMin: 1.3,      // radio de las rocas en unidades del dial
  tamanoMax: 3.4,
  vueltasPorAnio: 150, // giro sobre sí mismas (vueltas por año simulado); a x1 apenas se nota
};

const rocasAsteroides = []; // { grupo, anguloInicial, periodo, radio, faseGiro, sentidoGiro }
let capaAsteroides = null;

// Generador pseudoaleatorio con semilla: el cinturón se ve igual en cada carga
function generadorSemilla(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function obtenerCapaAsteroides() {
  if (capaAsteroides) return capaAsteroides;
  capaAsteroides = document.getElementById("capa-asteroides");
  if (!capaAsteroides) {
    capaAsteroides = document.createElementNS(SVG_NS, "g");
    capaAsteroides.setAttribute("id", "capa-asteroides");
    const planetas = document.getElementById("capa-planetas");
    planetas.parentNode.insertBefore(capaAsteroides, planetas); // bajo los planetas
  }
  capaAsteroides.setAttribute("data-tooltip", tx("Cinturón de asteroides"));
  capaAsteroides.setAttribute("aria-label", tx("Cinturón de asteroides"));
  capaAsteroides.setAttribute("role", "img");
  capaAsteroides.setAttribute("tabindex", "0");
  return capaAsteroides;
}

// Roca irregular: polígono de 7 vértices con radio variable
function poligonoRoca(azar, tamano) {
  const n = 7;
  const puntos = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI + (azar() - 0.5) * 0.5;
    const r = tamano * (0.65 + azar() * 0.5);
    puntos.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return puntos.join(" ");
}

function dibujarAsteroides() {
  const capa = obtenerCapaAsteroides();
  capa.innerHTML = "";
  rocasAsteroides.length = 0;
  const azar = generadorSemilla(20261003);
  for (let i = 0; i < CINTURON.cantidad; i++) {
    // Más densidad hacia el centro del cinturón (promedio de dos sorteos)
    const u = (azar() + azar()) / 2;
    const ua = CINTURON.uaInterna + u * (CINTURON.uaExterna - CINTURON.uaInterna);
    const tamano = CINTURON.tamanoMin + Math.pow(azar(), 2) * (CINTURON.tamanoMax - CINTURON.tamanoMin);
    const grupo = document.createElementNS(SVG_NS, "g");
    const areaActiva = document.createElementNS(SVG_NS, "circle");
    areaActiva.setAttribute("r", 6);
    areaActiva.setAttribute("fill", "transparent");
    areaActiva.setAttribute("pointer-events", "all");
    const roca = document.createElementNS(SVG_NS, "polygon");
    roca.setAttribute("points", poligonoRoca(azar, tamano));
    roca.setAttribute("class", azar() < 0.5 ? "roca-asteroide roca-marron" : "roca-asteroide roca-negra");
    grupo.append(areaActiva, roca);
    capa.appendChild(grupo);
    rocasAsteroides.push({
      grupo,
      ua,
      periodo: Math.pow(ua, 1.5),
      anguloInicial: azar() * 360,
      nodo: azar() * 360 * GRAD,
      inclinacion: azar() * 15 * GRAD,
      faseGiro: azar() * 360,
      sentidoGiro: azar() < 0.5 ? -1 : 1,
      velocidadGiro: 0.4 + azar() * 1.2,
    });
  }
}

// Se llama en cada fotograma desde main.js
function actualizarAsteroides(fecha) {
  if (!capaAsteroides || !rocasAsteroides.length) dibujarAsteroides();
  const anios = siglosDesdeJ2000(fecha) * 100;
  rocasAsteroides.forEach((r) => {
    const anomalia = (r.anguloInicial + (360 * anios) / r.periodo) * GRAD;
    const cosN = Math.cos(r.nodo), sinN = Math.sin(r.nodo);
    const cosA = Math.cos(anomalia), sinA = Math.sin(anomalia);
    const cosI = Math.cos(r.inclinacion), sinI = Math.sin(r.inclinacion);
    const posicion = {
      x: r.ua * (cosN * cosA - sinN * sinA * cosI),
      y: r.ua * (sinN * cosA + cosN * sinA * cosI),
      z: r.ua * sinA * sinI,
    };
    const p = posicionEnVistaSistemaSolar(posicion);
    const giro = r.faseGiro + r.sentidoGiro * r.velocidadGiro * CINTURON.vueltasPorAnio * 360 * anios;
    r.grupo.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(giro % 360).toFixed(1)})`);
  });
}

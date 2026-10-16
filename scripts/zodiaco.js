const CENTRO_ZODIACO_X = 600;
const CENTRO_ZODIACO_Y = 463.4;
const RADIO_ZODIACO = 343.4;
const RADIO_ETIQUETA = 300;

const SIGNOS = [
  { nombre: "Capricornio", simbolo: "♑" },
  { nombre: "Sagitario", simbolo: "♐" },
  { nombre: "Escorpio", simbolo: "♏" },
  { nombre: "Libra", simbolo: "♎" },
  { nombre: "Virgo", simbolo: "♍" },
  { nombre: "Leo", simbolo: "♌" },
  { nombre: "Cáncer", simbolo: "♋" },
  { nombre: "Géminis", simbolo: "♊" },
  { nombre: "Tauro", simbolo: "♉" },
  { nombre: "Aries", simbolo: "♈" },
  { nombre: "Piscis", simbolo: "♓" },
  { nombre: "Acuario", simbolo: "♒" },
];

function polarZodiaco(radio, gradosDesdeArriba) {
  const rad = (gradosDesdeArriba * Math.PI) / 180;
  return {
    x: CENTRO_ZODIACO_X + radio * Math.sin(rad),
    y: CENTRO_ZODIACO_Y - radio * Math.cos(rad),
  };
}

function crearDivisionZodiaco(grados) {
  const a = polarZodiaco(RADIO_ZODIACO, grados);
  const b = polarZodiaco(RADIO_ZODIACO - 20, grados);
  const linea = document.createElementNS(SVG_NS, "line");
  linea.setAttribute("x1", a.x);
  linea.setAttribute("y1", a.y);
  linea.setAttribute("x2", b.x);
  linea.setAttribute("y2", b.y);
  linea.setAttribute("class", "division-zodiaco");
  return linea;
}

const etiquetasZodiaco = []; 

function crearEtiquetaCurvaZodiaco(signo, medio) {
  const texto = `${signo.simbolo}  ${tx(signo.nombre)}`;
  const grupo = document.createElementNS(SVG_NS, "g");

  const anguloInicio = medio - 15;
  const anguloFin = medio + 15;

  const p1 = polarZodiaco(RADIO_ETIQUETA, anguloInicio);
  const p2 = polarZodiaco(RADIO_ETIQUETA, anguloFin);
  const sweep = 1; // Fijo para mantener la misma dirección uniforme

  const pathId = "path-zodiaco-" + Math.random().toString(36).slice(2, 11);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("id", pathId);
  path.setAttribute("d", `M ${p1.x} ${p1.y} A ${RADIO_ETIQUETA} ${RADIO_ETIQUETA} 0 0 ${sweep} ${p2.x} ${p2.y}`);
  path.setAttribute("fill", "none");
  grupo.appendChild(path);

  const textoEl = document.createElementNS(SVG_NS, "text");
  textoEl.setAttribute("class", "etiqueta-zodiaco");

  const textPath = document.createElementNS(SVG_NS, "textPath");
  textPath.setAttribute("href", "#" + pathId);
  textPath.setAttribute("startOffset", "50%");
  textPath.setAttribute("text-anchor", "middle");
  const simbolo = document.createElementNS(SVG_NS, "tspan");
  simbolo.setAttribute("class", "simbolo-zodiacal");
  simbolo.textContent = `${signo.simbolo}\uFE0E`;
  const nombre = document.createElementNS(SVG_NS, "tspan");
  nombre.textContent = `\u00A0${tx(signo.nombre)}`;
  textPath.append(simbolo, nombre);

  textoEl.appendChild(textPath);
  grupo.appendChild(textoEl);

  etiquetasZodiaco.push({ elemento: grupo, path: path, medio: medio });

  return grupo;
}

function dibujarZodiaco() {
  const capa = document.getElementById("capa-zodiaco");
  for (let i = 0; i < 12; i++) {
    const inicio = i * 30;
    const medio = inicio + 15;
    capa.appendChild(crearDivisionZodiaco(inicio));
    capa.appendChild(crearEtiquetaCurvaZodiaco(SIGNOS[i], medio));
  }
}

function actualizarEtiquetasZodiaco(anguloRotacion) {
  etiquetasZodiaco.forEach(({ path, medio }) => {
    const anguloInicio = medio - 15;
    const anguloFin = medio + 15;

    const p1 = polarZodiaco(RADIO_ETIQUETA, anguloInicio);
    const p2 = polarZodiaco(RADIO_ETIQUETA, anguloFin);
    const sweep = 1;

    path.setAttribute("d", `M ${p1.x} ${p1.y} A ${RADIO_ETIQUETA} ${RADIO_ETIQUETA} 0 0 ${sweep} ${p2.x} ${p2.y}`);
  });
}
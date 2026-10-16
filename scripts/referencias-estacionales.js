// scripts/referencias-estacionales.js
 
const EVENTOS_ESTACIONALES = [
  {
    nombre: "equinoccio-primavera",
    longitud: 0,
    etiqueta: tx("Equinoccio de primavera"),
  },
  { nombre: "solsticio-verano", longitud: 90, etiqueta: tx("Solsticio de verano") },
  {
    nombre: "equinoccio-otonio",
    longitud: 180,
    etiqueta: tx("Equinoccio de otoño"),
  },
  {
    nombre: "solsticio-invierno",
    longitud: 270,
    etiqueta: tx("Solsticio de invierno"),
  },
];
 
const TOLERANCIA_GRADOS = 0.5; // ~medio día de movimiento solar
 
function dibujarReferenciasEstacionales() {
  const capa = document.getElementById("capa-referencias-estacionales");
  capa.innerHTML = "";
 
  EVENTOS_ESTACIONALES.forEach(({ nombre, longitud }) => {
    const rotacion = normalizarGrados(longitud - 300);
    const radio = radioActualDelZodiaco(RADIO_ZODIACO, rotacion);
 
    const circulo = document.createElementNS(SVG_NS, "circle");
    circulo.setAttribute("cx", 600);
    circulo.setAttribute("cy", 600);
    circulo.setAttribute("r", radio);
    circulo.setAttribute("class", `referencia-estacional referencia-${nombre}`);
    capa.appendChild(circulo);
  });
 
  const ejeLectura = document.createElementNS(SVG_NS, "line");
  ejeLectura.setAttribute("x1", 600);
  ejeLectura.setAttribute("y1", -360);
  ejeLectura.setAttribute("x2", 600);
  ejeLectura.setAttribute("y2", 1560);
  ejeLectura.setAttribute("class", "eje-lectura-estacional");
  capa.appendChild(ejeLectura);
}
 
function actualizarEventoEstacional(fecha, anguloRotacion) {
  const capa = document.getElementById("capa-marcador-estacional");
  capa.innerHTML = "";
 
  const { longitudEcliptica } = posicionSolar(fecha);
 
  const eventoActivo = EVENTOS_ESTACIONALES.find(({ longitud }) => {
    let diferencia = Math.abs(longitudEcliptica - longitud);
    if (diferencia > 180) diferencia = 360 - diferencia;
    return diferencia <= TOLERANCIA_GRADOS;
  });
 
  if (!eventoActivo) return;
 
  const radio = radioActualDelZodiaco(RADIO_ZODIACO, anguloRotacion);
  const punto = polar(radio, 0);
 
  const marcador = document.createElementNS(SVG_NS, "circle");
  marcador.setAttribute("cx", punto.x);
  marcador.setAttribute("cy", punto.y);
  marcador.setAttribute("r", 8);
  marcador.setAttribute("class", "punto-evento-estacional");
  capa.appendChild(marcador);
 
  const etiqueta = document.createElementNS(SVG_NS, "text");
  const centroActual = rotarPunto(
    { x: CENTRO_ZODIACO_X, y: CENTRO_ZODIACO_Y },
    anguloRotacion,
  );
  etiqueta.setAttribute("x", centroActual.x);
  etiqueta.setAttribute("y", centroActual.y);
  etiqueta.setAttribute("class", "etiqueta-evento-estacional");
  etiqueta.textContent = eventoActivo.etiqueta;
  capa.appendChild(etiqueta);
}
 
// ───────── Anillo de estaciones (bajo el calendario, radios 745–780) ─────────
// Cada día del año es un sector del anillo, coloreado según la longitud
// eclíptica REAL del Sol ese día: las estaciones salen con su duración real
// (no cuatro cuartos iguales) y se mezclan suavemente en cada frontera.
// Rota junto con el calendario (mismo ángulo que #capa-calendario).
 
const ANILLO_ESTACIONES = {
  radioInterno: 740,
  radioExterno: 780,
  mezclaGrados: 12, // transición a cada lado de cada equinoccio/solsticio
};
 
// [r, g, b] — suaves pero distintivos
const COLORES_ESTACION = {
  primavera: [122, 168, 128],
  verano: [214, 178, 104],
  otonio: [190, 124, 86],
  invierno: [128, 164, 202],
};
 
// Sectores eclípticos 0–90, 90–180, 180–270, 270–360 según el hemisferio
function estacionesPorSector(sur) {
  const c = COLORES_ESTACION;
  return sur
    ? [c.otonio, c.invierno, c.primavera, c.verano]
    : [c.primavera, c.verano, c.otonio, c.invierno];
}
 
function mezclarRGB(a, b, peso) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * peso));
}
 
function colorEstacionPorLongitud(longitud, sur) {
  const orden = estacionesPorSector(sur);
  const m = ANILLO_ESTACIONES.mezclaGrados;
  const sector = Math.floor(longitud / 90) % 4;
  const dentro = longitud - sector * 90;
  const actual = orden[sector];
 
  if (dentro < m) {
    // frontera anterior: 50 % en el límite, 100 % actual a `m` grados
    const previo = orden[(sector + 3) % 4];
    return mezclarRGB(previo, actual, 0.5 + (0.5 * dentro) / m);
  }
  if (dentro > 90 - m) {
    const siguiente = orden[(sector + 1) % 4];
    return mezclarRGB(actual, siguiente, (0.5 * (dentro - (90 - m))) / m);
  }
  return actual;
}
 
function trazoSectorAnillo(radioInterno, radioExterno, a0, a1) {
  const p1 = polar(radioExterno, a0);
  const p2 = polar(radioExterno, a1);
  const p3 = polar(radioInterno, a1);
  const p4 = polar(radioInterno, a0);
  return (
    `M ${p1.x} ${p1.y} A ${radioExterno} ${radioExterno} 0 0 1 ${p2.x} ${p2.y} ` +
    `L ${p3.x} ${p3.y} A ${radioInterno} ${radioInterno} 0 0 0 ${p4.x} ${p4.y} Z`
  );
}
 
function dibujarAnilloEstaciones(anio, sur) {
  const capa = document.getElementById("capa-estaciones");
  capa.innerHTML = "";
 
  const N = diasEnAnio(anio);
  const paso = 360 / N;
  const { radioInterno, radioExterno } = ANILLO_ESTACIONES;
 
  for (let i = 0; i < N; i++) {
    // Longitud eclíptica del Sol al mediodía (UTC) de ese día del año
    const { longitudEcliptica } = posicionSolar(new Date(Date.UTC(anio, 0, 1 + i, 12)));
    const [r, g, b] = colorEstacionPorLongitud(longitudEcliptica, sur);
 
    const sector = document.createElementNS(SVG_NS, "path");
    // +0.15° de solape evita líneas finas entre sectores contiguos
    sector.setAttribute("d", trazoSectorAnillo(radioInterno, radioExterno, i * paso, (i + 1) * paso + 0.15));
    sector.setAttribute("fill", `rgb(${r},${g},${b})`);
    sector.setAttribute("class", "sector-estacion");
    capa.appendChild(sector);
  }
}
 
let claveAnilloEstaciones = null;
 
// Se llama en cada fotograma: redibuja solo si cambia el año o el hemisferio
function actualizarAnilloEstaciones(ahora, anguloCalendario) {
  const anio = aHoraDePared(ahora).getUTCFullYear();
  const sur = ubicacion.latitud !== null && ubicacion.latitud < 0;
  const clave = `${anio}|${sur}`;
  if (clave !== claveAnilloEstaciones) {
    claveAnilloEstaciones = clave;
    dibujarAnilloEstaciones(anio, sur);
  }
  document
    .getElementById("capa-estaciones")
    .setAttribute("transform", `rotate(${anguloCalendario} 600 600)`);
}
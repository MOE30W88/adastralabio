// scripts/traslacion.js
// Órbita de la Tierra y de los demás planetas alrededor del Sol central.
// Depende de: planetas.js (radioDelDial, PLANETAS, posicionHeliocentrica...)
 
const planetasEnDial = {}; // nombre -> <circle>
const PLANETA_TIERRA = PLANETAS.find((p) => p.esTierra);
 
function trazoDesdePuntos(puntos) {
  const [inicio, ...resto] = puntos;
  return (
    `M ${inicio.x} ${inicio.y} ` +
    resto.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    " Z"
  );
}
 
// Disco oscuro (sin llegar a negro) tras las órbitas para que contrasten
function dibujarFondoTraslacion() {
  const svg = document.getElementById("reloj");
  if (!svg || document.getElementById("capa-fondo-traslacion")) return;
  const capa = document.createElementNS(SVG_NS, "g");
  capa.setAttribute("id", "capa-fondo-traslacion");
  const disco = document.createElementNS(SVG_NS, "circle");
  disco.setAttribute("id", "fondo-traslacion");
  disco.setAttribute("cx", 600);
  disco.setAttribute("cy", 600);
  disco.setAttribute("r", DIAL_RADIO_MAXIMO);
  capa.appendChild(disco);
  svg.insertBefore(capa, svg.querySelector(":scope > g"));
}
 
function dibujarOrbitaTerrestre() {
  dibujarFondoTraslacion();
  const capa = document.getElementById("capa-orbita-terrestre");
  if (!capa) {
    console.error("Falta <g id='capa-orbita-terrestre'></g> en index.html");
    return;
  }
  const puntosTierra = puntosDeOrbita(PLANETA_TIERRA, obtenerFechaActual());
  const orbita = document.createElementNS(SVG_NS, "path");
  orbita.setAttribute("d", trazoDesdePuntos(puntosTierra));
  orbita.setAttribute("class", "orbita-terrestre");
  capa.appendChild(orbita);
 
  [0, 45, 90, 135].forEach((indice) => {
    const p = puntosTierra[indice];
    const marca = document.createElementNS(SVG_NS, "circle");
    marca.setAttribute("cx", p.x);
    marca.setAttribute("cy", p.y);
    marca.setAttribute("r", 4);
    marca.setAttribute("class", "marca-orbital");
    capa.appendChild(marca);
  });
 
  const tierra = document.createElementNS(SVG_NS, "circle");
  tierra.setAttribute("id", "tierra-orbital");
  tierra.setAttribute("r", 3.16);
  tierra.setAttribute("data-tooltip", "Tierra");
  tierra.setAttribute("aria-label", "Tierra");
  tierra.setAttribute("role", "img");
  tierra.setAttribute("tabindex", "0");
  capa.appendChild(tierra);
 
  dibujarOrbitasPlanetarias();
}
 
// Órbitas (bajo el zodiaco) y puntos de los planetas (sobre él)
function dibujarOrbitasPlanetarias() {
  const capaOrbitas = document.getElementById("capa-orbitas-planetarias");
  const capaPlanetas = document.getElementById("capa-planetas");
  if (!capaOrbitas || !capaPlanetas) {
    console.error("Faltan <g id='capa-orbitas-planetarias'> o <g id='capa-planetas'> en index.html");
    return;
  }
  const fecha = obtenerFechaActual();
 
  PLANETAS.filter((p) => !p.esTierra).forEach((planeta) => {
    const orbita = document.createElementNS(SVG_NS, "path");
    orbita.setAttribute("d", trazoDesdePuntos(puntosDeOrbita(planeta, fecha)));
    orbita.setAttribute("class", "orbita-planeta");
    capaOrbitas.appendChild(orbita);
 
    const punto = document.createElementNS(SVG_NS, "circle");
    punto.setAttribute("r", planeta.radioDibujo);
    punto.setAttribute("fill", planeta.color);
    punto.setAttribute("class", "planeta");
    punto.setAttribute("data-tooltip", tx(planeta.nombre));
    punto.setAttribute("aria-label", tx(planeta.nombre));
    punto.setAttribute("role", "img");
    punto.setAttribute("tabindex", "0");
    capaPlanetas.appendChild(punto);
    planetasEnDial[planeta.nombre] = punto;
  });
}
 
function actualizarTraslacion(fecha) {
  const tierra = document.getElementById("tierra-orbital");
  if (tierra) {
    const posicionTierra = posicionHeliocentrica(PLANETA_TIERRA, fecha);
    const p = posicionEnVistaSistemaSolar(posicionTierra);
    tierra.setAttribute("cx", p.x);
    tierra.setAttribute("cy", p.y);
    actualizarProfundidadMarcador(tierra, posicionTierra);
  }
 
  PLANETAS.forEach((planeta) => {
    const punto = planetasEnDial[planeta.nombre];
    if (!punto) return;
    const posicion = posicionHeliocentrica(planeta, fecha);
    const xy = posicionEnVistaSistemaSolar(posicion);
    punto.setAttribute("cx", xy.x);
    punto.setAttribute("cy", xy.y);
    actualizarProfundidadMarcador(punto, posicion);
  });
}

// En la vista XZ, Y es la profundidad: los cuerpos del lado del observador se dibujan sobre el Sol.
function actualizarProfundidadMarcador(marcador, posicion) {
  const delante = vistaSistemaSolar === "xz" && posicion.y > 0;
  const capaDelante = document.getElementById("capa-planetas-frente");
  const capaBase = marcador.id === "tierra-orbital"
    ? document.getElementById("capa-orbita-terrestre")
    : document.getElementById("capa-planetas");
  const destino = delante ? capaDelante : capaBase;
  if (destino && marcador.parentElement !== destino) destino.appendChild(marcador);
}

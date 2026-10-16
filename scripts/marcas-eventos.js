// scripts/marcas-eventos.js
// Capa Día y noche: marcas sobre la circunferencia del anillo día/noche con la hora de cada evento solar.
// El anillo es un dial de 24 h (mediodía arriba, medianoche abajo), así que cada evento cae en el mismo
// ángulo en que el anillo cambia de color. Las horas salen de calcularEfemeridesSolares() (efemerides-solares.js).
// Solo se ve con el enfoque "Día y noche" (ver css/dia-noche.css).

const RADIO_ANILLO_EXTERNO = 600;
const RADIO_FIN_MARCA = 636;     // la marca sale del anillo hasta aquí
const RADIO_TEXTO_EVENTO = 700;      // donde termina la guía y empieza el texto
const SEPARACION_MINIMA = 40;    // alto mínimo entre etiquetas del mismo lado (unidades del SVG)

// lado: "izq" = por la mañana, "arriba" = mediodía, "der" = por la tarde; tipo: "sol" (dorado) o "crepusculo" (hielo)
const EVENTOS_DIA_NOCHE = [
  { clave: "albaAstro", texto: tx("Alba astronómica"), lado: "izq", tipo: "crepusculo", leer: (e) => e.alba.astronomico },
  { clave: "albaNautico", texto: tx("Alba náutica"), lado: "izq", tipo: "crepusculo", leer: (e) => e.alba.nautico },
  { clave: "albaCivil", texto: tx("Alba civil"), lado: "izq", tipo: "crepusculo", leer: (e) => e.alba.civil },
  { clave: "salida", texto: tx("Salida del Sol"), lado: "izq", tipo: "sol", leer: (e) => e.alba.salida },
  { clave: "mediodia", texto: tx("Mediodía solar"), lado: "arriba", tipo: "sol", leer: (e) => e.mediodia },
  { clave: "puesta", texto: tx("Puesta del Sol"), lado: "der", tipo: "sol", leer: (e) => e.ocaso.salida },
  { clave: "ocasoCivil", texto: tx("Ocaso civil"), lado: "der", tipo: "crepusculo", leer: (e) => e.ocaso.civil },
  { clave: "ocasoNautico", texto: tx("Ocaso náutico"), lado: "der", tipo: "crepusculo", leer: (e) => e.ocaso.nautico },
  { clave: "ocasoAstro", texto: tx("Ocaso astronómico"), lado: "der", tipo: "crepusculo", leer: (e) => e.ocaso.astronomico },
];

let claveMarcasEventos = null;

function nuevoElementoMarca(nombre, atributos, padre) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  if (padre) padre.appendChild(el);
  return el;
}

// Separa verticalmente las etiquetas de un lado para que no se pisen (de arriba hacia abajo)
function separarEtiquetas(lista) {
  lista.sort((a, b) => a.y - b.y);
  for (let i = 1; i < lista.length; i++) {
    if (lista[i].y - lista[i - 1].y < SEPARACION_MINIMA) lista[i].y = lista[i - 1].y + SEPARACION_MINIMA;
  }
}

function dibujarMarcasEventos(ahora) {
  const capa = document.getElementById("capa-marcas-eventos");
  capa.replaceChildren();
  const efemerides = calcularEfemeridesSolares(ahora);
  const inicioDia = medianocheLocal(ahora).getTime();

  const eventos = EVENTOS_DIA_NOCHE
    .map((d) => ({ ...d, ms: d.leer(efemerides) }))
    .filter((ev) => ev.ms !== null && ev.ms !== undefined);

  eventos.forEach((ev) => {
    ev.angulo = (ev.ms - inicioDia) / 60000 / 4 - 180; // mismo ángulo que usa el anillo (eventos-solares.js)
    const base = polar(RADIO_TEXTO_EVENTO, ev.angulo);
    ev.x = base.x;
    ev.y = base.y;
  });

  separarEtiquetas(eventos.filter((ev) => ev.lado === "izq"));
  separarEtiquetas(eventos.filter((ev) => ev.lado === "der"));

  eventos.forEach((ev) => {
    const inicio = polar(RADIO_ANILLO_EXTERNO, ev.angulo);
    const fin = polar(RADIO_FIN_MARCA, ev.angulo);
    nuevoElementoMarca("line", { class: `marca-evento ${ev.tipo}`, x1: inicio.x, y1: inicio.y, x2: fin.x, y2: fin.y }, capa);
    nuevoElementoMarca("line", { class: "guia-evento", x1: fin.x, y1: fin.y, x2: ev.x, y2: ev.lado === "arriba" ? ev.y : ev.y }, capa);

    const anclaje = ev.lado === "izq" ? "end" : ev.lado === "der" ? "start" : "middle";
    const desplazamientoX = ev.lado === "izq" ? -12 : ev.lado === "der" ? 12 : 0;
    const desplazamientoY = ev.lado === "arriba" ? -14 : 0;
    const texto = nuevoElementoMarca("text", { class: "texto-evento", x: ev.x + desplazamientoX, y: ev.y + desplazamientoY, "text-anchor": anclaje }, capa);
    const nombre = nuevoElementoMarca("tspan", {}, texto);
    nombre.textContent = ev.texto;
    const hora = nuevoElementoMarca("tspan", { class: "hora-evento", dx: 10 }, texto);
    hora.textContent = textoHM(ev.ms);
  });
}

// Redibuja solo cuando cambia el día de pared, el huso o el lugar
function actualizarMarcasEventos(ahora) {
  if (ubicacion.latitud === null) return;
  const clave = claveDiaYLugar(ahora);
  if (clave === claveMarcasEventos) return;
  claveMarcasEventos = clave;
  dibujarMarcasEventos(ahora);
}
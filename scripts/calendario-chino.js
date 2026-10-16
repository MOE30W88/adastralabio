// scripts/calendario-chino.js
// Rueda del zodiaco chino (solo visible en el enfoque "Calendario").
// 12 sectores de 30° entre los radios 480 y 600: figura del animal (radio 535), símbolo chino dentro (radio 400)
// y, fuera, 3 aros con los años de cada animal: el aro interior es el ciclo de 12 años en curso, el medio el
// anterior y el exterior el anterior a ése. Cada 12 años (al empezar una Rata) los números se desplazan un aro hacia afuera.
// La rueda gira con el año chino (Año Nuevo lunar, calendario-chino-calculo.js): el marcador fijo arriba lee el sector activo.
// Depende de: calendario-chino-calculo.js, constelaciones.js (existeIcono), iconos-svg.js (iconoEnmascarado), astronomia.js (polar)

const CALENDARIO_CHINO = {
  radioAroInterior: 480,
  radioAroExterior: 600,       // las divisiones radiales van de 480 a 600
  radioFigura: 535,
  tamanoFigura: 85,
  radioSimbolo: 400,
  tamanoSimbolo: 80,
  radiosAnios: [625, 675, 725], // aro 0 (ciclo actual), aro 1 (anterior), aro 2 (el anterior a ése)
  separadoresAnios: [650, 700],
  radioLimite: 750,            // radio máximo de la rueda (borde exterior de la zona sombreada del año activo)
  radioMarcador: 478,          // punta del marcador fijo (arriba, dentro del aro de 480, apuntando hacia afuera)
};

// Orden tradicional; "archivo" es el nombre usado en svg/zodiaco-chino/
const ANIMALES_CHINOS = [
  { archivo: "rata", nombre: tx("Rata") }, { archivo: "buey", nombre: tx("Buey") }, { archivo: "tigre", nombre: tx("Tigre") },
  { archivo: "conejo", nombre: tx("Conejo") }, { archivo: "dragon", nombre: tx("Dragón") }, { archivo: "serpiente", nombre: tx("Serpiente") },
  { archivo: "caballo", nombre: tx("Caballo") }, { archivo: "cabra", nombre: tx("Cabra") }, { archivo: "mono", nombre: tx("Mono") },
  { archivo: "gallo", nombre: tx("Gallo") }, { archivo: "perro", nombre: tx("Perro") }, { archivo: "cerdo", nombre: tx("Cerdo") },
];
const RUTAS_ZODIACO_CHINO = {
  figura: (n) => `svg/zodiaco-chino/figuras/fig.${n}.svg`,
  simbolo: (n) => `svg/zodiaco-chino/simbolos/simb.${n}.svg`,
};
const ANIO_RATA_BASE = 4; // 4 d. C. fue año de Rata: (año − 4) mod 12 = índice del animal

let capaCalendarioChino = null;
let ruedaChina = null;                // grupo que gira
const sectoresChinos = [];            // { grupo, anios: [<text> ×3] }
let sectorChinoActivo = -1;
let cicloChinoDibujado = null;

function crearSvgChino(etiqueta, atributos) {
  const el = document.createElementNS(SVG_NS, etiqueta);
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function sectorAnular(r0, r1, a0, a1) {
  const p = (r, a) => polar(r, a);
  const a = p(r1, a0), b = p(r1, a1), c = p(r0, a1), d = p(r0, a0);
  return `M ${a.x} ${a.y} A ${r1} ${r1} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${r0} ${r0} 0 0 0 ${d.x} ${d.y} Z`;
}

function colocarIconoChino(contenedor, tipo, archivo, tamano, clase) {
  const ruta = new URL(RUTAS_ZODIACO_CHINO[tipo](archivo), document.baseURI).href;
  existeIcono(ruta).then((existe) => {
    if (existe) contenedor.appendChild(iconoEnmascarado(ruta, -tamano / 2, -tamano / 2, tamano, tamano, clase, "xMidYMid"));
  });
}

function dibujarCalendarioChino() {
  const C = CALENDARIO_CHINO;
  const svg = document.getElementById("reloj");
  capaCalendarioChino = crearSvgChino("g", { id: "capa-calendario-chino" });
  svg.insertBefore(capaCalendarioChino, document.getElementById("capa-calendario"));

  // Aros
  [C.radioAroInterior, C.radioAroExterior].forEach((r) =>
    capaCalendarioChino.appendChild(crearSvgChino("circle", { cx: 600, cy: 600, r, class: "aro-chino" })));
  C.separadoresAnios.forEach((r) =>
    capaCalendarioChino.appendChild(crearSvgChino("circle", { cx: 600, cy: 600, r, class: "aro-chino-tenue" })));

  ruedaChina = crearSvgChino("g", { class: "rueda-china" });
  capaCalendarioChino.appendChild(ruedaChina);

  ANIMALES_CHINOS.forEach((animal, i) => {
    const a0 = i * 30, a1 = a0 + 30, medio = a0 + 15;
    const grupo = crearSvgChino("g", { class: "sector-chino" });
    const titulo = crearSvgChino("title", {});
    titulo.textContent = animal.nombre;
    grupo.appendChild(titulo);

    grupo.appendChild(crearSvgChino("path", { d: sectorAnular(C.radioAroInterior, C.radioLimite, a0, a1), class: "sombra-sector-chino" }));
    const d0 = polar(C.radioAroInterior, a0), d1 = polar(C.radioAroExterior, a0);
    grupo.appendChild(crearSvgChino("line", { x1: d0.x, y1: d0.y, x2: d1.x, y2: d1.y, class: "division-china" }));

    // Figura (520) y símbolo (375) sobre la línea radial del centro del sector
    const radial = crearSvgChino("g", { transform: `rotate(${medio} 600 600)` });
    const figura = crearSvgChino("g", { transform: `translate(600 ${600 - C.radioFigura})` });
    const simbolo = crearSvgChino("g", { transform: `translate(600 ${600 - C.radioSimbolo})` });
    radial.append(figura, simbolo);
    grupo.appendChild(radial);
    colocarIconoChino(figura, "figura", animal.archivo, C.tamanoFigura, "icono-figura-china");
    colocarIconoChino(simbolo, "simbolo", animal.archivo, C.tamanoSimbolo, "icono-simbolo-chino");

    // Años: un texto por aro
    const anios = C.radiosAnios.map((r, anillo) => {
      const p = polar(r, medio);
      const t = crearSvgChino("text", { x: p.x, y: p.y, transform: `rotate(${medio} ${p.x} ${p.y})`, class: `anio-chino anillo-${anillo}` });
      grupo.appendChild(t);
      return t;
    });
    ruedaChina.appendChild(grupo);
    sectoresChinos.push({ grupo, anios });
  });

  // Marcador fijo arriba (apunta al sector activo)
  const punta = 600 - C.radioMarcador;
  capaCalendarioChino.appendChild(crearSvgChino("path", {
    d: `M 600 ${punta} L 588 ${punta + 24} L 612 ${punta + 24} Z`, class: "marcador-chino",
  }));
}

// Escribe los años: aro 0 = ciclo en curso, aro 1 = el anterior, aro 2 = el anterior a ése
function escribirAniosChinos(anioChino) {
  const ciclo = Math.floor((anioChino - ANIO_RATA_BASE) / 12);
  if (ciclo === cicloChinoDibujado) return;
  cicloChinoDibujado = ciclo;
  const base = ANIO_RATA_BASE + 12 * ciclo;
  sectoresChinos.forEach((s, i) => s.anios.forEach((t, anillo) => { t.textContent = base - 12 * anillo + i; }));
}

// Se llama en cada fotograma desde main.js
function actualizarCalendarioChino(fecha) {
  if (!capaCalendarioChino) dibujarCalendarioChino();
  const { anio, fraccion } = estadoAnioChino(fecha);
  const indice = (((anio - ANIO_RATA_BASE) % 12) + 12) % 12;
  escribirAniosChinos(anio);
  // El marcador (arriba) recorre el sector activo desde su borde inicial hasta el final a lo largo del año chino
  ruedaChina.setAttribute("transform", `rotate(${-30 * (indice + fraccion)} 600 600)`);
  if (indice !== sectorChinoActivo) {
    sectorChinoActivo = indice;
    sectoresChinos.forEach((s, i) => s.grupo.classList.toggle("activo", i === indice));
  }
}
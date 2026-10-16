// scripts/constelaciones.js
// Aro de las 12 constelaciones del zodiaco, fuera del calendario (radios ~850–990).
// Cada sección abarca 30° de la eclíptica y se coloca en el calendario según el día en que el Sol
// cruza sus límites. La sección que queda bajo el marcador del calendario se marca como activa.
// Rota junto con el calendario. Dibujos: svg/zodiaco-occidental/ (constelaciones, figura, simbolo); si falta uno, un comodín.
// Depende de: astronomia.js, planetas.js (precesión), calendario.js, marco.js, hora-local.js, panel-resultados.js (diaMesCortoPanel)
 
const ANILLO_CONSTELACIONES = {
  radioArco: 900,
  radioGlifo: 845,        // posición de la constelación en la vista general
  tamanoGlifo: 120,
  radioGlifoZodiaco: 800,
  tamanoGlifoZodiaco: 175,
  radioNombre: 917,
  // Vista "Zodíaco": cada sección muestra, de dentro hacia afuera, símbolo · figura · constelación
  radioSimbolo: 545,
  tamanoSimbolo: 100,
  radioFigura: 655,
  tamanoFigura: 130,
  radioAro: 480,
  radioDivisionInterno: 745,
  radioDivisionInternoZodiaco: 480,
  radioDivisionExterno: 968,
};
// En el enfoque Zodíaco los glifos se acercan al centro y aumentan de tamaño.

// Archivos de svg/zodiaco-occidental/. Si el nombre del archivo difiere de la clave, se corrige en ARCHIVO_SIGNO.
const RUTAS_ZODIACO = {
  constelacion: (n) => `svg/zodiaco-occidental/constelaciones/cons.${n}.svg`,
  figura: (n) => `svg/zodiaco-occidental/figura/fig.${n}.svg`,
  simbolo: (n) => `svg/zodiaco-occidental/simbolo/simb.${n}.svg`,
};
const ARCHIVO_SIGNO = { escorpio: "escorpion" };
 
// Las 12 secciones son IGUALES: 30° de longitud eclíptica cada una, contadas desde el equinoccio de marzo
// (zodiaco tropical, igual que el anillo del zodiaco y el panel de resultados). Así la sección activa
// coincide con el signo solar: Libra empieza en el equinoccio de septiembre. Sin tramos cortos ni Ofiuco.
const INICIO_SECCIONES = 0;
const AMPLITUD_SECCION = 30;

const CONSTELACIONES = [
  { clave: "aries", nombre: "Aries" },
  { clave: "tauro", nombre: "Tauro" },
  { clave: "geminis", nombre: "Géminis" },
  { clave: "cancer", nombre: "Cáncer" },
  { clave: "leo", nombre: "Leo" },
  { clave: "virgo", nombre: "Virgo" },
  { clave: "libra", nombre: "Libra" },
  { clave: "escorpio", nombre: "Escorpio" },
  { clave: "sagitario", nombre: "Sagitario" },
  { clave: "capricornio", nombre: "Capricornio" },
  { clave: "acuario", nombre: "Acuario" },
  { clave: "piscis", nombre: "Piscis" },
].map((c, i) => ({
  ...c,
  desde: normalizarGrados(INICIO_SECCIONES + i * AMPLITUD_SECCION),
  hasta: normalizarGrados(INICIO_SECCIONES + (i + 1) * AMPLITUD_SECCION),
}));

// Nombre mostrado (c.nombre se conserva en español: otros módulos lo comparan)
const TEXTOS_CONSTELACIONES = {
  es: {},
  en: { aries: "Aries", tauro: "Taurus", geminis: "Gemini", cancer: "Cancer", leo: "Leo", virgo: "Virgo", libra: "Libra", escorpio: "Scorpio", sagitario: "Sagittarius", capricornio: "Capricorn", acuario: "Aquarius", piscis: "Pisces" },
};
const nombreConstelacion = (c) => textoDe(TEXTOS_CONSTELACIONES, c.clave) ?? c.nombre;

// ── Cálculo de fechas ──────────────────────────────────────────
// Longitud del Sol (equinoccio de la fecha, como el zodiaco tropical) al mediodía UTC de cada día; se "desenrolla" para que crezca sin saltos
function longitudesSolaresDelAnio(anio) {
  const N = diasEnAnio(anio);
  const lam = [];
  let previo = null;
  let vueltas = 0;
  for (let i = 0; i <= N; i++) {
    const fecha = new Date(Date.UTC(anio, 0, 1 + i, 12));
    const l = normalizarGrados(posicionSolar(fecha).longitudEcliptica);
    if (previo !== null && l < previo - 180) vueltas += 1;
    previo = l;
    lam.push(l + 360 * vueltas);
  }
  return { N, lam };
}
 
// Posición en días (desde el 1 de enero 00:00) en que el Sol cruza la longitud `limite`
function diaDeCruce(lam, limite) {
  for (let k = -1; k <= 2; k++) {
    const B = limite + 360 * k;
    for (let i = 0; i < lam.length - 1; i++) {
      if (lam[i] <= B && B < lam[i + 1]) {
        return i + 0.5 + (B - lam[i]) / (lam[i + 1] - lam[i]);
      }
    }
  }
  return null;
}
 
function textoFechaDelAnio(anio, dias) {
  const f = new Date(Date.UTC(anio, 0, 1) + dias * 86400000);
  return diaMesCortoPanel(f.getUTCDate(), f.getUTCMonth()); // panel-resultados.js
}
 
// ── Dibujo ─────────────────────────────────────────────────────
let capaConstelaciones = null;
const sectoresConstelaciones = []; // { grupo, aIni, aFin } en grados del calendario
let sectorActivo = -1;
 
function obtenerCapaConstelaciones() {
  if (capaConstelaciones) return capaConstelaciones;
  capaConstelaciones = document.getElementById("capa-constelaciones");
  if (!capaConstelaciones) {
    capaConstelaciones = document.createElementNS(SVG_NS, "g");
    capaConstelaciones.setAttribute("id", "capa-constelaciones");
    const calendario = document.getElementById("capa-calendario");
    calendario.parentNode.insertBefore(capaConstelaciones, calendario);
  }
  return capaConstelaciones;
}
 
function trazoArcoConstelacion(radio, a0, a1) {
  const p0 = polar(radio, a0);
  const p1 = polar(radio, a1);
  const grande = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${radio} ${radio} 0 ${grande} 1 ${p1.x} ${p1.y}`;
}
 
// Dibujo comodín: cinco estrellas unidas por líneas
function crearGlifoComodin() {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "glifo-comodin");
  const pts = [[-22, 14], [-10, -6], [4, 4], [14, -14], [24, 2]];
  const linea = document.createElementNS(SVG_NS, "polyline");
  linea.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
  g.appendChild(linea);
  pts.forEach(([x, y]) => {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    c.setAttribute("r", 3);
    g.appendChild(c);
  });
  return g;
}
 
// Sondea (una sola vez por archivo) si un SVG existe, para no dibujar máscaras vacías
const sondeoIconos = {};
function existeIcono(ruta) {
  if (!(ruta in sondeoIconos)) {
    sondeoIconos[ruta] = new Promise((resolver) => {
      const sonda = new Image();
      sonda.onload = () => resolver(true);
      sonda.onerror = () => resolver(false);
      sonda.src = ruta;
    });
  }
  return sondeoIconos[ruta];
}

// Filtro de resplandor (desenfoque) que usan las constelaciones; se crea una vez en el <svg>
function asegurarFiltroResplandor() {
  const svg = document.getElementById("reloj");
  if (svg.querySelector("#filtro-resplandor")) return;
  const defs = document.createElementNS(SVG_NS, "defs");
  const filtro = document.createElementNS(SVG_NS, "filter");
  filtro.setAttribute("id", "filtro-resplandor");
  filtro.setAttribute("x", "-60%");
  filtro.setAttribute("y", "-60%");
  filtro.setAttribute("width", "220%");
  filtro.setAttribute("height", "220%");
  const desenfoque = document.createElementNS(SVG_NS, "feGaussianBlur");
  desenfoque.setAttribute("stdDeviation", "3.5");
  filtro.appendChild(desenfoque);
  defs.appendChild(filtro);
  svg.insertBefore(defs, svg.firstChild);
}

// Pone el SVG del signo (constelación, figura o símbolo) centrado en el origen del contenedor, pintado con la paleta.
// Si es una constelación, añade un resplandor que parpadea suave (simula el brillo de las estrellas).
// Devuelve una promesa: true si el archivo existía.
function agregarIconoZodiaco(contenedor, clave, tipo, tamano, clase, retardoBrillo = null) {
  const ruta = new URL(RUTAS_ZODIACO[tipo](ARCHIVO_SIGNO[clave] || clave), document.baseURI).href;
  return existeIcono(ruta).then((existe) => {
    if (!existe) return false;
    const icono = iconoEnmascarado(ruta, -tamano / 2, -tamano / 2, tamano, tamano, clase, "xMidYMid");
    if (retardoBrillo !== null) {
      const relleno = icono.querySelector("rect");
      const resplandor = document.createElementNS(SVG_NS, "g"); // el filtro va en un grupo: así desenfoca la forma YA enmascarada
      resplandor.setAttribute("class", "constelacion-resplandor");
      resplandor.style.setProperty("--retardo", `-${retardoBrillo}s`);
      resplandor.appendChild(relleno.cloneNode());
      icono.insertBefore(resplandor, relleno);
    }
    contenedor.appendChild(icono);
    return true;
  });
}
 
function dibujarConstelaciones(anio) {
  const capa = obtenerCapaConstelaciones();
  capa.innerHTML = "";
  sectoresConstelaciones.length = 0;
  sectorActivo = -1;
  const { N, lam } = longitudesSolaresDelAnio(anio);
  const { radioArco, radioGlifo, radioNombre, radioDivisionInterno, radioDivisionExterno } = ANILLO_CONSTELACIONES;

  const reloj = document.getElementById("reloj");
  reloj.style.setProperty("--desplazamiento-glifo-zodiaco", `${radioGlifo - ANILLO_CONSTELACIONES.radioGlifoZodiaco}px`);
  reloj.style.setProperty("--escala-glifo-zodiaco", ANILLO_CONSTELACIONES.tamanoGlifoZodiaco / ANILLO_CONSTELACIONES.tamanoGlifo);
 
  asegurarFiltroResplandor();
  const aro = document.createElementNS(SVG_NS, "circle");
  aro.setAttribute("cx", 600);
  aro.setAttribute("cy", 600);
  aro.setAttribute("r", ANILLO_CONSTELACIONES.radioAro);
  aro.setAttribute("class", "aro-zodiaco");
  capa.appendChild(aro);
  CONSTELACIONES.forEach((c, indice) => {
    const dIni = diaDeCruce(lam, c.desde);
    const dFin = diaDeCruce(lam, c.hasta);
    if (dIni === null || dFin === null) return;
    const aIni = (dIni / N) * 360;
    let aFin = (dFin / N) * 360;
    if (aFin <= aIni) aFin += 360; // tramo que cruza el cambio de año
    const medio = normalizarGrados((aIni + aFin) / 2);
 
    const grupo = document.createElementNS(SVG_NS, "g");
    grupo.setAttribute("class", "constelacion");
    const titulo = document.createElementNS(SVG_NS, "title");
    titulo.textContent = `${nombreConstelacion(c)} · ${textoFechaDelAnio(anio, dIni)} – ${textoFechaDelAnio(anio, dFin)}`;
    grupo.appendChild(titulo);
 
    const arco = document.createElementNS(SVG_NS, "path");
    arco.setAttribute("d", trazoArcoConstelacion(radioArco, aIni + 0.4, aFin - 0.4));
    arco.setAttribute("class", "arco-constelacion");
    grupo.appendChild(arco);
 
    // División radial en el límite inicial de la sección.
    const d0 = polar(radioDivisionInterno, aIni);
    const d1 = polar(radioDivisionExterno, aIni);
    const division = document.createElementNS(SVG_NS, "line");
    division.setAttribute("x1", d0.x);
    division.setAttribute("y1", d0.y);
    division.setAttribute("x2", d1.x);
    division.setAttribute("y2", d1.y);
    division.setAttribute("class", "division-constelacion");
    division.dataset.angulo = aIni;
    grupo.appendChild(division);

    // Constelación: el comodín se sustituye por el SVG del signo en cuanto carga
    const p = polar(radioGlifo, medio);
    const glifo = document.createElementNS(SVG_NS, "g");
    glifo.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${medio})`);
    const interior = document.createElementNS(SVG_NS, "g");
    interior.setAttribute("class", "glifo-constelacion");
    const comodin = crearGlifoComodin();
    interior.appendChild(comodin);
    glifo.appendChild(interior);
    grupo.appendChild(glifo);
    agregarIconoZodiaco(interior, c.clave, "constelacion", ANILLO_CONSTELACIONES.tamanoGlifo, "icono-constelacion", (indice * 0.9) % 5).then((ok) => {
      if (ok && comodin.parentNode === interior) interior.removeChild(comodin);
    });

    // Símbolo y figura (solo visibles en el enfoque Zodíaco), sobre la misma línea radial que la constelación
    const adorno = document.createElementNS(SVG_NS, "g");
    adorno.setAttribute("class", "adorno-zodiaco");
    adorno.setAttribute("transform", `rotate(${medio} 600 600)`);
    const simbolo = document.createElementNS(SVG_NS, "g");
    simbolo.setAttribute("transform", `translate(600 ${600 - ANILLO_CONSTELACIONES.radioSimbolo})`);
    const figura = document.createElementNS(SVG_NS, "g");
    figura.setAttribute("transform", `translate(600 ${600 - ANILLO_CONSTELACIONES.radioFigura})`);
    adorno.append(simbolo, figura);
    grupo.appendChild(adorno);
    agregarIconoZodiaco(simbolo, c.clave, "simbolo", ANILLO_CONSTELACIONES.tamanoSimbolo, "icono-simbolo");
    agregarIconoZodiaco(figura, c.clave, "figura", ANILLO_CONSTELACIONES.tamanoFigura, "icono-figura");

    const pn = polar(radioNombre, medio);
    const nombre = document.createElementNS(SVG_NS, "text");
    nombre.setAttribute("x", pn.x);
    nombre.setAttribute("y", pn.y);
    nombre.setAttribute("transform", `rotate(${medio} ${pn.x} ${pn.y})`);
    nombre.setAttribute("class", "nombre-constelacion");
    nombre.textContent = nombreConstelacion(c);
    grupo.appendChild(nombre);
 
    capa.appendChild(grupo);
    sectoresConstelaciones.push({ grupo, aIni, aFin });
  });
}

function actualizarEnfoqueConstelaciones(clave) {
  const radioInterno = clave === "zodiaco"
    ? ANILLO_CONSTELACIONES.radioDivisionInternoZodiaco
    : ANILLO_CONSTELACIONES.radioDivisionInterno;

  document.querySelectorAll(".division-constelacion").forEach((division) => {
    const inicio = polar(radioInterno, Number(division.dataset.angulo));
    division.setAttribute("x1", inicio.x);
    division.setAttribute("y1", inicio.y);
  });
}

// Marca como activa la sección que está bajo el marcador del calendario (arriba, ángulo 0 de pantalla)
function marcarConstelacionActiva(anguloCalendario) {
  const a = normalizarGrados(-anguloCalendario); // posición del marcador en el sistema del calendario
  const i = sectoresConstelaciones.findIndex(
    (s) => (a >= s.aIni && a < s.aFin) || (a + 360 >= s.aIni && a + 360 < s.aFin),
  );
  if (i === sectorActivo) return;
  sectorActivo = i;
  sectoresConstelaciones.forEach((s, j) => s.grupo.classList.toggle("activa", j === i));
}
 
let anioConstelaciones = null;
document.addEventListener("cambio-idioma", () => { anioConstelaciones = null; }); // fuerza el redibujo con los nombres del nuevo idioma
 
// Se llama en cada fotograma: redibuja solo al cambiar de año y rota con el calendario
function actualizarConstelaciones(ahora, anguloCalendario) {
  const anio = aHoraDePared(ahora).getUTCFullYear();
  if (anio !== anioConstelaciones) {
    anioConstelaciones = anio;
    dibujarConstelaciones(anio);
  }
  obtenerCapaConstelaciones().setAttribute("transform", `rotate(${anguloCalendario} 600 600)`);
  marcarConstelacionActiva(anguloCalendario);
}

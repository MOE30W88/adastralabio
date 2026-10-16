// scripts/panel-resultados.js
// Panel "Resultados actuales" — fase 1. Construye las tarjetas al cargar
// (antes de main.js, que escribe en #pais-ciudad y #ubicacion) y las actualiza ~2 veces por segundo.
 
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const FASES_LUNARES = ["Luna nueva", "Creciente", "Cuarto creciente", "Gibosa creciente", "Luna llena", "Gibosa menguante", "Cuarto menguante", "Menguante"];
const ESTACIONES = ["Primavera", "Verano", "Otoño", "Invierno"];
 
// g: civil | astro — k: clave — t: título — a: ayuda didáctica
// Iconos: basta guardar iconos/<clave>.svg (clave = k). Opcional: icono: "otra/ruta.svg". Sin archivo se muestra ✦.
const TARJETAS = [
  { g: "civil", k: "lugar", t: "Lugar", a: "Ciudad y país del lugar que el reloj está usando." },
  { g: "civil", k: "coordenadas", t: "Coordenadas", a: "Latitud: distancia al ecuador (+ norte, − sur). Longitud: distancia al meridiano de Greenwich (+ este, − oeste)." },
  { g: "civil", k: "fecha", t: "Fecha", a: "Día de la semana y fecha en el lugar activo, con el número de día dentro del año." },
  { g: "civil", k: "huso", t: "Huso horario", a: "Diferencia entre la hora del lugar y la hora universal (GMT/UTC). En ubicación manual se estima por longitud (15° = 1 hora)." },
  { g: "civil", k: "salida", t: "Salida del Sol", a: "Momento en que el borde superior del Sol asoma en el horizonte." },
  { g: "civil", k: "puesta", t: "Puesta del Sol", a: "Momento en que el Sol termina de ocultarse bajo el horizonte." },
  { g: "civil", k: "duracion", t: "Duración del día", a: "Tiempo entre la salida y la puesta del Sol. Cambia a lo largo del año según la latitud." },
  { g: "civil", k: "fase", t: "Fase lunar", a: "Qué parte del disco lunar está iluminada vista desde la Tierra." },
  { g: "civil", k: "signo", t: "Signo solar", a: "Sector de 30° de la eclíptica donde está el Sol, contado desde el equinoccio de marzo (zodiaco tropical). No coincide con la constelación visible: por la precesión de los equinoccios, hoy los signos están desfasados unos 24° respecto a las constelaciones del mismo nombre." },
  { g: "civil", k: "estacion", t: "Estación", a: "Estación astronómica según la posición del Sol en la eclíptica y el hemisferio del lugar." },
  { g: "astro", k: "albaAstro", t: "Alba astronómica", a: "Sol a 18° bajo el horizonte: empieza a clarear el cielo, todavía casi noche cerrada." },
  { g: "astro", k: "albaNautico", t: "Alba náutica", a: "Sol a 12° bajo el horizonte: se distingue el horizonte marino y las estrellas más brillantes." },
  { g: "astro", k: "albaCivil", t: "Alba civil", a: "Sol a 6° bajo el horizonte: hay luz suficiente para actividades al aire libre sin luz artificial." },
  { g: "astro", k: "mediodia", t: "Mediodía solar", a: "Instante en que el Sol alcanza su altura máxima del día (cruza el meridiano local)." },
  { g: "astro", k: "ocasoCivil", t: "Ocaso civil", a: "Sol a 6° bajo el horizonte tras la puesta: termina la luz útil del día." },
  { g: "astro", k: "ocasoNautico", t: "Ocaso náutico", a: "Sol a 12° bajo el horizonte: el horizonte marino ya no se distingue." },
  { g: "astro", k: "ocasoAstro", t: "Ocaso astronómico", a: "Sol a 18° bajo el horizonte: comienza la noche astronómica, ideal para observar estrellas." },
  { g: "astro", k: "horaSolar", t: "Hora solar verdadera", a: "La hora que marcaría un reloj de sol: 12:00 cuando el Sol cruza el meridiano. Difiere de la hora civil por el huso y por la ecuación del tiempo." },
  { g: "astro", k: "ecuacion", t: "Ecuación del tiempo", a: "Diferencia entre el Sol real y un Sol ideal de movimiento uniforme, causada por la órbita elíptica y la inclinación del eje terrestre." },
  { g: "astro", k: "alturaSol", t: "Altura del Sol", a: "Ángulo del Sol sobre el horizonte: 0° es el horizonte, 90° el cenit; negativo = bajo el horizonte." },
  { g: "astro", k: "alturaLuna", t: "Altura de la Luna", a: "Ángulo de la Luna sobre el horizonte; negativo = bajo el horizonte." },
  { g: "astro", k: "declinacion", t: "Declinación solar", a: "Latitud celeste del Sol: +23,4° en el solsticio de junio, −23,4° en el de diciembre, 0° en los equinoccios." },
  { g: "astro", k: "edadLunar", t: "Edad lunar", a: "Días transcurridos desde la última luna nueva (el ciclo dura ≈ 29,5 días)." },
];
 
const TARJETAS_EN = {
  lugar: ["Location", "City and country of the place the clock is using."],
  coordenadas: ["Coordinates", "Latitude: distance from the equator (+ north, − south). Longitude: distance from the Greenwich meridian (+ east, − west)."],
  fecha: ["Date", "Day of the week and date at the active location, with the day number within the year."],
  huso: ["Time zone", "Difference between local time and universal time (GMT/UTC). With a manual location it is estimated from longitude (15° = 1 hour)."],
  salida: ["Sunrise", "Moment when the upper limb of the Sun appears on the horizon."],
  puesta: ["Sunset", "Moment when the Sun finishes disappearing below the horizon."],
  duracion: ["Day length", "Time between sunrise and sunset. It changes through the year depending on latitude."],
  fase: ["Moon phase", "How much of the lunar disk is lit as seen from Earth."],
  signo: ["Sun sign", "30° sector of the ecliptic where the Sun is, counted from the March equinox (tropical zodiac). It does not match the visible constellation: because of the precession of the equinoxes, the signs today are offset by about 24° from the constellations of the same name."],
  estacion: ["Season", "Astronomical season according to the Sun's position on the ecliptic and the hemisphere of the location."],
  albaAstro: ["Astronomical dawn", "Sun 18° below the horizon: the sky begins to lighten, still almost full night."],
  albaNautico: ["Nautical dawn", "Sun 12° below the horizon: the sea horizon and the brightest stars can be made out."],
  albaCivil: ["Civil dawn", "Sun 6° below the horizon: enough light for outdoor activities without artificial light."],
  mediodia: ["Solar noon", "Instant when the Sun reaches its maximum altitude of the day (crosses the local meridian)."],
  ocasoCivil: ["Civil dusk", "Sun 6° below the horizon after sunset: useful daylight ends."],
  ocasoNautico: ["Nautical dusk", "Sun 12° below the horizon: the sea horizon can no longer be made out."],
  ocasoAstro: ["Astronomical dusk", "Sun 18° below the horizon: astronomical night begins, ideal for observing stars."],
  horaSolar: ["Apparent solar time", "The time a sundial would show: 12:00 when the Sun crosses the meridian. It differs from civil time by the time zone and the equation of time."],
  ecuacion: ["Equation of time", "Difference between the real Sun and an ideal Sun moving uniformly, caused by the elliptical orbit and the tilt of Earth's axis."],
  alturaSol: ["Sun altitude", "Angle of the Sun above the horizon: 0° is the horizon, 90° the zenith; negative = below the horizon."],
  alturaLuna: ["Moon altitude", "Angle of the Moon above the horizon; negative = below the horizon."],
  declinacion: ["Solar declination", "Celestial latitude of the Sun: +23.4° at the June solstice, −23.4° at the December solstice, 0° at the equinoxes."],
  edadLunar: ["Moon age", "Days elapsed since the last new moon (the cycle lasts ≈ 29.5 days)."],
};
const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DIAS_SEMANA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TEXTOS_PANEL = {
  es: {
    tarjetas: Object.fromEntries(TARJETAS.map((t) => [t.k, [t.t, t.a]])),
    queEs: (t) => `¿Qué es ${t}?`,
    fases: FASES_LUNARES,
    estaciones: ESTACIONES,
    fecha: (dia, d, mes) => `${dia} ${d} de ${mes.toLowerCase()}`,
    diaDelAnio: (n, total) => `día ${n} de ${total}`,
    husoManual: "estimado por longitud", husoDispositivo: "de tu dispositivo",
    iluminada: (p) => `${p}% iluminada`, dias: (n) => `${n} días`,
    zodiacoTropical: (l) => `zodiaco tropical · ${l}°`,
    hemisferioSur: "hemisferio sur", hemisferioNorte: "hemisferio norte",
    solMedianoche: "Sol de medianoche", nochePolar: "Noche polar",
    sobreHorizonte: "sobre el horizonte", bajoHorizonte: "bajo el horizonte",
  },
  en: {
    tarjetas: TARJETAS_EN,
    queEs: (t) => `What is ${t}?`,
    fases: ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"],
    estaciones: ["Spring", "Summer", "Autumn", "Winter"],
    fecha: (dia, d, mes) => `${dia}, ${mes} ${d}`,
    diaDelAnio: (n, total) => `day ${n} of ${total}`,
    husoManual: "estimated from longitude", husoDispositivo: "from your device",
    iluminada: (p) => `${p}% illuminated`, dias: (n) => `${n} days`,
    zodiacoTropical: (l) => `tropical zodiac · ${l}°`,
    hemisferioSur: "southern hemisphere", hemisferioNorte: "northern hemisphere",
    solMedianoche: "Midnight Sun", nochePolar: "Polar night",
    sobreHorizonte: "above the horizon", bajoHorizonte: "below the horizon",
  },
};
const textoPanel = (clave, ...args) => textoDe(TEXTOS_PANEL, clave, ...args);

// Fechas localizadas, compartidas con panel-lecturas-capas.js y constelaciones.js (es: igual que antes, a partir de MESES / DIAS_SEMANA)
const enIngles = () => idiomaActual() === "en";
const diaSemanaPanel = (i) => (enIngles() ? DIAS_SEMANA_EN[i] : DIAS_SEMANA[i]);
const mesLargoPanel = (i) => (enIngles() ? MESES_EN[i] : MESES[i]);
const mesCortoPanel = (i) => (enIngles() ? MESES_EN[i].slice(0, 3) : MESES[i].slice(0, 3).toLowerCase());
const diaMesCortoPanel = (d, i) => (enIngles() ? `${mesCortoPanel(i)} ${d}` : `${d} ${mesCortoPanel(i)}`);

const refsPanel = {};
const cabecerasPanel = []; // { k, cab, ayuda, boton } para reescribir los textos fijos al cambiar de idioma
 
// Ids que escriben main.js y ubicacion.js
const IDS_EXTERNOS = { lugar: "pais-ciudad", coordenadas: "ubicacion" };
 
function construirPanel() {
  for (const t of TARJETAS) {
    const grid = document.getElementById(t.g === "civil" ? "grid-civil" : "grid-astro");
    if (!grid) continue;
    const idValor = IDS_EXTERNOS[t.k];
    const el = document.createElement("div");
    el.className = "tarjeta";
    // Icono automático: iconos/<clave>.svg (o la ruta de t.icono). Si el archivo no existe se queda el ✦
    // Ruta absoluta: dentro de una variable CSS, una ruta relativa se resolvería desde css/ y fallaría
    const rutaIcono = new URL(t.icono || `svg/iconos/${t.k}.svg`, document.baseURI).href;
    const sonda = new Image();
    sonda.onload = () => {
      el.classList.add("con-icono");
      el.style.setProperty("--icono", `url("${rutaIcono}")`);
    };
    sonda.src = rutaIcono;
    const [titulo, ayuda] = textoPanel("tarjetas")[t.k];
    el.innerHTML =
      `<div class="tarjeta-cabecera">${titulo}</div>` +
      `<strong class="tarjeta-valor" ${idValor ? `id="${idValor}"` : ""}>—</strong>` +
      `<span class="tarjeta-sub"></span>` +
      `<p class="tarjeta-ayuda">${ayuda}</p>` +
      `<button type="button" class="ayuda" aria-label="${textoPanel("queEs", titulo)}">?</button>`;
    grid.appendChild(el);
    cabecerasPanel.push({ k: t.k, cab: el.querySelector(".tarjeta-cabecera"), ayuda: el.querySelector(".tarjeta-ayuda"), boton: el.querySelector(".ayuda") });
    if (!idValor) {
      refsPanel[t.k] = {
        valor: el.querySelector(".tarjeta-valor"),
        sub: el.querySelector(".tarjeta-sub"),
      };
    }
  }
}
construirPanel();
document.addEventListener("cambio-idioma", () => {
  for (const c of cabecerasPanel) {
    const [titulo, ayuda] = textoPanel("tarjetas")[c.k];
    c.cab.textContent = titulo; c.ayuda.textContent = ayuda; c.boton.setAttribute("aria-label", textoPanel("queEs", titulo));
  }
  ultimoSigno = ""; ultimoRefrescoPanel = 0; // el siguiente fotograma reescribe todos los valores
});
 
function poner(k, valor, sub = "") {
  const r = refsPanel[k];
  if (!r) return;
  if (r.valor.textContent !== valor) r.valor.textContent = valor;
  if (r.sub.textContent !== sub) r.sub.textContent = sub;
}
 
// El símbolo va en su propio <span> (fuente de símbolos, dorado) y con \uFE0E para forzar la
// versión de texto y evitar el emoji de color.
let ultimoSigno = "";
function ponerSigno(signo, sub) {
  const r = refsPanel.signo;
  const html = `<span class="simbolo-zodiacal">${signo.simbolo}\uFE0E</span> ${tx(signo.nombre)}`;
  if (html !== ultimoSigno) {
    r.valor.innerHTML = html;
    ultimoSigno = html;
  }
  if (r.sub.textContent !== sub) r.sub.textContent = sub;
}
 
function textoHM(ms) {
  if (ms === null || ms === undefined) return "—";
  const p = aHoraDePared(new Date(ms));
  return `${dosDigitos(p.getUTCHours())}:${dosDigitos(p.getUTCMinutes())}`;
}
 
function textoHoraDecimal(h) {
  const s = Math.floor(h * 3600);
  return `${dosDigitos(Math.floor(s / 3600) % 24)}:${dosDigitos(Math.floor(s / 60) % 60)}:${dosDigitos(s % 60)}`;
}
 
let claveEfemeridesPanel = null;
let efemeridesPanel = null;
let ultimoRefrescoPanel = 0;
 
function actualizarPanelResultados(ahora) {
  const t = performance.now();
  if (t - ultimoRefrescoPanel < 500) return;
  ultimoRefrescoPanel = t;
 
  const p = aHoraDePared(ahora);
  const anio = p.getUTCFullYear();
  poner("fecha", textoPanel("fecha", diaSemanaPanel(p.getUTCDay()), p.getUTCDate(), mesLargoPanel(p.getUTCMonth())), textoPanel("diaDelAnio", Math.floor(diaDelAnioFraccional(p)) + 1, diasEnAnio(anio)));
  poner("huso", textoHusoHorario(husoDelLugar(ahora)), textoPanel(ubicacion.esManual ? "husoManual" : "husoDispositivo"));
 
  const instanteMs = ahora.getTime();
  const fp = faseLunarPrecisa(instanteMs);
  const elong = fp.creciente ? fp.elongacion : 360 - fp.elongacion;
  const fase = textoPanel("fases")[Math.floor(elong / 45 + 0.5) % 8];
  let kLuna = Math.floor((instanteMs / 86400000 + 2440587.5 - 2451550.09766) / 29.530588861);
  if (lunaNuevaMeeus(kLuna + 1) <= instanteMs) kLuna++; else if (lunaNuevaMeeus(kLuna) > instanteMs) kLuna--;
  const edad = (instanteMs - lunaNuevaMeeus(kLuna)) / 86400000;
  poner("fase", fase, textoPanel("iluminada", Math.round(fp.fraccion * 100)));
  poner("edadLunar", textoPanel("dias", edad.toFixed(1)));
 
  const solar = posicionSolar(ahora);
  const signo = SIGNOS[Math.floor(normalizarGrados(-anguloZodiaco(ahora)) / 30)];
  ponerSigno(signo, textoPanel("zodiacoTropical", solar.longitudEcliptica.toFixed(1)));
  poner("declinacion", `${solar.declinacion.toFixed(2)}°`);
 
  if (ubicacion.latitud === null) return;
 
  const q = Math.floor(solar.longitudEcliptica / 90);
  const sur = ubicacion.latitud < 0;
  poner("estacion", textoPanel("estaciones")[sur ? (q + 2) % 4 : q], textoPanel(sur ? "hemisferioSur" : "hemisferioNorte"));
 
  const clave = claveDiaYLugar(ahora);
  if (clave !== claveEfemeridesPanel) {
    claveEfemeridesPanel = clave;
    efemeridesPanel = calcularEfemeridesSolares(ahora);
  }
  const e = efemeridesPanel;
 
  if (e.estado === "normal") {
    poner("salida", textoHM(e.alba.salida));
    poner("puesta", textoHM(e.ocaso.salida));
    let d = e.ocaso.salida - e.alba.salida;
    if (d < 0) d += 86400000;
    poner("duracion", `${Math.floor(d / 3600000)} h ${Math.floor((d % 3600000) / 60000)} min`);
  } else {
    const texto = textoPanel(e.estado === "sol-medianoche" ? "solMedianoche" : "nochePolar");
    poner("salida", texto);
    poner("puesta", texto);
    poner("duracion", e.estado === "sol-medianoche" ? "24 h" : "0 h");
  }
  poner("albaAstro", textoHM(e.alba.astronomico));
  poner("albaNautico", textoHM(e.alba.nautico));
  poner("albaCivil", textoHM(e.alba.civil));
  poner("mediodia", textoHM(e.mediodia));
  poner("ocasoCivil", textoHM(e.ocaso.civil));
  poner("ocasoNautico", textoHM(e.ocaso.nautico));
  poner("ocasoAstro", textoHM(e.ocaso.astronomico));
 
  poner("horaSolar", textoHoraDecimal(horaSolarVerdadera(ahora)));
  const eq = ecuacionDelTiempoMin(ahora);
  const eqAbs = Math.abs(eq);
  poner("ecuacion", `${eq < 0 ? "−" : "+"}${Math.floor(eqAbs)} min ${Math.floor((eqAbs % 1) * 60)} s`);
 
  const alturaSol = posicionSolarHorizonte(ahora, ubicacion.latitud, ubicacion.longitud).altura;
  poner("alturaSol", `${alturaSol.toFixed(1)}°`, textoPanel(alturaSol >= 0 ? "sobreHorizonte" : "bajoHorizonte"));
  const alturaLuna = posicionLunarHorizonte(ahora, ubicacion.latitud, ubicacion.longitud).altura;
  poner("alturaLuna", `${alturaLuna.toFixed(1)}°`, textoPanel(alturaLuna >= 0 ? "sobreHorizonte" : "bajoHorizonte"));
}
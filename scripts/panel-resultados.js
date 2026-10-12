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
 
const refsPanel = {};
 
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
    el.innerHTML =
      `<div class="tarjeta-cabecera">${t.t}</div>` +
      `<strong class="tarjeta-valor" ${idValor ? `id="${idValor}"` : ""}>—</strong>` +
      `<span class="tarjeta-sub"></span>` +
      `<p class="tarjeta-ayuda">${t.a}</p>` +
      `<button type="button" class="ayuda" aria-label="¿Qué es ${t.t}?">?</button>`;
    grid.appendChild(el);
    if (!idValor) {
      refsPanel[t.k] = {
        valor: el.querySelector(".tarjeta-valor"),
        sub: el.querySelector(".tarjeta-sub"),
      };
    }
  }
}
construirPanel();
 
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
  const html = `<span class="simbolo-zodiacal">${signo.simbolo}\uFE0E</span> ${signo.nombre}`;
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
  poner("fecha", `${DIAS_SEMANA[p.getUTCDay()]} ${p.getUTCDate()} de ${MESES[p.getUTCMonth()].toLowerCase()}`, `día ${Math.floor(diaDelAnioFraccional(p)) + 1} de ${diasEnAnio(anio)}`);
  poner("huso", textoHusoHorario(husoDelLugar(ahora)), ubicacion.esManual ? "estimado por longitud" : "de tu dispositivo");
 
  const instanteMs = ahora.getTime();
  const fp = faseLunarPrecisa(instanteMs);
  const elong = fp.creciente ? fp.elongacion : 360 - fp.elongacion;
  const fase = FASES_LUNARES[Math.floor(elong / 45 + 0.5) % 8];
  let kLuna = Math.floor((instanteMs / 86400000 + 2440587.5 - 2451550.09766) / 29.530588861);
  if (lunaNuevaMeeus(kLuna + 1) <= instanteMs) kLuna++; else if (lunaNuevaMeeus(kLuna) > instanteMs) kLuna--;
  const edad = (instanteMs - lunaNuevaMeeus(kLuna)) / 86400000;
  poner("fase", fase, `${Math.round(fp.fraccion * 100)}% iluminada`);
  poner("edadLunar", `${edad.toFixed(1)} días`);
 
  const solar = posicionSolar(ahora);
  const signo = SIGNOS[Math.floor(normalizarGrados(-anguloZodiaco(ahora)) / 30)];
  ponerSigno(signo, `zodiaco tropical · ${solar.longitudEcliptica.toFixed(1)}°`);
  poner("declinacion", `${solar.declinacion.toFixed(2)}°`);
 
  if (ubicacion.latitud === null) return;
 
  const q = Math.floor(solar.longitudEcliptica / 90);
  const sur = ubicacion.latitud < 0;
  poner("estacion", ESTACIONES[sur ? (q + 2) % 4 : q], sur ? "hemisferio sur" : "hemisferio norte");
 
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
    const texto = e.estado === "sol-medianoche" ? "Sol de medianoche" : "Noche polar";
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
  poner("alturaSol", `${alturaSol.toFixed(1)}°`, alturaSol >= 0 ? "sobre el horizonte" : "bajo el horizonte");
  const alturaLuna = posicionLunarHorizonte(ahora, ubicacion.latitud, ubicacion.longitud).altura;
  poner("alturaLuna", `${alturaLuna.toFixed(1)}°`, alturaLuna >= 0 ? "sobre el horizonte" : "bajo el horizonte");
}
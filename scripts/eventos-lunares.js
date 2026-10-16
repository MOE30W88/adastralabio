// scripts/eventos-lunares.js
// Motor de eventos lunares (todo en ms UTC): fases exactas, superluna, microluna, luna azul, luna negra, luna de la cosecha,
// mareas vivas extremas y eclipses. Alimenta el carrusel de Próximos eventos (eventosParaCarrusel).
// Definiciones (editables en EVL):
//   · Superluna / microluna: luna llena a menos del 10 % del recorrido perigeo–apogeo medido desde el perigeo / desde el apogeo.
//   · Luna azul: segunda luna llena de un mes; luna negra: segunda luna nueva de un mes (mes civil de la hora local del lugar).
//   · Luna de la cosecha: la luna llena más cercana al equinoccio de septiembre.
//   · Mareas vivas extremas: luna nueva o llena con índice de marea ≥ LUNARIO_MAREAS.extremas (±1,5 días del instante exacto).
// Depende de: efemerides-precisas.js, calendario-chino-calculo.js (lunaNuevaMeeus, instanteLongitudSolar), eclipses.js, lunario.js (lunMareas, LUNARIO_MAREAS),
//             eclipse-vista.js (geometriaVistaLunar), hora-local.js (husoDelLugar, aHoraDePared; opcional)

const EVL = {
  DIA_MS: 86400000,
  SINODICO_DIAS: 29.530588861,
  LIMITE_SUPERLUNA_KM: 362500,   // criterio habitual en calendarios y prensa (el estricto de Nolle, 361 430 km, deja fuera varias "superlunas" famosas)
  LIMITE_MICROLUNA_KM: 401700,
};

const TEXTOS_EVENTOS_LUNARES = {
  es: {
    "eclipse-solar-parcial": "Eclipse solar parcial", "eclipse-solar-total": "Eclipse solar total",
    "eclipse-solar-anular": "Eclipse solar anular", "eclipse-solar-híbrido": "Eclipse solar híbrido",
    "eclipse-lunar-penumbral": "Eclipse lunar penumbral", "eclipse-lunar-parcial": "Eclipse lunar parcial", "eclipse-lunar-total": "Eclipse lunar total",
    superluna: "Superluna", microluna: "Microluna", "luna-azul": "Luna azul", "luna-negra": "Luna negra",
    "luna-cosecha": "Luna de la cosecha", "mareas-vivas": "Mareas vivas extremas",
    visibleAqui: "Visible desde tu ubicación", noVisibleAqui: "No visible desde tu ubicación", segunLugar: "Visibilidad según tu ubicación",
    parcialAqui: (p) => `Visible desde tu ubicación (${p} % del Sol)`,
    distancia: (km) => `A ${km} km de la Tierra`,
    azul: "Segunda luna llena del mes", negra: "Segunda luna nueva del mes", cosecha: "La luna llena más cercana al equinoccio",
    mareas: (p) => `Fuerza de marea ${p} %`,
  },
  en: {
    "eclipse-solar-parcial": "Partial solar eclipse", "eclipse-solar-total": "Total solar eclipse",
    "eclipse-solar-anular": "Annular solar eclipse", "eclipse-solar-híbrido": "Hybrid solar eclipse",
    "eclipse-lunar-penumbral": "Penumbral lunar eclipse", "eclipse-lunar-parcial": "Partial lunar eclipse", "eclipse-lunar-total": "Total lunar eclipse",
    superluna: "Supermoon", microluna: "Micromoon", "luna-azul": "Blue Moon", "luna-negra": "Black Moon",
    "luna-cosecha": "Harvest Moon", "mareas-vivas": "Extreme spring tides",
    visibleAqui: "Visible from your location", noVisibleAqui: "Not visible from your location", segunLugar: "Visibility depends on your location",
    parcialAqui: (p) => `Visible from your location (${p} % of the Sun)`,
    distancia: (km) => `${km} km from Earth`,
    azul: "Second full moon of the month", negra: "Second new moon of the month", cosecha: "The full moon closest to the equinox",
    mareas: (p) => `Tidal force ${p} %`,
  },
};
function textoEventoLunar(clave, dato) {
  const t = TEXTOS_EVENTOS_LUNARES[typeof idiomaActual === "function" ? idiomaActual() : "es"] || TEXTOS_EVENTOS_LUNARES.es;
  const v = t[clave] ?? TEXTOS_EVENTOS_LUNARES.es[clave];
  return typeof v === "function" ? v(dato) : v;
}

// Iconos: los de eclipses son los tuyos (svg/eclipses/); los demás van en svg/eventos/
const ICONOS_EVENTOS_LUNARES = {
  "eclipse-solar-parcial": "svg/eclipses/eclipsesolarparcial.svg", "eclipse-solar-total": "svg/eclipses/eclipsesolartotal.svg",
  "eclipse-solar-anular": "svg/eclipses/eclipsesolaranular.svg", "eclipse-solar-híbrido": "svg/eclipses/eclipsesolartotal.svg",
  "eclipse-lunar-penumbral": "svg/eclipses/eclipselunarpenumbra.svg", "eclipse-lunar-parcial": "svg/eclipses/eclipselunarparcial.svg",
  "eclipse-lunar-total": "svg/eclipses/eclipselunartotal.svg",
  superluna: "svg/eventos/superluna.svg", microluna: "svg/eventos/microluna.svg", "luna-azul": "svg/eventos/lunaazul.svg",
  "luna-negra": "svg/eventos/lunanegra.svg", "luna-cosecha": "svg/eventos/lunacosecha.svg", "mareas-vivas": "svg/eventos/mareasvivas.svg",
};

const evlHuso = (ms) => { try { return typeof husoDelLugar === "function" ? husoDelLugar(new Date(ms)) : 0; } catch (e) { return 0; } };
const evlMes = (ms) => { const d = new Date(ms + evlHuso(ms) * 3600000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };

// Diferencia (°, −180…180) entre la elongación de la Luna y el objetivo (0 nueva, 90 cuarto creciente, 180 llena, 270 cuarto menguante)
function evlElongacion(ms, objetivo) {
  const x = posicionLunarPrecisa(ms).longitud - posicionSolarPrecisa(ms).longitud - objetivo;
  return ((((x + 540) % 360) + 360) % 360) - 180;
}
function evlRaiz(objetivo, centro, ancho) {
  let a = centro - ancho, b = centro + ancho;
  if (evlElongacion(a, objetivo) > 0 || evlElongacion(b, objetivo) < 0) { a = centro - 2 * ancho; b = centro + 2 * ancho; }
  for (let i = 0; i < 38; i++) { const m = (a + b) / 2; if (evlElongacion(m, objetivo) < 0) a = m; else b = m; }
  return (a + b) / 2;
}

// Fases exactas entre dos instantes
function fasesLunares(desdeMs, hastaMs) {
  const lista = [], nombres = [["nueva", 0], ["cuarto-creciente", 90], ["llena", 180], ["cuarto-menguante", 270]];
  const k0 = Math.floor((desdeMs / EVL.DIA_MS + 2440587.5 - 2451550.09766) / EVL.SINODICO_DIAS) - 1;
  const k1 = Math.ceil((hastaMs / EVL.DIA_MS + 2440587.5 - 2451550.09766) / EVL.SINODICO_DIAS) + 1;
  for (let k = k0; k <= k1; k++) {
    const base = lunaNuevaMeeus(k);
    for (const [fase, obj] of nombres) {
      const t = evlRaiz(obj, base + (obj / 360) * EVL.SINODICO_DIAS * EVL.DIA_MS, 0.8 * EVL.DIA_MS);
      if (t >= desdeMs && t <= hastaMs) lista.push({ fase, ms: t, distancia: posicionLunarPrecisa(t).distancia });
    }
  }
  return lista.sort((a, b) => a.ms - b.ms);
}

// Perigeo (tipo "min") o apogeo (tipo "max") más cercano a un instante: {ms, distancia}
function extremoLunar(ms, tipo) {
  const f = (t) => (tipo === "min" ? 1 : -1) * posicionLunarPrecisa(t).distancia;
  let mejor = null;
  for (let t = ms - 15 * EVL.DIA_MS; t <= ms + 15 * EVL.DIA_MS; t += 6 * 3600000) {
    const v = f(t);
    if (f(t - 6 * 3600000) > v && f(t + 6 * 3600000) > v && (!mejor || Math.abs(t - ms) < Math.abs(mejor - ms))) mejor = t;
  }
  if (mejor === null) return null;
  const t = minimoAureo(f, mejor - 6 * 3600000, mejor + 6 * 3600000, 1000);
  return { ms: t, distancia: posicionLunarPrecisa(t).distancia };
}

function evlIndiceMarea(ms) {
  const l = posicionLunarPrecisa(ms), s = posicionSolarPrecisa(ms);
  return lunMareas(l.distancia, s.distanciaUA, faseLunarPrecisa(ms).elongacion).indice;
}

// Alcance de un eclipse para la ubicación activa (si se conoce)
function evlAlcanceEclipse(e) {
  const u = typeof ubicacion !== "undefined" ? ubicacion : null;
  if (!u || typeof u.latitud !== "number") return textoEventoLunar("segunLugar");
  if (e.tipo === "solar") {
    const t = minimoAureo((x) => condicionesSolares(x, u.latitud, u.longitud).separacion, e.maximo - 4 * 3600000, e.maximo + 4 * 3600000, 2000);
    const c = condicionesSolares(t, u.latitud, u.longitud);
    return c.ocultacion > 0.001 && c.alturaSol > -0.8 ? textoEventoLunar("parcialAqui", Math.min(100, Math.round(c.ocultacion * 100))) : textoEventoLunar("noVisibleAqui");
  }
  const v = geometriaVistaLunar(e.maximo, u.latitud, u.longitud);
  return v.alturaLuna > 0 ? textoEventoLunar("visibleAqui") : textoEventoLunar("noVisibleAqui");
}

// Lista de eventos entre dos instantes, ordenada por fecha
function eventosLunares(desdeMs, hastaMs) {
  const margen = 40 * EVL.DIA_MS, fases = fasesLunares(desdeMs - margen, hastaMs + margen), eventos = [];
  const llenas = fases.filter((f) => f.fase === "llena"), nuevas = fases.filter((f) => f.fase === "nueva");
  const dentro = (ms) => ms >= desdeMs && ms <= hastaMs;

  const segundas = (lista) => { const vistos = {}, r = []; lista.forEach((f) => { const m = evlMes(f.ms); vistos[m] = (vistos[m] || 0) + 1; if (vistos[m] === 2) r.push(f); }); return r; };
  segundas(llenas).filter((f) => dentro(f.ms)).forEach((f) => eventos.push({ tipo: "luna-azul", maximo: f.ms, distancia: f.distancia }));
  segundas(nuevas).filter((f) => dentro(f.ms)).forEach((f) => eventos.push({ tipo: "luna-negra", maximo: f.ms, distancia: f.distancia }));

  llenas.filter((f) => dentro(f.ms)).forEach((f) => {
    if (f.distancia <= EVL.LIMITE_SUPERLUNA_KM) eventos.push({ tipo: "superluna", maximo: f.ms, distancia: f.distancia });
    else if (f.distancia >= EVL.LIMITE_MICROLUNA_KM) eventos.push({ tipo: "microluna", maximo: f.ms, distancia: f.distancia });
  });

  for (let y = new Date(desdeMs).getUTCFullYear(); y <= new Date(hastaMs).getUTCFullYear(); y++) {
    const eq = instanteLongitudSolar(180, Date.UTC(y, 8, 23));
    const c = llenas.reduce((m, f) => (!m || Math.abs(f.ms - eq) < Math.abs(m.ms - eq) ? f : m), null);
    if (c && dentro(c.ms)) eventos.push({ tipo: "luna-cosecha", maximo: c.ms, distancia: c.distancia });
  }

  [...llenas, ...nuevas].filter((f) => dentro(f.ms)).forEach((f) => {
    let mejor = 0;
    for (let t = f.ms - 1.5 * EVL.DIA_MS; t <= f.ms + 1.5 * EVL.DIA_MS; t += 3 * 3600000) mejor = Math.max(mejor, evlIndiceMarea(t));
    if (mejor >= LUNARIO_MAREAS.extremas) eventos.push({ tipo: "mareas-vivas", maximo: f.ms, distancia: f.distancia, indice: mejor, fase: f.fase });
  });

  buscarEclipses(desdeMs, hastaMs).forEach((e) => eventos.push({ tipo: `eclipse-${e.tipo}`, clase: e.clase, maximo: e.maximo, eclipse: e }));
  return eventos.sort((a, b) => a.maximo - b.maximo);
}

const evlClave = (e) => (e.eclipse ? `${e.tipo}-${e.clase}` : e.tipo);

// Formato del carrusel de datos-infografias.js (se calcula una vez por día y ubicación; cuesta ~0,25 s)
const evlCache = { clave: null, lista: null };
function eventosParaCarrusel(desdeMs = Date.now(), meses = 12, maximo = 40) {
  const u = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? `${ubicacion.latitud.toFixed(1)},${ubicacion.longitud.toFixed(1)}` : "sin-lugar";
  const clave = `${Math.floor(desdeMs / 3600000)}|${meses}|${maximo}|${u}`;
  if (evlCache.clave === clave) return evlCache.lista;
  const fmt = new Intl.DateTimeFormat(localeActual(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  const hasta = desdeMs + meses * 30.44 * EVL.DIA_MS;
  const todos = [...eventosLunares(desdeMs, hasta), ...(typeof eventosAstronomicos === "function" ? eventosAstronomicos(desdeMs, hasta) : [])].sort((a, b) => a.maximo - b.maximo);
  const cerca = (e, o) => o !== e && Math.abs(o.maximo - e.maximo) < 3 * 3600000;
  // Las mareas vivas extremas que coinciden con otro evento (casi siempre una superluna) se funden con él
  const lista = todos.filter((e) => !(e.tipo === "mareas-vivas" && todos.some((o) => o.tipo !== "mareas-vivas" && cerca(e, o)))).slice(0, maximo).map((e) => {
    const clave2 = evlClave(e), km = e.distancia ? Math.round(e.distancia / 10) * 10 : 0;
    const mareas = todos.find((o) => o.tipo === "mareas-vivas" && cerca(e, o));
    const alcance = e.alcance ?? (e.eclipse ? evlAlcanceEclipse(e.eclipse)
      : e.tipo === "luna-azul" ? textoEventoLunar("azul") : e.tipo === "luna-negra" ? textoEventoLunar("negra")
      : e.tipo === "luna-cosecha" ? textoEventoLunar("cosecha") : e.tipo === "mareas-vivas" ? textoEventoLunar("mareas", Math.round(e.indice))
      : textoEventoLunar("distancia", km.toLocaleString(localeActual())) + (mareas ? ` · ${textoEventoLunar("mareas", Math.round(mareas.indice))}` : ""));
    return {
      id: `${clave2}-${Math.round(e.maximo / 60000)}`,
      titulo: e.titulo ?? textoEventoLunar(clave2),
      fecha: fmt.format(new Date(e.maximo + evlHuso(e.maximo) * 3600000)),
      alcance,
      icono: e.icono ?? ICONOS_EVENTOS_LUNARES[clave2],
      destino: "#eventos-proximos",
      imagenes: [],
      visibilidad: typeof visibilidadEvento === "function" ? visibilidadEvento(e) : null,
      _evento: e,
    };
  });
  evlCache.clave = clave;
  evlCache.lista = lista;
  return lista;
}

// Vuelve a dibujar el carrusel (por ejemplo, cuando ya se conoce la ubicación y cambia "visible desde tu ubicación")
function refrescarEventosProximos() {
  const eventos = obtenerEventosProximos();
  renderizarEventosProximos(eventos);
  renderizarGaleria(eventos);
}

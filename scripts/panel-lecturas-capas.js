// scripts/panel-lecturas-capas.js
// Lecturas dinámicas del panel derecho para Lunario, Calendario y Rotación.
// panel-informacion-capas.js las llama (máx. 2 veces por segundo, solo con el panel abierto) a través de LECTORES_PANEL.
// Depende de: eventos-astronomicos.js (instanteLongitudAparente, nombreAnioChino), eclipses.js (faseLunarPrecisa), efemerides-precisas.js, eventos-lunares.js (fasesLunares), lunario.js, nodos-lunares.js,
// calendario.js, calendario-chino*.js, referencias-estacionales.js, rotacion.js, panel-resultados.js (DIAS_SEMANA, textoHoraDecimal).

const TEXTOS_LECTURAS = {
  es: {
    hoy: "hoy", en: (d) => `en ${d} d`, hace: (d) => `hace ${d} d`,
    dias: (n) => `${n} días`, fecha: (dia, d, mes, anio) => `${dia} ${d} de ${mes.toLowerCase()} de ${anio}`,
    diaAnio: (n, total) => `${n} de ${total}`,
    eclipsesSi: "Sí · la Luna está cerca de un nodo", eclipsesNo: "No",
    bisiesto: "Sí · 366 días", noBisiesto: "No · 365 días", hemisferioSur: " (hemisferio sur)",
    estaciones: ["Primavera", "Verano", "Otoño", "Invierno"],
    hitos: ["Equinoccio de primavera", "Solsticio de verano", "Equinoccio de otoño", "Solsticio de invierno"],
    norte: "N", sur: "S", este: "E", oeste: "O",
    ecuador: " (ecuador)", greenwich: " · Greenwich",
  },
  en: {
    hoy: "today", en: (d) => `in ${d} d`, hace: (d) => `${d} d ago`,
    dias: (n) => `${n} days`, fecha: (dia, d, mes, anio) => `${dia}, ${mes} ${d}, ${anio}`,
    diaAnio: (n, total) => `${n} of ${total}`,
    eclipsesSi: "Yes · the Moon is near a node", eclipsesNo: "No",
    bisiesto: "Yes · 366 days", noBisiesto: "No · 365 days", hemisferioSur: " (southern hemisphere)",
    estaciones: ["Spring", "Summer", "Autumn", "Winter"],
    hitos: ["Spring equinox", "Summer solstice", "Autumn equinox", "Winter solstice"],
    norte: "N", sur: "S", este: "E", oeste: "W",
    ecuador: " (equator)", greenwich: " · Greenwich",
  },
};
const plcT = (clave, ...args) => textoDe(TEXTOS_LECTURAS, clave, ...args);

const plcTxt = (id, texto) => { const el = document.getElementById(id); if (el && el.textContent !== texto) el.textContent = texto; };
const plcNum = (n, d = 1) => n.toLocaleString(localeActual(), { minimumFractionDigits: d, maximumFractionDigits: d });
const plcGrados = (v, pos, neg) => `${plcNum(Math.abs(v), 2)}° ${v >= 0 ? pos : neg}`;
// Instante (ms UTC) → "9 oct · 14:05" en hora de pared del lugar (con año si conAnio)
function plcFechaHora(ms, conAnio = false) {
  const p = aHoraDePared(new Date(ms));
  const hora = `${dosDigitos(p.getUTCHours())}:${dosDigitos(p.getUTCMinutes())}`;
  if (idiomaActual() === "en") return `${diaMesCortoPanel(p.getUTCDate(), p.getUTCMonth())}${conAnio ? `, ${p.getUTCFullYear()}` : ""} · ${hora}`;
  return `${diaMesCortoPanel(p.getUTCDate(), p.getUTCMonth())}${conAnio ? ` ${p.getUTCFullYear()}` : ""} · ${hora}`;
}
const plcEn = (ms, ahoraMs) => {
  const d = Math.round((ms - ahoraMs) / 86400000);
  return d === 0 ? plcT("hoy") : d > 0 ? plcT("en", d) : plcT("hace", -d);
};

// ───── Lunario ─────
const plcLunar = { centro: null, lista: [] };
function leerPanelLunario(ahora) {
  const ms = ahora.getTime();
  // Las fases exactas cuestan: se calculan ±36 días y se reutilizan mientras el reloj no se aleje 5 días del centro
  if (plcLunar.centro === null || Math.abs(ms - plcLunar.centro) > 5 * 86400000) {
    plcLunar.centro = ms;
    plcLunar.lista = fasesLunares(ms - 36 * 86400000, ms + 36 * 86400000);
  }
  const f = faseLunarPrecisa(ms), luna = posicionLunarPrecisa(ms), sol = posicionSolarPrecisa(ms);
  const T = TEXTOS_LUNARIO[idiomaActual?.()] || TEXTOS_LUNARIO.es;
  const ultimaNueva = [...plcLunar.lista].reverse().find((x) => x.fase === "nueva" && x.ms <= ms);
  const proxima = (fase) => plcLunar.lista.find((x) => x.fase === fase && x.ms > ms);
  const nueva = proxima("nueva"), llena = proxima("llena");
  const mareas = lunMareas(luna.distancia, sol.distanciaUA, f.elongacion);

  plcTxt("dato-lunario-fase", T.fases[nombreDeFase(f.elongacion * (f.creciente ? 1 : -1))]);
  plcTxt("dato-lunario-iluminacion", `${plcNum(f.fraccion * 100)} %`);
  plcTxt("dato-lunario-edad", ultimaNueva ? plcT("dias", plcNum((ms - ultimaNueva.ms) / 86400000)) : "—");
  plcTxt("dato-lunario-distancia", `${(Math.round(luna.distancia / 10) * 10).toLocaleString(localeActual())} km`);
  plcTxt("dato-lunario-mareas", T.mareas(mareas.clase, Math.round(mareas.indice)));
  plcTxt("dato-lunario-proxima-nueva", nueva ? `${plcFechaHora(nueva.ms)} · ${plcEn(nueva.ms, ms)}` : "—");
  plcTxt("dato-lunario-proxima-llena", llena ? `${plcFechaHora(llena.ms)} · ${plcEn(llena.ms, ms)}` : "—");
  plcTxt("dato-lunario-eclipses", posicionOrbitalLunar(ms).temporadaEclipses ? plcT("eclipsesSi") : plcT("eclipsesNo"));
}

// ───── Calendario ─────
const plcEstacion = { clave: "", instante: 0 };

function leerPanelCalendario(ahora) {
  const ms = ahora.getTime(), p = aHoraDePared(ahora), anio = p.getUTCFullYear();
  const diaAnio = Math.round((Date.UTC(anio, p.getUTCMonth(), p.getUTCDate()) - Date.UTC(anio, 0, 1)) / 86400000) + 1;
  plcTxt("dato-calendario-fecha", plcT("fecha", diaSemanaPanel(p.getUTCDay()), p.getUTCDate(), mesLargoPanel(p.getUTCMonth()), anio));
  plcTxt("dato-calendario-dia-anio", plcT("diaAnio", diaAnio, diasEnAnio(anio)));
  plcTxt("dato-calendario-bisiesto", plcT(esBisiesto(anio) ? "bisiesto" : "noBisiesto"));

  // Estación astronómica según la longitud eclíptica del Sol; el hemisferio sur invierte los nombres
  const sur = typeof ubicacion.latitud === "number" && ubicacion.latitud < 0;
  const lon = posicionSolar(ahora).longitudEcliptica, sector = Math.floor(lon / 90) % 4, desfase = sur ? 2 : 0;
  plcTxt("dato-calendario-estacion", `${plcT("estaciones")[(sector + desfase) % 4]}${sur ? plcT("hemisferioSur") : ""}`);
  const clave = `${sector}|${anio}`;
  if (plcEstacion.clave !== clave) {
    const objetivo = ((sector + 1) * 90) % 360;
    plcEstacion.clave = clave;
    plcEstacion.instante = instanteLongitudAparente(objetivo, ms + (normalizarGrados(objetivo - lon) / 0.9856474) * 86400000);
  }
  plcTxt("dato-calendario-hito", `${plcT("hitos")[(sector + 1 + desfase) % 4]}`);
  plcTxt("dato-calendario-hito-fecha", `≈ ${plcFechaHora(plcEstacion.instante, true)} · ${plcEn(plcEstacion.instante, ms)}`);

  // Año chino (Año Nuevo lunar, hora de Pekín)
  const { anio: anioChino, fraccion } = estadoAnioChino(ahora);
  const siguiente = new Date(anioNuevoChino(anioChino + 1) + CHINO_ZONA_MS);
  plcTxt("dato-calendario-chino", `${nombreAnioChino(anioChino).replace(/^del? (la )?/, "")} · ${anioChino}`);
  plcTxt("dato-calendario-chino-avance", `${plcNum(fraccion * 100)} %`);
  plcTxt("dato-calendario-chino-nuevo", idiomaActual() === "en" ? `${diaMesCortoPanel(siguiente.getUTCDate(), siguiente.getUTCMonth())}, ${siguiente.getUTCFullYear()}` : `${diaMesCortoPanel(siguiente.getUTCDate(), siguiente.getUTCMonth())} ${siguiente.getUTCFullYear()}`);
}

// ───── Rotación ─────
function leerPanelRotacion(ahora) {
  const sol = posicionSolar(ahora), lat = ubicacion.latitud, hayLugar = typeof lat === "number" && typeof ubicacion.longitud === "number";
  const v = ROTACION.velocidadEcuatorial * Math.cos(((hayLugar ? lat : 0) * Math.PI) / 180);
  plcTxt("dato-rotacion-subsolar", `${plcGrados(sol.declinacion, plcT("norte"), plcT("sur"))} · ${plcGrados(longitudSubsolar(ahora), plcT("este"), plcT("oeste"))}`);
  plcTxt("dato-rotacion-velocidad", `${Math.round(v).toLocaleString(localeActual())} m/s · ${Math.round(v * 3.6).toLocaleString(localeActual())} km/h${hayLugar ? "" : plcT("ecuador")}`);
  plcTxt("dato-rotacion-sideral", `${textoHoraDecimal(horaSideral(ahora, hayLugar ? ubicacion.longitud : 0) / 15)}${hayLugar ? "" : plcT("greenwich")}`);
}

const LECTORES_PANEL = { lunario: leerPanelLunario, calendario: leerPanelCalendario, rotacion: leerPanelRotacion };
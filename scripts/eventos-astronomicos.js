// scripts/eventos-astronomicos.js
// Eventos NO lunares del carrusel de Próximos eventos (todo en ms UTC). eventos-lunares.js los mezcla en eventosParaCarrusel().
// Cada evento ya trae sus textos: { tipo, maximo, titulo, alcance, icono }. Se calculan según la ubicación (hemisferio), por eso
// eventosParaCarrusel() ya incluye la ubicación en su caché.
// Hoy: estaciones (equinoccios y solsticios) y Año Nuevo chino.
// Depende de: efemerides-precisas.js (posicionSolarPrecisa, siglosTT), calendario-chino-calculo.js (anioNuevoChino),
//             calendario-chino.js (ANIMALES_CHINOS, ANIO_RATA_BASE), ubicacion.js

// Instante en que la longitud eclíptica aparente del Sol alcanza `objetivo` (°), buscando ±20 días alrededor de `aproxMs`.
// Aparente = la del motor (ya con aberración) + nutación en longitud (Meeus cap. 25: −0,00478° · sen Ω).
function instanteLongitudAparente(objetivo, aproxMs) {
  const dif = (ms) => ((posicionSolarPrecisa(ms).longitud - 0.00478 * Math.sin(((125.04 - 1934.136 * siglosTT(ms)) * Math.PI) / 180) - objetivo + 540) % 360) - 180;
  let a = aproxMs - 20 * 86400000, b = aproxMs + 20 * 86400000;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (dif(m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}

const ELEMENTOS_CHINOS = [tx("Madera"), tx("Fuego"), tx("Tierra"), tx("Metal"), tx("Agua")];
// "Caballo de Fuego" para el año chino que empieza en el año gregoriano `anio`
function nombreAnioChino(anio) {
  const animal = ANIMALES_CHINOS[(((anio - ANIO_RATA_BASE) % 12) + 12) % 12].nombre;
  const elemento = ELEMENTOS_CHINOS[Math.floor(((((anio - ANIO_RATA_BASE) % 10) + 10) % 10) / 2)];
  if (idiomaActual() === "en") return `${elemento} ${tx(animal)}`; // "Fire Horse"
  return `${["Rata", "Serpiente", "Cabra"].includes(animal) ? "de la" : "del"} ${animal} de ${elemento}`;
}

// Hitos del año (longitud solar 0°, 90°, 180°, 270°): nombre neutro (vale en ambos hemisferios) y estación que inicia en el hemisferio norte
const HITOS_ESTACION = [
  { longitud: 0, mes: 2, dia: 20, nombre: tx("Equinoccio de marzo"), norte: "primavera" },
  { longitud: 90, mes: 5, dia: 21, nombre: tx("Solsticio de junio"), norte: "verano" },
  { longitud: 180, mes: 8, dia: 23, nombre: tx("Equinoccio de septiembre"), norte: "otono" },
  { longitud: 270, mes: 11, dia: 21, nombre: tx("Solsticio de diciembre"), norte: "invierno" },
];
const ARTICULO_ESTACION = { primavera: tx("la primavera"), verano: tx("el verano"), otono: tx("el otoño"), invierno: tx("el invierno") };
const OPUESTA = { primavera: "otono", verano: "invierno", otono: "primavera", invierno: "verano" };

function eventosAstronomicos(desdeMs, hastaMs) {
  const lat = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? ubicacion.latitud : null;
  const sur = lat !== null && lat < 0;
  const eventos = [];
  for (let y = new Date(desdeMs).getUTCFullYear(); y <= new Date(hastaMs).getUTCFullYear() + 1; y++) {
    for (const h of HITOS_ESTACION) {
      const t = instanteLongitudAparente(h.longitud, Date.UTC(y, h.mes, h.dia, 12));
      if (t < desdeMs || t > hastaMs) continue;
      const aqui = sur ? OPUESTA[h.norte] : h.norte;
      eventos.push({
        tipo: `estacion-${h.longitud}`, maximo: t, titulo: h.nombre, icono: `svg/iconos/${aqui}.svg`,
        alcance: lat === null
          ? tx`Comienza ${ARTICULO_ESTACION[h.norte]} en el hemisferio norte y ${ARTICULO_ESTACION[OPUESTA[h.norte]]} en el sur`
          : tx`Comienza ${ARTICULO_ESTACION[aqui]} en tu hemisferio (${sur ? tx("sur") : tx("norte")})`,
      });
    }
    const nuevo = anioNuevoChino(y);
    if (nuevo >= desdeMs && nuevo <= hastaMs) {
      const pekin = new Date(nuevo + 8 * 3600000); // 00:00 de Pekín
      eventos.push({
        tipo: "anio-nuevo-chino", maximo: nuevo, titulo: tx("Año Nuevo chino"), icono: "svg/eventos/jingjang.svg",
        alcance: tx`Empieza el año ${nombreAnioChino(y)} (${pekin.getUTCDate()} ${mesCortoPanel(pekin.getUTCMonth())} en Pekín)`,
      });
    }
  }
  // Módulos opcionales (cada uno en su archivo)
  if (typeof eventosLluvias === "function") eventos.push(...eventosLluvias(desdeMs, hastaMs));
  if (typeof eventosObservacion === "function") eventos.push(...eventosObservacion(desdeMs, hastaMs));
  if (typeof eventosCometas === "function") eventos.push(...eventosCometas(desdeMs, hastaMs));
  if (typeof eventosAlineacion === "function") eventos.push(...eventosAlineacion(desdeMs, hastaMs));
  // Nuevas líneas de eventos de observación adicionales
  if (typeof eventosAuroras === "function") eventos.push(...eventosAuroras(desdeMs, hastaMs));
  if (typeof eventosTransitos === "function") eventos.push(...eventosTransitos(desdeMs, hastaMs));
  return eventos.sort((a, b) => a.maximo - b.maximo);
}
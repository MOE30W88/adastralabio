// scripts/eventos-lluvias.js
// Lluvias de estrellas (meteoros) para el carrusel de Próximos eventos. eventos-astronomicos.js llama a eventosLluvias().
// El pico de cada lluvia se define por la longitud solar (J2000) del máximo, que es casi la misma cada año; aquí se convierte al instante exacto
// de ese año (con la precesión al equinoccio de la fecha) y se informa de la fase lunar en ese momento.
// Datos: λ☉ y ZHR del Observer's Handbook de la RASC (misma base que la lista de trabajo de la IMO); radiante (declinación) de la lista de trabajo de la IMO.
// Depende de: eventos-astronomicos.js (instanteLongitudAparente), eclipses.js (faseLunarPrecisa), ubicacion.js

const LLUVIAS = [
  { nombre: tx("Cuadrántidas"), lon: 283.16, zhr: 120, dec: 49, mes: 0, dia: 3, ra: 230, constelacion: tx("Boyero"), origen: tx("asteroide 2003 EH1") },
  { nombre: tx("Líridas"), lon: 32.3, zhr: 20, dec: 34, mes: 3, dia: 22, ra: 271, constelacion: tx("Lira"), origen: tx("cometa C/1861 G1 Thatcher") },
  { nombre: tx("η-Acuáridas"), lon: 45.5, zhr: 60, dec: -1, mes: 4, dia: 6, ra: 338, constelacion: tx("Acuario"), origen: tx("cometa Halley") },
  { nombre: tx("δ-Acuáridas del sur"), lon: 126, zhr: 20, dec: -16, mes: 6, dia: 30, ra: 340, constelacion: tx("Acuario"), origen: tx("cometa 96P/Machholz") },
  { nombre: tx("Perseidas"), lon: 140.0, zhr: 90, dec: 58, mes: 7, dia: 12, ra: 48, constelacion: tx("Perseo"), origen: tx("cometa 109P/Swift-Tuttle") },
  { nombre: tx("Dracónidas"), lon: 195.4, zhr: null, dec: 55, mes: 9, dia: 8, ra: 262, constelacion: tx("Dragón"), origen: tx("cometa 21P/Giacobini-Zinner") }, // ZHR variable: casi nula la mayoría de años, con estallidos (2011, 1933, 1946)
  { nombre: tx("Oriónidas"), lon: 208, zhr: 20, dec: 16, mes: 9, dia: 21, ra: 95, constelacion: tx("Orión"), origen: tx("cometa Halley") },
  { nombre: tx("Táuridas del sur"), lon: 223, zhr: 10, dec: 13, mes: 10, dia: 5, ra: 52, constelacion: tx("Tauro"), origen: tx("cometa Encke") },
  { nombre: tx("Táuridas del norte"), lon: 230, zhr: 15, dec: 22, mes: 10, dia: 12, ra: 58, constelacion: tx("Tauro"), origen: tx("cometa Encke") },
  { nombre: tx("Leónidas"), lon: 235.3, zhr: 20, dec: 22, mes: 10, dia: 17, ra: 152, constelacion: tx("León"), origen: tx("cometa 55P/Tempel-Tuttle") },
  { nombre: tx("Gemínidas"), lon: 262.2, zhr: 120, dec: 33, mes: 11, dia: 14, ra: 112, constelacion: tx("Géminis"), origen: tx("asteroide Faetón") },
  { nombre: tx("Úrsidas"), lon: 270.7, zhr: 10, dec: 76, mes: 11, dia: 22, ra: 217, constelacion: tx("Osa Menor"), origen: tx("cometa 8P/Tuttle") },
];
const LLUVIAS_ZHR_MINIMO = 15; // las más débiles (Táuridas del sur, Úrsidas) no entran al carrusel; baja el valor para incluirlas

function textoLunaLluvia(ms) {
  const p = Math.round(faseLunarPrecisa(ms).fraccion * 100);
  return tx`Luna al ${p} % (${p < 35 ? tx("cielo oscuro: buenas condiciones") : p < 70 ? tx("algo de luz lunar") : tx("mucha luz lunar: se verán menos")})`;
}

// Altura máxima del radiante sobre el horizonte del lugar (°); null si no hay ubicación
const alturaRadiante = (dec) => (typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? 90 - Math.abs(ubicacion.latitud - dec) : null);

function eventosLluvias(desdeMs, hastaMs) {
  const eventos = [];
  for (let y = new Date(desdeMs).getUTCFullYear(); y <= new Date(hastaMs).getUTCFullYear(); y++) {
    const precesion = 1.3969713 * ((y + 0.5 - 2000) / 100); // de equinoccio J2000 al de la fecha
    for (const l of LLUVIAS) {
      if (l.zhr !== null && l.zhr < LLUVIAS_ZHR_MINIMO) continue;
      const t = instanteLongitudAparente((l.lon + precesion) % 360, Date.UTC(y, l.mes, l.dia, 12));
      if (t < desdeMs || t > hastaMs) continue;
      const h = alturaRadiante(l.dec);
      const radiante = h === null ? "" : h < 10 ? tx(" · radiante casi bajo el horizonte desde tu latitud") : h < 30 ? tx(" · radiante bajo desde tu latitud") : "";
      eventos.push({
        tipo: `lluvia-${l.nombre}`, maximo: t, titulo: tx`Lluvia de estrellas: ${l.nombre}`, icono: "svg/eventos/lluviaestrellas.svg",
        alcance: tx`${l.zhr === null ? tx("Actividad variable: casi nula casi todos los años, con estallidos ocasionales") : tx`Hasta ${l.zhr} meteoros por hora`} · ${textoLunaLluvia(t)}${radiante} · Radiante en ${l.constelacion} (${l.origen})`,
      });
    }
  }
  return eventos;
}
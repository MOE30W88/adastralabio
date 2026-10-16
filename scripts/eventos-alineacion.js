// scripts/eventos-alineacion.js
// Próximas alineaciones para el carrusel, con el mismo modelo 3D de alineacion.js: el centro del planeta cerca del eje Sol–Tierra
// (mismo lado que la Tierra o el opuesto). eventos-astronomicos.js llama a eventosAlineacion().
// Se busca el mínimo de la desviación (muestreo diario + sección áurea). Precisión: ~1 día (elementos keplerianos de planetas.js).
// Depende de: alineacion.js (productoCruz, productoPunto, norma), planetas.js (PLANETAS, PLANETA_TIERRA, posicionHeliocentrica)

const UMBRAL_EVENTO_ALINEACION = 0.5; // ° — la línea del reloj usa 0,1° (UMBRAL_ALINEACION_GRADOS); con 0,1° casi no hay eventos (≈1 en 10 años)

function alineacionDesviacion(planeta, ms) {
  const fecha = new Date(ms), t = posicionHeliocentrica(PLANETA_TIERRA, fecha), p = posicionHeliocentrica(planeta, fecha);
  const rt = [t.x, t.y, t.z], rp = [p.x, p.y, p.z], punto = productoPunto(rt, rp);
  return { grados: Math.atan2(norma(productoCruz(rt, rp)), Math.abs(punto)) * GRADOS_POR_RADIAN, mismoLado: punto > 0 };
}

function eventosAlineacion(desdeMs, hastaMs) {
  const D = 86400000, eventos = [], f = (P) => (ms) => alineacionDesviacion(P, ms).grados;
  for (const P of PLANETAS.filter((x) => !x.esTierra)) {
    const g = f(P);
    let a = g(desdeMs - D), b = g(desdeMs);
    for (let ms = desdeMs; ms < hastaMs; ms += D) {
      const c = g(ms + D);
      if (b < a && b <= c && b < UMBRAL_EVENTO_ALINEACION * 4) { // mínimo local: se afina dentro de ±1 día
        let lo = ms - D, hi = ms + D;
        for (let i = 0; i < 40; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (g(m1) < g(m2)) hi = m2; else lo = m1; }
        const t = (lo + hi) / 2, d = alineacionDesviacion(P, t);
        if (d.grados <= UMBRAL_EVENTO_ALINEACION && t >= desdeMs && t <= hastaMs) {
          eventos.push({
            tipo: `alineacion-${P.nombre}`, maximo: t, titulo: tx`Alineación Sol–Tierra–${tx(P.nombre)}`, icono: "svg/eventos/alineacion.svg",
            alcance: tx`${tx(P.nombre)} ${d.mismoLado ? tx("del mismo lado del Sol que la Tierra") : tx("al otro lado del Sol")} · a ${d.grados.toLocaleString(localeActual(), { maximumFractionDigits: 2 })}° del eje`,
          });
        }
      }
      a = b; b = c;
    }
  }
  return eventos;
}
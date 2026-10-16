// scripts/eventos-observacion.js
// Eventos de observación telescópica para el carrusel: oposiciones (Marte, Júpiter, Saturno, Urano, Neptuno) y máxima elongación de Mercurio y Venus.
// eventos-astronomicos.js llama a eventosObservacion(). Usa los elementos keplerianos de planetas.js (1800–2050; error de ~1 día en estas fechas).
// Oposición: la longitud geocéntrica del planeta difiere 180° de la del Sol (sale al ponerse el Sol y se ve toda la noche, lo más cerca y brillante).
// Máxima elongación: el ángulo Sol–Tierra–planeta llega a su máximo (mejor momento para ver Mercurio y Venus).
// Depende de: planetas.js (PLANETAS, posicionHeliocentrica), astronomia.js (normalizarGrados)

const OBS_DIA = 86400000;
const OBS_EXTERIORES = ["Marte", "Júpiter", "Saturno", "Urano", "Neptuno"];
const OBS_INTERIORES = ["Mercurio", "Venus"];
const OBS_TELESCOPIO = { Urano: tx("con prismáticos o telescopio"), Neptuno: tx("solo con telescopio") };

// Vectores geocéntricos (UA, eclíptica de la fecha) del planeta y del Sol
function obsGeometria(nombre, ms) {
  const fecha = new Date(ms), p = posicionHeliocentrica(PLANETAS.find((x) => x.nombre === nombre), fecha), t = posicionHeliocentrica(PLANETAS.find((x) => x.esTierra), fecha);
  const g = [p.x - t.x, p.y - t.y, p.z - t.z], s = [-t.x, -t.y, -t.z];
  const dist = Math.hypot(...g), distSol = Math.hypot(...s);
  const lon = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;
  const dif = ((((lon(g) - lon(s)) % 360) + 540) % 360) - 180; // longitud del planeta − longitud del Sol, en (−180, 180]
  const elongacion = Math.acos((g[0] * s[0] + g[1] * s[1] + g[2] * s[2]) / (dist * distSol)) * 180 / Math.PI;
  return { dist, dif, elongacion };
}

const obsBiseccion = (f, a, b) => { for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; } return (a + b) / 2; };
const obsMaximo = (f, a, b) => { for (let i = 0; i < 40; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) a = m1; else b = m2; } return (a + b) / 2; };

function eventosObservacion(desdeMs, hastaMs) {
  const eventos = [], fmtUA = (d) => d.toLocaleString(localeActual(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Oposiciones: la diferencia de longitudes pasa de positiva a negativa por 180° (g = dif − 180 normalizada)
  for (const nombre of OBS_EXTERIORES) {
    const g = (ms) => { const d = obsGeometria(nombre, ms).dif; return d >= 0 ? d - 180 : d + 180; }; // 0 en la oposición
    const paso = 3 * OBS_DIA;
    for (let t = desdeMs - paso; t < hastaMs; t += paso) {
      const g0 = g(t), g1 = g(t + paso);
      if (g0 > 0 && g1 <= 0 && g0 < 90) {
        const op = obsBiseccion(g, t, t + paso);
        if (op >= desdeMs && op <= hastaMs) {
          eventos.push({
            tipo: `oposicion-${nombre}`, maximo: op, titulo: tx`Oposición de ${tx(nombre)}`, icono: "svg/eventos/observaciontelescopica.svg",
            alcance: tx`Visible toda la noche${OBS_TELESCOPIO[nombre] ? ` ${OBS_TELESCOPIO[nombre]}` : ""} · a ${fmtUA(obsGeometria(nombre, op).dist)} UA de la Tierra`,
          });
        }
      }
    }
  }

  // Máxima elongación de Mercurio y Venus: máximos locales del ángulo Sol–Tierra–planeta
  for (const nombre of OBS_INTERIORES) {
    const e = (ms) => obsGeometria(nombre, ms).elongacion;
    for (let t = desdeMs - OBS_DIA; t < hastaMs; t += OBS_DIA) {
      if (e(t) > e(t - OBS_DIA) && e(t) >= e(t + OBS_DIA)) {
        const mx = obsMaximo(e, t - OBS_DIA, t + OBS_DIA);
        if (mx < desdeMs || mx > hastaMs) continue;
        const g = obsGeometria(nombre, mx), este = g.dif > 0; // al este del Sol: se ve al atardecer
        eventos.push({
          tipo: `elongacion-${nombre}-${este ? "este" : "oeste"}`, maximo: mx, titulo: tx`Máxima elongación de ${tx(nombre)}`, icono: "svg/eventos/observaciontelescopica.svg",
          alcance: `${fmtUA(g.elongacion)}° ${este ? tx("al este del Sol · visible al atardecer") : tx("al oeste del Sol · visible antes del amanecer")}`,
        });
      }
    }
  }
  return eventos;
}
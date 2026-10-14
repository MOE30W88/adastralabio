// scripts/cuerpos-horizonte.js
// Dónde están la Luna y los planetas en el cielo del lugar y dónde se dibujan en el dial de Día y noche (sin DOM).
//   · Dial: el ángulo del Sol es la hora del reloj; la Luna y los planetas se colocan con la MISMA escala de alturas: un astro a la
//     altura h, en el lado este u oeste, va donde el Sol tendría esa altura ese mismo día. Así, salir o ponerse coincide con las
//     marcas de alba y ocaso, y una Luna nueva queda junto al Sol (en un eclipse, encima).
//   · Planetas: posición geocéntrica (planetas.js), magnitud (Meeus cap. 41) y regla de visibilidad a simple vista.
// Depende de: planetas.js, efemerides-precisas.js (vectorLuna, vectorSol, siglosTT, EP), hora.js (anguloDeLaHora), ubicacion

const CUERPOS = {
  UA_KM: 149597870.7,
  ALTURA_MIN_PLANETA: 3,       // ° sobre el horizonte (la extinción atmosférica apaga lo que está más bajo)
  ELONGACION_MIN: 8,           // ° al Sol
  // magnitud límite a simple vista según la altura del Sol: [altura del Sol °, magnitud]
  LIMITE_MAGNITUD: [[-2, -4.2], [-4, -3], [-6, -1], [-9, 2], [-12, 4], [-18, 5.5]],
  OBSERVABLES: ["Mercurio", "Venus", "Marte", "Júpiter", "Saturno"],
};
const CU_R = Math.PI / 180;
const cuNorm180 = (g) => ((((g + 180) % 360) + 360) % 360) - 180;

function cuEcAEq(v, eps) { const c = Math.cos(eps * CU_R), s = Math.sin(eps * CU_R); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }

// Altura (topocéntrica), ángulo horario y declinación de un vector eclíptico (km, origen en el centro de la Tierra)
function cuCielo(vEcl, ms, lat, lon) {
  const T = siglosTT(ms), eps = 23.4392911 - 0.0130042 * T;
  const gmst = (((280.46061837 + 360.98564736629 * (ms / 86400000 + 2440587.5 - 2451545)) % 360) + 360) % 360;
  const eq = cuEcAEq(vEcl, eps), th = (gmst + lon) * CU_R, f = 1 / 298.257223563, u = Math.atan((1 - f) * Math.tan(lat * CU_R));
  const o = [6378.137 * Math.cos(u) * Math.cos(th), 6378.137 * Math.cos(u) * Math.sin(th), 6378.137 * (1 - f) * Math.sin(u)];
  const z = [Math.cos(lat * CU_R) * Math.cos(th), Math.cos(lat * CU_R) * Math.sin(th), Math.sin(lat * CU_R)];
  const w = [eq[0] - o[0], eq[1] - o[1], eq[2] - o[2]], nw = Math.hypot(w[0], w[1], w[2]);
  const ra = Math.atan2(eq[1], eq[0]) / CU_R;
  return {
    altura: Math.asin((w[0] * z[0] + w[1] * z[1] + w[2] * z[2]) / nw) / CU_R,
    H: cuNorm180(gmst + lon - ra),
    dec: Math.atan2(eq[2], Math.hypot(eq[0], eq[1])),
  };
}

// Datos del Sol del día para convertir alturas en ángulos del dial
function cuInfoDia(ms, lat, lon) {
  const s = cuCielo(vectorSol(ms), ms, lat, lon);
  return { dec: s.dec, lat: lat * CU_R, delta: cuNorm180(anguloDeLaHora(new Date(ms)) - s.H), alturaSol: s.altura };
}
// Ángulo del dial (° desde arriba, en el sentido del reloj) de un astro a la altura `altura` en el lado este/oeste que indica su ángulo horario H
function cuAnguloDial(altura, H, info) {
  const c = (Math.sin(altura * CU_R) - Math.sin(info.lat) * Math.sin(info.dec)) / (Math.cos(info.lat) * Math.cos(info.dec));
  const h = Math.acos(Math.max(-1, Math.min(1, c))) / CU_R * (H >= 0 ? 1 : -1);
  return cuNorm180(h + info.delta);
}

// Luna en el dial (null si aún no se conoce la ubicación)
function anguloDialDeLaLuna(fecha) {
  if (typeof ubicacion === "undefined" || typeof ubicacion.latitud !== "number") return null;
  const ms = fecha.getTime(), c = cuCielo(vectorLuna(ms), ms, ubicacion.latitud, ubicacion.longitud);
  return cuAnguloDial(c.altura, c.H, cuInfoDia(ms, ubicacion.latitud, ubicacion.longitud));
}

// ───── Planetas ─────
const cuTierra = () => PLANETAS.find((p) => p.esTierra);
function cuGeocentrico(planeta, ms) {
  const f = new Date(ms), h = posicionHeliocentrica(planeta, f), t = posicionHeliocentrica(cuTierra(), f);
  const v = [h.x - t.x, h.y - t.y, h.z - t.z], delta = Math.hypot(v[0], v[1], v[2]);
  return { v, delta, r: h.distancia, R: t.distancia, tierra: t };
}
function cuMagnitud(nombre, r, delta, R, v) {
  const i = Math.acos(Math.max(-1, Math.min(1, (r * r + delta * delta - R * R) / (2 * r * delta)))) / CU_R, d = 5 * Math.log10(r * delta);
  switch (nombre) {
    case "Mercurio": return -0.42 + d + 0.038 * i - 0.000273 * i * i + 0.000002 * i ** 3;
    case "Venus": return -4.4 + d + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i ** 3;
    case "Marte": return -1.52 + d + 0.016 * i;
    case "Júpiter": return -9.4 + d + 0.005 * i;
    case "Saturno": { // inclinación de los anillos (Meeus cap. 45)
      const inc = 28.075216 * CU_R, nodo = 169.50847 * CU_R, lam = Math.atan2(v[1], v[0]), bet = Math.atan2(v[2], Math.hypot(v[0], v[1]));
      const sinB = Math.sin(inc) * Math.cos(bet) * Math.sin(lam - nodo) - Math.cos(inc) * Math.sin(bet);
      return -8.88 + d - 2.6 * Math.abs(sinB) + 1.25 * sinB * sinB;
    }
    default: return -7 + d;
  }
}
function cuLimiteMagnitud(alturaSol) {
  const L = CUERPOS.LIMITE_MAGNITUD;
  if (alturaSol > L[0][0]) return -99;
  if (alturaSol <= L[L.length - 1][0]) return L[L.length - 1][1];
  for (let i = 1; i < L.length; i++) if (alturaSol > L[i][0]) { const [a0, m0] = L[i - 1], [a1, m1] = L[i]; return m0 + ((alturaSol - a0) / (a1 - a0)) * (m1 - m0); }
  return L[L.length - 1][1];
}

// Planetas visibles a simple vista desde el lugar (con su sitio en el dial)
function planetasVisibles(fecha, lat, lon) {
  const ms = fecha.getTime(), info = cuInfoDia(ms, lat, lon), limite = cuLimiteMagnitud(info.alturaSol), lista = [];
  const sol = vectorSol(ms), sn = Math.hypot(sol[0], sol[1], sol[2]);
  for (const p of PLANETAS) {
    if (!CUERPOS.OBSERVABLES.includes(p.nombre)) continue;
    const g = cuGeocentrico(p, ms), v = g.v.map((x) => x * CUERPOS.UA_KM), c = cuCielo(v, ms, lat, lon), m = cuMagnitud(p.nombre, g.r, g.delta, g.R, g.v);
    const elong = Math.acos((v[0] * sol[0] + v[1] * sol[1] + v[2] * sol[2]) / (Math.hypot(v[0], v[1], v[2]) * sn)) / CU_R;
    const visible = c.altura >= CUERPOS.ALTURA_MIN_PLANETA && elong >= CUERPOS.ELONGACION_MIN && m <= limite;
    lista.push({ nombre: p.nombre, color: p.color, altura: c.altura, magnitud: m, elongacion: elong, visible,
      margen: limite - m, angulo: cuNorm180(c.H + info.delta + 180) });
  }
  return lista;
}
// scripts/lunario.js
// Capa Lunario (enfoque "Lunario"): la Tierra inclinada en el centro (600, 600), la Luna en su órbita real y los nodos.
//   · Tierra: continentes proyectados en vivo (gira con el tiempo sidéreo, conserva la inclinación de 23,44°, día y noche reales).
//   · Luna: posición, distancia y fase reales; se ve iluminada desde la dirección real del Sol.
//   · Órbita: la trayectoria real de un mes, con perigeo y apogeo; los nodos marcan donde cruza la eclíptica.
// Las distancias son reales (apogeo = radio 780); los tamaños de la Tierra y la Luna se exageran por igual (ver lunario-geometria.js).
// Depende de: lunario-datos.js, lunario-geometria.js, nodos-lunares.js, efemerides-precisas.js, eclipses.js (faseLunarPrecisa),
//             iconos-svg.js (iconoEnmascarado), constelaciones.js (existeIcono), idioma.js (idiomaActual)

// Mareas (marea de equilibrio: la fuerza astronómica; las mareas reales de cada puerto dependen además de la costa y la profundidad)
const LUNARIO_MAREAS = {
  exageracion: 0.12,   // deformación visual de la capa de agua con la Luna a su distancia media (muy exagerada, solo para verla)
  razonSolar: 0.4595,  // efecto de marea del Sol respecto al de la Luna a distancias medias
  vivas: 95,           // índice (%) desde el que se llaman mareas vivas
  extremas: 108,       // ... y mareas vivas extremas (con la Luna cerca del perigeo)
  muertas: 65,         // por debajo: mareas muertas
};
const LUNARIO_NODOS = { tamano: 70, rutaNorte: "svg/eclipses/nodonorte.svg", rutaSur: "svg/eclipses/nodosur.svg" };

// Textos en un solo sitio para traducirlos (añade una clave "en"; si falta se usa "es")
const TEXTOS_LUNARIO = {
  es: {
    distancia: (km) => `Distancia a la Luna: ${km} km`,
    fase: (nombre, pct) => `${nombre} · ${pct} %`,
    fases: ["Luna nueva", "Luna creciente", "Cuarto creciente", "Gibosa creciente", "Luna llena", "Gibosa menguante", "Cuarto menguante", "Luna menguante"],
    sol: "Sol",
    vistaTierra: "Vista desde la Tierra",
    mareas: (clase, pct) => `${["Mareas muertas", "Mareas intermedias", "Mareas vivas", "Mareas vivas extremas"][clase]} · ${pct} %`,
    mareaMuertas: "muertas",
    mareaVivas: "vivas",
    nodoNorte: "Nodo norte",
    nodoSur: "Nodo sur",
  },
  en: {
    distancia: (km) => `Distance to the Moon: ${km} km`,
    fase: (nombre, pct) => `${nombre} · ${pct} %`,
    fases: ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"],
    sol: "Sun",
    vistaTierra: "View from Earth",
    mareas: (clase, pct) => `${["Neap tides", "Intermediate tides", "Spring tides", "Extreme spring tides"][clase]} · ${pct} %`,
    mareaMuertas: "neap",
    mareaVivas: "spring",
    nodoNorte: "North node",
    nodoSur: "South node",
  },
};
function textoLunario(clave, a, b) {
  const tabla = TEXTOS_LUNARIO[idiomaActual?.()] || TEXTOS_LUNARIO.es;
  const v = tabla[clave] ?? TEXTOS_LUNARIO.es[clave];
  return typeof v === "function" ? v(a, b) : v;
}

let lunario = null;
const lunarioTrayectoria = { ms: null, atras: "", delante: "" };

const lunCruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lunDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lunUnit = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const lunF = (n) => n.toFixed(1);

function nombreDeFase(elongacion) { // 0 = nueva, 90 = cuarto creciente, 180 = llena, 270 = cuarto menguante
  const e = ((elongacion % 360) + 360) % 360;
  if (e < 3.5 || e >= 356.5) return 0;
  if (e < 86) return 1;
  if (e < 94) return 2;
  if (e < 176) return 3;
  if (e < 184) return 4;
  if (e < 266) return 5;
  if (e < 274) return 6;
  return 7;
}

// ───── Mareas: forzamiento lunar y solar ─────
// Fuerza de marea ∝ masa / distancia³. La amplitud semidiurna combinada es la suma de dos fasores separados el doble de la elongación:
// A = √(Lm² + Ls² + 2·Lm·Ls·cos 2ε). El índice toma como 100 % las mareas vivas con distancias medias.
function lunMareas(distLuna, distSolUA, elongacion) {
  const M = LUNARIO_MAREAS, Lm = Math.pow(384400 / distLuna, 3), Ls = M.razonSolar / Math.pow(distSolUA, 3);
  const A = Math.sqrt(Lm * Lm + Ls * Ls + 2 * Lm * Ls * Math.cos(2 * elongacion * LUN_DEG));
  const indice = (A / (1 + M.razonSolar)) * 100;
  const clase = indice >= M.extremas ? 3 : indice >= M.vivas ? 2 : indice >= M.muertas ? 1 : 0;
  return { Lm, Ls, indice, clase, epsLuna: M.exageracion * Lm, epsSol: M.exageracion * Ls };
}

// Perfil de un abultamiento (esferoide alargado hacia el astro) visto en la pantalla: radio extra en N direcciones
function lunSumarPerfilMarea(u, eps, R, delta) {
  const [sx, sy, sd] = lunProyectar(u), N = delta.length;
  const A = R * (1 + (2 * eps) / 3), B = R * (1 - eps / 3);
  const a = Math.sqrt(B * B + (A * A - B * B) * Math.max(0, 1 - sd * sd)), th = Math.atan2(sy, sx);
  for (let i = 0; i < N; i++) {
    const p = (i / N) * 2 * Math.PI - th;
    delta[i] += (a * B) / Math.sqrt((B * Math.cos(p)) ** 2 + (a * Math.sin(p)) ** 2) - R;
  }
}
function lunAguaSvg(R, uLuna, uSol, mareas) {
  const N = 120, delta = new Array(N).fill(0);
  lunSumarPerfilMarea(uLuna, mareas.epsLuna, R, delta);
  lunSumarPerfilMarea(uSol, mareas.epsSol, R, delta);
  const pts = delta.map((d, i) => { const a = (i / N) * 2 * Math.PI, r = R + d; return `${lunF(r * Math.cos(a))} ${lunF(r * Math.sin(a))}`; });
  return `<path class="lun-agua" d="M ${pts.join(" L ")} Z"/>`;
}

function asegurarLunario() {
  if (lunario) return lunario;
  const svg = document.getElementById("reloj");
  const capa = document.createElementNS(SVG_NS, "g");
  capa.setAttribute("id", "capa-lunario");
  capa.classList.add("capa-enfocada"); // se crea al abrir el enfoque, cuando aplicarEnfoque() ya pasó
  capa.innerHTML = `<g transform="translate(${LUNARIO.centro} ${LUNARIO.centro})">
    <defs>
      <radialGradient id="lun-grad-oceano" cx="38%" cy="34%" r="75%"><stop offset="0" style="stop-color:var(--tierra-oceano)"/><stop offset="1" style="stop-color:var(--tierra-oceano-profundo)"/></radialGradient>
      <radialGradient id="lun-grad-sol"><stop offset="0" style="stop-color:var(--sol)"/><stop offset="1" style="stop-color:var(--sol-brillo)"/></radialGradient>
    </defs>
    <g class="lun-guias"></g><g class="lun-atras"></g><g class="lun-tierra"></g><g class="lun-delante"></g><g class="lun-nodos"></g><g class="lun-texto-grupo"></g>
  </g>`;
  svg.appendChild(capa);
  const raiz = capa.firstElementChild;
  const g = (c) => raiz.querySelector(`.${c}`);

  const nodos = {};
  for (const [clave, ruta] of [["norte", LUNARIO_NODOS.rutaNorte], ["sur", LUNARIO_NODOS.rutaSur]]) {
    const grupo = document.createElementNS(SVG_NS, "g");
    grupo.setAttribute("class", `lun-nodo lun-nodo-${clave}`);
    const etiqueta = document.createElementNS(SVG_NS, "text");
    etiqueta.setAttribute("class", "lun-etiqueta-nodo");
    etiqueta.setAttribute("text-anchor", "middle");
    etiqueta.setAttribute("y", clave === "norte" ? LUNARIO_NODOS.tamano / 2 + 30 : -LUNARIO_NODOS.tamano / 2 - 12); // norte: debajo; sur: encima
    grupo.appendChild(etiqueta);
    const url = new URL(ruta, document.baseURI).href;
    existeIcono(url).then((existe) => {
      if (existe) {
        const t = LUNARIO_NODOS.tamano;
        grupo.insertBefore(iconoEnmascarado(ruta, -t / 2, -t / 2, t, t, "lun-icono-nodo", "xMidYMid"), etiqueta);
      } else {
        const glifo = document.createElementNS(SVG_NS, "text");
        glifo.setAttribute("class", "lun-glifo-nodo");
        glifo.setAttribute("text-anchor", "middle");
        glifo.setAttribute("dominant-baseline", "central");
        glifo.textContent = clave === "norte" ? "☊" : "☋";
        grupo.insertBefore(glifo, etiqueta);
      }
    });
    g("lun-nodos").appendChild(grupo);
    nodos[clave] = { grupo, etiqueta };
  }
  document.addEventListener("cambio-idioma", () => { nodos.norte.etiqueta.textContent = ""; nodos.sur.etiqueta.textContent = ""; });
  lunario = { capa, guias: g("lun-guias"), atras: g("lun-atras"), tierra: g("lun-tierra"), delante: g("lun-delante"), texto: g("lun-texto-grupo"), nodos };
  return lunario;
}

// ───── Tierra ─────
function lunPoligonoTierra(puntos, gmst, eps, R) {
  let visibles = 0;
  const pts = puntos.map(([lon, lat]) => {
    const p = lunProyectar(lunPuntoDeLaTierra(lat, lon, gmst, eps));
    if (p[2] >= 0) { visibles++; return [p[0] * R, p[1] * R]; }
    const h = Math.hypot(p[0], p[1]) || 1; // los puntos del otro lado se llevan al borde
    return [(p[0] / h) * R, (p[1] / h) * R];
  });
  return visibles ? `M ${pts.map((p) => `${lunF(p[0])} ${lunF(p[1])}`).join(" L ")} Z` : "";
}

function lunTierraSvg(s, gmst, eps, lugar, agua = "") {
  const R = LUNARIO.radioTierra;
  const trazo = (clase, puntos) => { const d = lunPoligonoTierra(puntos, gmst, eps, R); return d ? `<path class="${clase}" d="${d}"/>` : ""; };
  let tierra = "", desiertos = "", hielo = "";
  Object.values(LUN_CONTINENTES).forEach((c) => { tierra += trazo("lun-firme", c); });
  LUN_DESIERTOS.forEach((c) => { desiertos += trazo("lun-desierto", c); });
  LUN_HIELO_TIERRA.forEach((c) => { hielo += trazo("lun-hielo", c); });
  LUN_CASQUETES.forEach(({ lat }) => {
    const anillo = []; for (let lon = -180; lon < 180; lon += 10) anillo.push([lon, lat]);
    hielo += trazo("lun-hielo", anillo);
  });
  const noche = lunTrazoFase(R, s);
  const eje = lunProyectar(lunPuntoDeLaTierra(90, 0, gmst, eps));
  let pin = "";
  if (lugar) {
    const p = lunProyectar(lunPuntoDeLaTierra(lugar.lat, lugar.lon, gmst, eps));
    if (p[2] > 0.02) pin = `<g transform="translate(${lunF(p[0] * R)} ${lunF(p[1] * R)})"><circle class="lun-lugar-halo" r="16"/><circle class="lun-lugar" r="6"/></g>`;
  }
  return `<circle class="lun-atmosfera lun-atmosfera-externa" r="${R * 1.045}"/><circle class="lun-atmosfera" r="${R * 1.015}"/>${agua}
    <circle r="${R}" fill="url(#lun-grad-oceano)"/>
    <clipPath id="lun-clip-tierra"><circle r="${R}"/></clipPath>
    <g clip-path="url(#lun-clip-tierra)">${tierra}${desiertos}${hielo}${noche.sombra ? `<path class="lun-noche" d="${noche.sombra}" transform="rotate(${noche.angulo.toFixed(2)})"/>` : ""}${pin}</g>
    <line class="lun-eje" x1="${lunF(-eje[0] * R * 1.22)}" y1="${lunF(-eje[1] * R * 1.22)}" x2="${lunF(eje[0] * R * 1.22)}" y2="${lunF(eje[1] * R * 1.22)}"/>`;
}

// ───── Luna ─────
// R y proy opcionales: con ellos se dibuja la Luna tal como se ve desde la Tierra (recuadro de la fase)
function lunLunaSvg(pos, mUnit, s, R = LUNARIO.radioLuna, proy = lunProyectar, umbra = 0) {
  const fase = lunTrazoFase(R, s, proy), ang = fase.angulo.toFixed(2);
  // Marco selenográfico: x' hacia la Tierra, z'' hacia el norte, y' hacia el este lunar (a la derecha vista desde la Tierra)
  const xp = [-mUnit[0], -mUnit[1], -mUnit[2]];
  const zp = lunUnit([-xp[0] * xp[2], -xp[1] * xp[2], 1 - xp[2] * xp[2]]);
  const yp = lunCruz(zp, xp);
  let maria = "";
  for (const [lat, lon, radio] of LUN_MARIA) {
    const cl = Math.cos(lat * LUN_DEG), sl = Math.sin(lat * LUN_DEG), co = Math.cos(lon * LUN_DEG), so = Math.sin(lon * LUN_DEG);
    const v = [0, 1, 2].map((i) => xp[i] * cl * co + yp[i] * cl * so + zp[i] * sl);
    const p = proy(v);
    if (p[2] <= 0.12) continue;
    const rho = radio * LUN_DEG * R, cx = p[0] * R, cy = p[1] * R, a = (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    maria += `<ellipse cx="${lunF(cx)}" cy="${lunF(cy)}" rx="${lunF(rho * p[2])}" ry="${lunF(rho)}" transform="rotate(${a.toFixed(1)} ${lunF(cx)} ${lunF(cy)})"/>`;
  }
  return `<g transform="translate(${lunF(pos[0])} ${lunF(pos[1])})">
    <circle class="lun-luna-sombra" r="${R}"/>
    ${fase.luz ? `<path class="lun-luna-luz" d="${fase.luz}" transform="rotate(${ang})"/><clipPath id="lun-clip-luz-${Math.round(R)}"><path d="${fase.luz}" transform="rotate(${ang})"/></clipPath><g class="lun-mares" clip-path="url(#lun-clip-luz-${Math.round(R)})">${maria}</g>` : ""}
    ${umbra > 0.01 ? `<circle class="lun-luna-umbra" r="${R}" style="opacity:${Math.min(0.92, umbra).toFixed(2)}"/>` : ""}
    <circle class="lun-luna-borde" r="${R}"/></g>`;
}

// ───── Órbita real de un mes (se recalcula si el tiempo avanza más de 3 h simuladas) ─────
function lunCalcularTrayectoria(ms) {
  const N = 144, T = 27.3216 * 86400000, pts = [];
  for (let i = 0; i <= N; i++) {
    const p = posicionLunarPrecisa(ms - T / 2 + (i / N) * T), q = lunProyectar(lunVector(p.longitud, p.latitud)), r = p.distancia * LUNARIO.escala;
    pts.push([q[0] * r, q[1] * r, q[2]]);
  }
  const atras = [], delante = [];
  let seg = [pts[0]], signo = pts[0][2] >= 0;
  for (let i = 1; i <= N; i++) {
    const s = pts[i][2] >= 0;
    if (s !== signo) { seg.push(pts[i]); (signo ? delante : atras).push(seg); seg = [pts[i]]; signo = s; } else seg.push(pts[i]);
  }
  (signo ? delante : atras).push(seg);
  const trazo = (lista) => lista.map((sg) => `M ${sg.map((p) => `${lunF(p[0])} ${lunF(p[1])}`).join(" L ")}`).join(" ");
  lunarioTrayectoria.ms = ms;
  lunarioTrayectoria.atras = trazo(atras);
  lunarioTrayectoria.delante = trazo(delante);
}

// Se llama en cada fotograma desde main.js (solo trabaja con el enfoque Lunario)
function actualizarLunario(fecha) {
  const svg = document.getElementById("reloj");
  if (!svg.classList.contains("enfoque-lunario")) return;
  const L = asegurarLunario(), ms = fecha.getTime();
  const T = siglosTT(ms), eps = 23.4392911 - 0.0130042 * T;
  const gmst = (((280.46061837 + 360.98564736629 * (ms / 86400000 + 2440587.5 - 2451545)) % 360) + 360) % 360;
  const sol = posicionSolarPrecisa(ms), luna = posicionLunarPrecisa(ms), orb = posicionOrbitalLunar(ms), fase = faseLunarPrecisa(ms);
  const s = lunVector(sol.longitud, 0);                                  // dirección hacia el Sol
  const m = lunVector(luna.longitud, luna.latitud), rLuna = luna.distancia * LUNARIO.escala;
  const pm = lunProyectar(m), posLuna = [pm[0] * rLuna, pm[1] * rLuna];

  // Guías en el plano de la eclíptica: perigeo, apogeo y línea de nodos
  const radioP = 356400 * LUNARIO.escala, radioA = LUNARIO.radioApogeo, ry = (r) => r * LUN_SIN_E;
  const dirNodo = lunProyectar(lunVector(orb.nodo, 0)), pSol = lunProyectar(s), rs = LUNARIO.radioMarcaSol;
  L.guias.innerHTML = `<ellipse class="lun-guia" rx="${lunF(radioP)}" ry="${lunF(ry(radioP))}"/><ellipse class="lun-guia" rx="${radioA}" ry="${lunF(ry(radioA))}"/>
    <line class="lun-guia lun-linea-nodos" x1="${lunF(-dirNodo[0] * radioA * 1.1)}" y1="${lunF(-dirNodo[1] * radioA * 1.1)}" x2="${lunF(dirNodo[0] * radioA * 1.1)}" y2="${lunF(dirNodo[1] * radioA * 1.1)}"/>
    <line class="lun-guia" x1="0" y1="0" x2="${lunF(pSol[0] * rs)}" y2="${lunF(pSol[1] * rs)}"/>`;

  if (lunarioTrayectoria.ms === null || Math.abs(ms - lunarioTrayectoria.ms) > 3 * 3600000) lunCalcularTrayectoria(ms);
  const orbitaAtras = `<path class="lun-orbita lun-orbita-atras" d="${lunarioTrayectoria.atras}"/>`;
  const orbitaDelante = `<path class="lun-orbita" d="${lunarioTrayectoria.delante}"/>`;

  const solSvg = `<g transform="translate(${lunF(pSol[0] * rs)} ${lunF(pSol[1] * rs)})"><circle class="lun-sol-halo" r="58"/><circle fill="url(#lun-grad-sol)" r="32"/><text class="lun-etiqueta-sol" y="62" text-anchor="middle">${textoLunario("sol")}</text></g>`;
  // La sombra de la Tierra solo existe del lado opuesto al Sol: con la Luna cerca del Sol (luna nueva) no hay eclipse lunar posible
  const eclipse = fase.elongacion > 177.5 ? condicionesLunares(ms) : { magUmbral: -1, magPenumbral: -1, coberturaUmbra: 0 };
  const umbra = eclipse.magUmbral > 0 ? eclipse.coberturaUmbra : 0;
  const lunaSvg = lunLunaSvg(posLuna, m, s, LUNARIO.radioLuna, lunProyectar, umbra);
  let atras = orbitaAtras, delante = orbitaDelante;
  if (pSol[2] < 0) atras += solSvg; else delante += solSvg;
  if (pm[2] < 0) atras += lunaSvg; else delante += lunaSvg;
  L.atras.innerHTML = atras;
  L.delante.innerHTML = delante;

  const lugar = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? { lat: ubicacion.latitud, lon: ubicacion.longitud } : null;
  const mareas = lunMareas(luna.distancia, sol.distanciaUA, fase.elongacion);
  L.tierra.innerHTML = lunTierraSvg(s, gmst, eps, lugar, lunAguaSvg(LUNARIO.radioTierra, m, s, mareas));

  // Nodos: solo el más cercano a la Luna; ascendente (norte) a la longitud del nodo, descendente (sur) a 180° de él
  const rNodo = 384400 * LUNARIO.escala;
  for (const [clave, lon] of [["norte", orb.nodo], ["sur", orb.nodo + 180]]) {
    const p = lunProyectar(lunVector(lon, 0)), n = L.nodos[clave];
    n.grupo.setAttribute("transform", `translate(${lunF(p[0] * rNodo)} ${lunF(p[1] * rNodo)})`);
    n.grupo.classList.toggle("activo", orb.nodoActivo === clave);
    if (!n.etiqueta.textContent) n.etiqueta.textContent = textoLunario(clave === "norte" ? "nodoNorte" : "nodoSur");
  }
  L.capa.classList.toggle("temporada-eclipses", orb.temporadaEclipses);

  // Recuadro: la Luna tal como se ve desde la Tierra (arriba = norte; así coincide con el nombre y el porcentaje de la fase)
  const vistaTierra = lunUnit(lunCruz(lunCruz([0, 0, 1], m), m).map((v) => -v)); // "arriba" en el cielo: el norte eclíptico visto desde la Tierra
  const derecha = lunCruz(m, vistaTierra);
  const proyTierra = (v) => [lunDot(v, derecha), -lunDot(v, vistaTierra), -lunDot(v, m)];
  let sombraInset = "";
  if (eclipse.magPenumbral > 0) sombraInset = `<g transform="translate(-255 935)">${marcaSombraLunar(geometriaVistaLunar(ms, null, null), 36, "clip-sombra-lunario-inset")}</g>`;
  const insetLuna = `<g><title>${textoLunario("vistaTierra")}</title>${lunLunaSvg([-255, 935], m, s, 36, proyTierra)}${sombraInset}</g>`;

  // Textos: distancia real y fase
  const km = (Math.round(luna.distancia / 10) * 10).toLocaleString(localeActual());
  const nombre = (TEXTOS_LUNARIO[idiomaActual?.()] || TEXTOS_LUNARIO.es).fases[nombreDeFase(fase.elongacion * (fase.creciente ? 1 : -1))];
  const xi = Math.max(-160, Math.min(160, ((mareas.indice - 25) / 100) * 320 - 160));
  const indicador = `<g transform="translate(0 -905)"><text class="lun-texto" text-anchor="middle">${textoLunario("mareas", mareas.clase, Math.round(mareas.indice))}</text>
    <line class="lun-gauge-pista" x1="-160" y1="26" x2="160" y2="26"/><path class="lun-gauge-marca" d="M ${xi.toFixed(1)} 21 l -8 -14 h 16 z"/>
    <text class="lun-gauge-etq" x="-160" y="52" text-anchor="start">${textoLunario("mareaMuertas")}</text><text class="lun-gauge-etq" x="160" y="52" text-anchor="end">${textoLunario("mareaVivas")}</text></g>`;
  L.texto.innerHTML = `${indicador}${insetLuna}<text class="lun-texto" y="940" text-anchor="middle">${textoLunario("distancia", km)}</text><text class="lun-texto lun-texto-fase" y="980" text-anchor="middle">${textoLunario("fase", nombre, Math.round(fase.fraccion * 100))}</text>`;
}

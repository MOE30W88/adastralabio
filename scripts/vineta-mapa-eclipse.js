// scripts/vineta-mapa-eclipse.js
// Viñeta del lado izquierdo, simétrica a la del eclipse: mapa del mundo con la trayectoria y el rango del eclipse en curso.
//   Solar:  zona del eclipse parcial (sombreada; más intenso = más ocultación), franja de totalidad/anularidad con su línea central,
//           el punto del máximo, la sombra "ahora" avanzando con el tiempo simulado y tu ubicación.
//   Lunar:  zona desde donde la Luna está sobre el horizonte (más claro = solo parte del eclipse), el punto bajo la Luna y tu ubicación.
// Aparece solo mientras la tarjeta del eclipse está visible. El cálculo (≈0,4 s) se hace una vez por evento, fuera del fotograma.
// Depende de: eclipse-trayecto.js, mapa-datos.js, eclipse-vista.js (eclipseGlobalCercano), eclipse-lupa.js (estadoEclipseActual)

const TEXTOS_MAPA = {
  es: {
    tituloCentral: "Trayectoria del eclipse",
    tituloParcial: "Zona del eclipse",
    tituloLunar: "Dónde se ve el eclipse",
    maximo: (lat, lon) => `Máximo: ${lat}, ${lon}`,
    franja: (km, tipo) => `Franja ${tipo === "anular" ? "de anularidad" : "de totalidad"}: ${km} km`,
    ocultacion: (p) => `Ocultación máxima: ${p} %`,
    lunar: "Visible donde la Luna está sobre el horizonte",
    lunarLeyenda: "Más claro: solo una parte del eclipse",
    calculando: "Calculando el trayecto…",
    ahora: "Ahora",
    tu: "Tú",
  },
  en: {
    tituloCentral: "Eclipse path",
    tituloParcial: "Eclipse zone",
    tituloLunar: "Where the eclipse is visible",
    maximo: (lat, lon) => `Maximum: ${lat}, ${lon}`,
    franja: (km, tipo) => `${tipo === "anular" ? "Annularity" : "Totality"} path: ${km} km`,
    ocultacion: (p) => `Maximum obscuration: ${p} %`,
    lunar: "Visible where the Moon is above the horizon",
    lunarLeyenda: "Lighter: only part of the eclipse",
    calculando: "Calculating the path…",
    ahora: "Now",
    tu: "You",
  },
};
function textoMapa(clave, a, b) {
  const t = TEXTOS_MAPA[typeof idiomaActual === "function" ? idiomaActual() : "es"] || TEXTOS_MAPA.es;
  const v = t[clave] ?? TEXTOS_MAPA.es[clave];
  return typeof v === "function" ? v(a, b) : v;
}

let vmapa = null, vmapaCalculando = false, vmapaFirma = "";
const vmRel = (lon, lon0) => ((((lon - lon0) % 360) + 540) % 360) - 180;
const vmCoord = (lat, lon) => {
  const f = (v, pos, neg) => `${Math.abs(v).toLocaleString(localeActual(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}° ${v >= 0 ? pos : neg}`;
  return textoMapa("maximo", f(lat, "N", "S"), f(lon, "E", idiomaActual() === "en" ? "W" : "O"));
};

function asegurarMapaEclipse() {
  if (vmapa) return vmapa;
  const t = document.createElement("aside");
  t.id = "vineta-mapa-eclipse";
  t.className = "vineta-mapa";
  t.hidden = true;
  t.setAttribute("role", "status");
  t.innerHTML = `<p class="vineta-mapa-titulo"></p>
    <svg class="vineta-mapa-svg" viewBox="-100 -50 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="vm-escena"></g></svg>
    <p class="vineta-mapa-dato"></p><p class="vineta-mapa-dato vineta-mapa-secundario"></p>
    <p class="vineta-mapa-leyenda"><span class="vm-clave vm-clave-ahora"></span><span class="vm-ahora"></span><span class="vm-clave vm-clave-tu"></span><span class="vm-tu"></span></p>`;
  colocarVineta(t, "izq");
  document.addEventListener("cambio-idioma", () => { vmapaFirma = ""; });
  vmapa = { t, titulo: t.querySelector(".vineta-mapa-titulo"), svg: t.querySelector(".vineta-mapa-svg"), escena: t.querySelector(".vm-escena"),
    datos: t.querySelectorAll(".vineta-mapa-dato"), ahora: t.querySelector(".vm-ahora"), tu: t.querySelector(".vm-tu"), marcador: null, tr: null, lon0: 0, ancho: 0 };
  return vmapa;
}

// Imagen (blanca con transparencia) de la malla: sirve de máscara para pintar la zona con el color del tema
function vmRaster(zona, solar) {
  const c = document.createElement("canvas");
  c.width = zona.nLon; c.height = zona.nLat;
  const ctx = c.getContext("2d"), img = ctx.createImageData(zona.nLon, zona.nLat);
  for (let k = 0; k < zona.datos.length; k++) {
    const v = zona.datos[k];
    img.data.set([255, 255, 255, v > 0.001 ? Math.round(solar ? 70 + 150 * v : 90 + 140 * v) : 0], k * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function vmRegion(tr, lon0) {
  if (tr.tipo === "lunar") return { cx: 0, cy: 0, w: 360 };
  const z = tr.zona; let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180, hay = false;
  for (let i = 0; i < z.nLat; i++) for (let j = 0; j < z.nLon; j++) if (z.datos[i * z.nLon + j] > 0.001) {
    const lat = 90 - i * z.g, lon = vmRel(-180 + j * z.g, lon0);
    hay = true; la0 = Math.min(la0, lat); la1 = Math.max(la1, lat); lo0 = Math.min(lo0, lon); lo1 = Math.max(lo1, lon);
  }
  if (!hay) return { cx: 0, cy: 0, w: 360 };
  const w = Math.min(360, Math.max((lo1 - lo0) * 1.18, (la1 - la0) * 2 * 1.18, 50));
  return { cx: (lo0 + lo1) / 2, cy: (la0 + la1) / 2, w };
}

function dibujarMapaEclipse(m) {
  const tr = m.tr, lon0 = tr.maximo.lon, solar = tr.tipo === "solar", reg = vmRegion(tr, lon0);
  let h = reg.w / 2, cy = reg.cy;
  cy = Math.max(-90 + h / 2, Math.min(90 - h / 2, cy));
  m.lon0 = lon0; m.ancho = reg.w;
  m.svg.setAttribute("viewBox", `${(reg.cx - reg.w / 2).toFixed(2)} ${(-(cy + h / 2)).toFixed(2)} ${reg.w.toFixed(2)} ${h.toFixed(2)}`);

  let tierra = "";
  for (const k of [-1, 0, 1]) for (const p of MAPA_TIERRA) tierra += `M ${p.map(([lo, la]) => `${(lo - lon0 + 360 * k).toFixed(1)} ${(-la).toFixed(1)}`).join(" L ")} Z `;
  let grat = "";
  for (let lat = -60; lat <= 60; lat += 30) grat += `M ${-540} ${-lat} H 540 `;
  for (let lo = -540; lo <= 540; lo += 30) grat += `M ${lo - lon0 % 30} -90 V 90 `;

  const z = tr.zona, g = z.g, imagen = vmRaster(z, solar);
  const imgs = [-1, 0, 1].map((k) => `<image href="${imagen}" x="${(-180 - g / 2 - lon0 + 360 * k).toFixed(2)}" y="${-(90 + g / 2)}" width="${(z.nLon * g).toFixed(2)}" height="${(z.nLat * g).toFixed(2)}" preserveAspectRatio="none"/>`).join("");

  let umbra = "";
  if (solar && tr.central && tr.central.length) {
    const desenrollar = (lista) => { let prev = null; return lista.map((p) => { let x = vmRel(p.lon, lon0); if (prev !== null) { while (x - prev > 180) x -= 360; while (prev - x > 180) x += 360; } prev = x; return [x, -p.lat]; }); };
    const A = desenrollar(tr.limiteA), B = desenrollar(tr.limiteB).reverse(), C = desenrollar(tr.central);
    const pts = (l) => l.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L ");
    if (A.length > 2 && B.length > 2) umbra += `<path class="vm-umbra" d="M ${pts(A)} L ${pts(B)} Z"/>`;
    umbra += `<path class="vm-central" d="M ${pts(C)}"/>`;
  }
  const r = reg.w * 0.014, mx = vmRel(tr.maximo.lon, lon0), my = -tr.maximo.lat;
  let pin = "";
  if (typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number") pin = `<circle class="vm-tu-marca" cx="${vmRel(ubicacion.longitud, lon0).toFixed(2)}" cy="${(-ubicacion.latitud).toFixed(2)}" r="${(r * 0.8).toFixed(2)}"/>`;
  m.escena.innerHTML = `<mask id="vm-mascara" maskUnits="userSpaceOnUse" x="-900" y="-100" width="1800" height="200">${imgs}</mask>
    <rect class="vm-oceano" x="-900" y="-100" width="1800" height="200"/><path class="vm-tierra" d="${tierra}"/><path class="vm-grat" d="${grat}"/>
    <rect class="${solar ? "vm-zona" : "vm-zona vm-zona-lunar"}" x="-900" y="-100" width="1800" height="200" mask="url(#vm-mascara)"/>
    ${umbra}<circle class="vm-maximo" cx="${mx.toFixed(2)}" cy="${my.toFixed(2)}" r="${(r * 0.9).toFixed(2)}"/>
    <g class="vm-marcador"><circle class="vm-marcador-halo" r="${(r * 1.7).toFixed(2)}"/><circle class="vm-marcador-punto" r="${r.toFixed(2)}"/></g>${pin}`;
  m.marcador = m.escena.querySelector(".vm-marcador");
}

// Se llama en cada fotograma desde main.js, después de actualizarEclipse()
function actualizarVinetaMapaEclipse(fecha) {
  const m = asegurarMapaEclipse(), e = typeof estadoEclipseActual !== "undefined" ? estadoEclipseActual : null;
  if (!e) { if (!m.t.hidden) { m.t.hidden = true; m.escena.innerHTML = ""; m.tr = null; vmapaFirma = ""; } return; }
  const ms = fecha.getTime(), ev = eclipseGlobalCercano(ms, e.tipo);
  if (!ev) return;
  m.t.hidden = false;
  const clave = `${ev.tipo}-${Math.round(ev.maximo / 60000)}`, loc = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number" ? ubicacion.latitud.toFixed(1) : "-";
  if (!trCache[clave]) {
    m.titulo.textContent = ev.tipo === "lunar" ? textoMapa("tituloLunar") : textoMapa("tituloParcial");
    m.datos[0].textContent = textoMapa("calculando"); m.datos[1].textContent = "";
    if (!vmapaCalculando) { vmapaCalculando = true; setTimeout(() => { trayectoEclipse(ev); vmapaCalculando = false; vmapaFirma = ""; }, 40); }
    return;
  }
  const tr = trayectoEclipse(ev), firma = `${clave}|${loc}`;
  if (firma !== vmapaFirma) {
    vmapaFirma = firma; m.tr = tr; dibujarMapaEclipse(m);
    const central = tr.tipo === "solar" && tr.central && tr.central.length;
    m.titulo.textContent = tr.tipo === "lunar" ? textoMapa("tituloLunar") : central ? textoMapa("tituloCentral") : textoMapa("tituloParcial");
    if (tr.tipo === "lunar") { m.datos[0].textContent = textoMapa("lunar"); m.datos[1].textContent = textoMapa("lunarLeyenda"); }
    else if (central) { m.datos[0].textContent = vmCoord(tr.maximo.lat, tr.maximo.lon); m.datos[1].textContent = textoMapa("franja", Math.round(tr.maximo.anchoKm), tr.clase); }
    else { m.datos[0].textContent = textoMapa("ocultacion", Math.min(99, Math.round(Math.max(...tr.zona.datos) * 100))); m.datos[1].textContent = ""; }
    m.ahora.textContent = textoMapa("ahora"); m.tu.textContent = textoMapa("tu");
  }
  const p = trMarcadorEn(tr, ms);
  if (m.marcador) {
    m.marcador.style.display = p ? "" : "none";
    if (p) m.marcador.setAttribute("transform", `translate(${vmRel(p.lon, m.lon0).toFixed(2)} ${(-p.lat).toFixed(2)})`);
  }
}

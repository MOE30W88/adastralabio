// herramientas/generar-mapa.js — SOLO de desarrollo (no se publica).
// Genera scripts/mapa-fronteras-datos.js a partir de Natural Earth (dominio público):
//   world-atlas (costas y fronteras 50m), ne_50m_populated_places (ciudades) e i18n-iso-countries (nombres de países en español).
// Uso: node generar-mapa.js [tolerancia en grados, por defecto 0.08] > scripts/mapa-fronteras-datos.js
const fs = require("fs");
const topojson = require("topojson-client");
const paises = require("i18n-iso-countries");
paises.registerLocale(require("i18n-iso-countries/langs/es.json"));

const TOL = Number(process.argv[2] || 0.08), CIUDADES_MAX = 1300;
const r2 = (n) => Math.round(n * 100) / 100;

function dp(p, tol) { // Douglas–Peucker iterativo
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const pila = [[0, p.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop(); let dmax = 0, im = -1;
    const [ax, ay] = p[a], [bx, by] = p[b], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let t = L ? ((p[i][0] - ax) * dx + (p[i][1] - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p[i][0] - (ax + t * dx), p[i][1] - (ay + t * dy));
      if (d > dmax) { dmax = d; im = i; }
    }
    if (dmax > tol) { keep[im] = 1; pila.push([a, im], [im, b]); }
  }
  return p.filter((_, i) => keep[i]);
}
const linea = (l) => { const s = dp(l, TOL).map(([x, y]) => [r2(x), r2(y)]); return s.length > 1 ? s : null; };

const t50 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const l50 = JSON.parse(fs.readFileSync("node_modules/world-atlas/land-50m.json"));

// Costas: anillos exteriores de la tierra (se descartan islas diminutas)
const costas = [];
for (const poly of topojson.feature(l50, l50.objects.land).features.flatMap((f) => f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)) {
  const s = linea(poly[0]); if (s && s.length >= 4) costas.push(s); // huecos (lagos) fuera
}
// Fronteras entre países (líneas compartidas)
const fronteras = topojson.mesh(t50, t50.objects.countries, (a, b) => a !== b).coordinates.map(linea).filter(Boolean);

// Ciudades y capitales
const g = JSON.parse(fs.readFileSync("ciudades-full.geojson", "utf8"));
const nombrePais = (iso2, ingles) => (iso2 && iso2 !== "-99" && paises.getName(iso2, "es", { select: "official" })) || ingles;
const ciudades = g.features.map((f) => f.properties).sort((a, b) => b.POP_MAX - a.POP_MAX).slice(0, CIUDADES_MAX)
  .map((p) => [p.NAME_ES || p.NAME, nombrePais(p.ISO_A2, p.ADM0NAME), r2(p.LATITUDE), r2(p.LONGITUDE), p.ADM0CAP ? 1 : 0, Math.round(p.POP_MAX / 1000)]);

// Países: capital si existe; si no, centro del polígono mayor
const capitales = {}; g.features.forEach((f) => { const p = f.properties; if (p.ADM0CAP && p.ISO_A2 && p.ISO_A2 !== "-99") capitales[p.ISO_A2] = [p.LATITUDE, p.LONGITUDE]; });
const centro = (geom) => { const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates; let mejor = null, am = -1;
  for (const pl of polys) { const a = Math.abs(pl[0].reduce((s, p, i, arr) => { const q = arr[(i + 1) % arr.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2); if (a > am) { am = a; mejor = pl[0]; } }
  return [mejor.reduce((s, p) => s + p[1], 0) / mejor.length, mejor.reduce((s, p) => s + p[0], 0) / mejor.length]; };
const extra = { "Kosovo": "Kosovo", "Somaliland": "Somalilandia", "N. Cyprus": "Chipre del Norte" };
const lista = topojson.feature(t50, t50.objects.countries).features.map((f) => {
  const a2 = f.id ? paises.numericToAlpha2(String(f.id).padStart(3, "0")) : null;
  const nombre = (a2 && paises.getName(a2, "es", { select: "official" })) || extra[f.properties.name] || f.properties.name;
  const c = (a2 && capitales[a2]) || centro(f.geometry);
  return [nombre, r2(c[0]), r2(c[1])];
}).sort((a, b) => a[0].localeCompare(b[0], "es"));

const cab = `// scripts/mapa-fronteras-datos.js — GENERADO por herramientas/generar-mapa.js (no editar a mano).
// Fuente: Natural Earth 50m (dominio público) vía world-atlas; nombres de países: i18n-iso-countries (es). Tolerancia de simplificación: ${TOL}°.
// MAPA_COSTAS_DET / MAPA_FRONTERAS: listas de líneas [[lon,lat],…]. MAPA_PAISES: [nombre, lat, lon] (capital o centro).
// MAPA_CIUDADES: [nombre, país, lat, lon, esCapital, población en miles], de mayor a menor población.
`;
const js = (n, v) => `const ${n} = ${JSON.stringify(v)};\n`;
process.stdout.write(cab + js("MAPA_COSTAS_DET", costas) + js("MAPA_FRONTERAS", fronteras) + js("MAPA_PAISES", lista) + js("MAPA_CIUDADES", ciudades));

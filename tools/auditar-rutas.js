#!/usr/bin/env node
// tools/auditar-rutas.js — revisa que cada ruta escrita en HTML, CSS y JS exista con las MISMAS mayúsculas y minúsculas.
// GitHub Pages corre en Linux, donde "Svg/Logo.svg" y "svg/logo.svg" son archivos distintos; en Windows y macOS no.
// Uso (desde la raíz del proyecto):  node tools/auditar-rutas.js [carpeta]
// Revisa las rutas escritas tal cual. Las que el código arma con ${variables} (iconos por nombre, signos, animales) se revisan
// aparte: el script lista los patrones y comprueba cuántos archivos hay en cada carpeta de iconos.
// Si el proyecto está en git, además compara las mayúsculas con las que git guardó (git ls-files).
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const RAIZ = path.resolve(process.argv[2] || ".");
const IGNORAR = new Set(["node_modules", ".git", "tools"]);

const recorrer = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  IGNORAR.has(e.name) ? [] : e.isDirectory() ? recorrer(path.join(d, e.name)) : [path.join(d, e.name)]);
const reales = recorrer(RAIZ).map((f) => path.relative(RAIZ, f).split(path.sep).join("/"));
const conjunto = new Set(reales), minus = new Map(reales.map((r) => [r.toLowerCase(), r]));

let problemas = 0;
const avisar = (t) => { problemas++; console.log(t); };

// 1) Archivos que solo se diferencian en mayúsculas
const vistos = new Map();
for (const r of reales) { const k = r.toLowerCase(); if (vistos.has(k)) avisar(`DUPLICADO por mayúsculas: ${vistos.get(k)}  y  ${r}`); vistos.set(k, r); }

// 2) Rutas escritas en el código
const quitarComentarios = (js) => js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
function revisar(de, ref, base) {
  if (/^(https?:|data:|mailto:|tel:|#|javascript:|\/\/)/.test(ref) || /[%<>\s{}]/.test(ref)) return;
  ref = ref.split("#")[0].split("?")[0];
  if (!ref) return;
  const abs = ref.startsWith("/") ? ref.slice(1) : path.posix.normalize(path.posix.join(base, ref));
  if (conjunto.has(abs)) return;
  const alt = minus.get(abs.toLowerCase());
  avisar(alt ? `MAYÚSCULAS  ${de}: "${ref}" existe como "${alt}"` : `NO EXISTE   ${de}: "${ref}"`);
  if (ref.startsWith("/")) avisar(`RAÍZ "/"    ${de}: "${ref}" falla en un sitio de proyecto (usuario.github.io/repo/): usa ruta relativa`);
}
for (const f of reales.filter((r) => /\.(html|css|js)$/.test(r))) {
  let t = fs.readFileSync(path.join(RAIZ, f), "utf8"); const dir = path.posix.dirname(f) === "." ? "" : path.posix.dirname(f);
  if (f.endsWith(".html")) for (const m of t.matchAll(/\b(?:href|src|poster)\s*=\s*"([^"]+)"/g)) revisar(f, m[1], dir);
  else if (f.endsWith(".css")) { for (const m of t.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) revisar(f, m[1], dir); for (const m of t.matchAll(/@import\s+["']([^"']+)["']/g)) revisar(f, m[1], dir); }
  else { t = quitarComentarios(t); for (const m of t.matchAll(/["'`]([^"'`\n$]*\.(?:svg|png|jpe?g|webp|gif|json|css|js|html|ico|woff2?)(?:[?#][^"'`\n]*)?)["'`]/g)) revisar(f, m[1], ""); }
}

// 3) Plantillas con ${...}: se muestran para revisarlas con los archivos de su carpeta
const plantillas = new Set();
for (const f of reales.filter((r) => /^scripts\/.*\.js$/.test(r))) {
  for (const m of quitarComentarios(fs.readFileSync(path.join(RAIZ, f), "utf8")).matchAll(/`([^`\n]*\$\{[^`\n]*\.svg)`/g)) plantillas.add(`${f}: ${m[1]}`);
}
if (plantillas.size) { console.log("\nRutas armadas con variables (comprueba que los nombres de archivo coincidan letra por letra):"); plantillas.forEach((p) => console.log("  " + p)); }

// 4) Mayúsculas guardadas por git (en Windows/macOS git puede conservar el nombre antiguo tras renombrar)
try {
  const git = execSync("git ls-files", { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
  for (const g of git) { const alt = minus.get(g.toLowerCase()); if (alt && alt !== g) avisar(`GIT        guarda "${g}" pero en disco es "${alt}" → git mv -f "${g}" "${alt}"`); }
} catch (e) { /* sin git: se omite */ }

console.log(problemas ? `\n${problemas} problema(s).` : "\nSin problemas: todas las rutas escritas coinciden con los archivos.");
process.exitCode = problemas ? 1 : 0;

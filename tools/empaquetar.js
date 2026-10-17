// Uso: node tools/empaquetar.js   → crea publicar/ (copia del sitio con index.html apuntando a 2 archivos empaquetados).
// Tus fuentes NO se tocan. Requiere: npm i -D esbuild
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const RAIZ = path.resolve(__dirname, "..");
const SALIDA = path.join(RAIZ, "publicar");
const EXCLUIR = new Set([".git", ".github", "node_modules", "tools", "publicar", "package.json", "package-lock.json", ".gitignore"]);

fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA);
for (const e of fs.readdirSync(RAIZ).filter((n) => !EXCLUIR.has(n))) fs.cpSync(path.join(RAIZ, e), path.join(SALIDA, e), { recursive: true });

let html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");

const reCss = /^[ \t]*<link rel="stylesheet" href="(css\/[^"]+)"\s*\/?>[ \t]*\r?\n/gm;
const reJs = /^[ \t]*<script src="(scripts\/[^"]+)" defer><\/script>[ \t]*\r?\n/gm;
const css = [...html.matchAll(reCss)].map((m) => m[1]);
const js = [...html.matchAll(reJs)].map((m) => m[1]);

(async () => {
  const dist = path.join(SALIDA, "dist");
  fs.mkdirSync(dist);
  const c = await esbuild.transform(css.map(leer).join("\n"), { loader: "css", minify: true });
  // Dos paquetes, cortados justo después de main.js: en un solo archivo las funciones de scripts posteriores
  // existirían ya en el primer fotograma (hoisting) y cambiaría el orden de arranque original.
  const corte = js.indexOf("scripts/main.js") + 1;
  const empaquetarJs = async (lista) => (await esbuild.transform(lista.map((f) => leer(f) + "\n;").join("\n"), { loader: "js", minify: true })).code;
  const j1 = await empaquetarJs(js.slice(0, corte));
  const j2 = await empaquetarJs(js.slice(corte));
  fs.writeFileSync(path.join(dist, "estilos.css"), c.code);
  fs.writeFileSync(path.join(dist, "app.js"), j1);
  fs.writeFileSync(path.join(dist, "app2.js"), j2);

  let primeroCss = true, primeroJs = true;
  html = html
    .replace(reCss, () => (primeroCss ? ((primeroCss = false), '    <link rel="stylesheet" href="dist/estilos.css" />\n') : ""))
    .replace(reJs, () => (primeroJs ? ((primeroJs = false), '    <script src="dist/app.js" defer></script>\n    <script src="dist/app2.js" defer></script>\n') : ""));
  fs.writeFileSync(path.join(SALIDA, "index.html"), html);

  console.log(`CSS: ${css.length} archivos → dist/estilos.css (${(c.code.length / 1024).toFixed(0)} KB)`);
  console.log(`JS : ${js.length} archivos → dist/app.js + dist/app2.js (${((j1.length + j2.length) / 1024).toFixed(0)} KB)`);
})();

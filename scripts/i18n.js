// scripts/i18n.js
// Núcleo de idioma. Se carga el PRIMERO (tras atributos-eficientes.js): lo usan todos los módulos.
//   idiomaActual()            "es" | "en"
//   localeActual()            "es" | "en-US" (para toLocaleString, Intl.DateTimeFormat…)
//   textoDe(tablas, clave, …) busca clave en tablas[idioma] y, si falta, en tablas.es; si es función la llama con los argumentos
//   tx("texto"), tx`texto ${x}`   traducen textos escritos por scripts (diccionario en traducciones-js-en.js)
//   rutaPagina("paginas/infografias.html#x")  ruta desde index.html a una página interna, en el idioma activo (ruta real en español; en inglés añade en/)
//   urlPaginaEquivalente(idioma)      en una página interna: URL de su versión en el otro idioma (null en index)
// El idioma se guarda en localStorage ("idioma"). Sin preferencia guardada: el de la página (/paginas/en/ = inglés) o el del navegador (en ese caso se guarda en la primera visita).

const IDIOMAS = ["es", "en"];
const LOCALES = { es: "es", en: "en-US" };

function esPaginaIngles() {
  return /\/paginas\/en\/[^/]*$/.test(location.pathname);
}
function esPaginaInterna() {
  return /\/paginas\/(en\/)?[^/]*$/.test(location.pathname);
}

let idiomaActivo = (() => {
  let guardado = null;
  try { guardado = localStorage.getItem("idioma"); } catch (e) { guardado = null; }
  if (IDIOMAS.includes(guardado)) return guardado;
  if (esPaginaIngles()) return "en";
  if (esPaginaInterna()) return "es";
  const detectado = /^es/i.test(navigator.language || "es") ? "es" : "en";
  try { localStorage.setItem("idioma", detectado); } catch (e) { /* sin almacenamiento: se detecta en cada carga */ }
  return detectado;
})();

function idiomaActual() {
  return idiomaActivo;
}

function localeActual() {
  return LOCALES[idiomaActivo];
}

function textoDe(tablas, clave, ...args) {
  const t = tablas[idiomaActivo] || tablas.es;
  const v = t[clave] ?? tablas.es[clave];
  return typeof v === "function" ? v(...args) : v;
}

// tx("texto en español") o tx`texto ${x}`: devuelve la traducción si el idioma es inglés (TEXTOS_JS_EN, en traducciones-js-en.js); si no, el mismo texto.
// En plantillas la clave lleva {0}, {1}… en lugar de cada valor. (Se llama tx y no t porque muchos módulos usan una variable t.)
function tx(texto, ...valores) {
  const esPlantilla = Array.isArray(texto);
  const clave = esPlantilla ? texto.reduce((a, p, i) => a + p + (i < valores.length ? `{${i}}` : ""), "") : texto;
  if (idiomaActivo === "en" && typeof TEXTOS_JS_EN !== "undefined") {
    const v = TEXTOS_JS_EN[clave];
    if (v !== undefined) return esPlantilla ? v.replace(/\{(\d+)\}/g, (_, n) => valores[n]) : v;
  }
  return esPlantilla ? texto.reduce((a, p, i) => a + p + (i < valores.length ? valores[i] : ""), "") : texto;
}

function rutaPagina(relativa) {
  return idiomaActivo === "en" ? relativa.replace(/^paginas\//, "paginas/en/") : relativa;
}

function urlPaginaEquivalente(idioma) {
  if (!esPaginaInterna()) return null;
  const aEn = idioma === "en";
  const ruta = esPaginaIngles()
    ? (aEn ? location.pathname : location.pathname.replace("/paginas/en/", "/paginas/"))
    : (aEn ? location.pathname.replace(/\/paginas\/([^/]*)$/, "/paginas/en/$1") : location.pathname);
  return ruta + location.search + location.hash;
}

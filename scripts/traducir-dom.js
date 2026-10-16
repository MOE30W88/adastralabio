// scripts/traducir-dom.js
// Traduce el texto ESTÁTICO de index.html (lo que escribe el HTML; los textos que generan los scripts se traducen en cada módulo).
// Al cargar guarda una "foto" del HTML original en español (se carga antes que cualquier otro script, así que aún está intacto) y,
// al cambiar de idioma, sustituye cada texto/atributo por su traducción de TEXTOS_HTML_EN (scripts/traducciones-html.js)
// o lo devuelve al español. Si un script reescribe un nodo después, el nodo se respeta y se deja en paz.
// Unidades: texto de un nodo · innerHTML de un elemento con texto + etiquetas en línea (<a>, <strong>…) · atributos · enlaces a paginas/.
// Claves del diccionario = español con los espacios colapsados. Un elemento con data-no-traducir se ignora.
(() => {
  if (typeof TEXTOS_HTML_EN === "undefined") return;
  const ATRIBUTOS = ["title", "aria-label", "placeholder", "alt", "data-titulo", "data-descripcion"];
  const IGNORAR = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
  const EN_LINEA = new Set(["A", "B", "STRONG", "EM", "I", "CODE", "SPAN", "SMALL", "MARK", "SUB", "SUP", "BR", "ABBR", "KBD", "U"]);
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const tieneLetras = (s) => /[A-Za-zÀ-ÿ]/.test(s);
  const unidades = [];

  function recorrer(el) {
    if (IGNORAR.has(el.nodeName) || el.hasAttribute("data-no-traducir")) return;
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a);
      if (v && tieneLetras(v)) unidades.push({ tipo: "attr", el, attr: a, es: v, actual: v, clave: norm(v) });
    }
    if (el.nodeName === "A") {
      const h = el.getAttribute("href") || "";
      if (/^paginas\/[^/]+\.html/.test(h)) unidades.push({ tipo: "href", el, es: h, actual: h, clave: null });
    }
    const hijos = [...el.childNodes];
    const textoDirecto = hijos.some((n) => n.nodeType === 3 && tieneLetras(n.data));
    const hijosEl = hijos.filter((n) => n.nodeType === 1);
    if (textoDirecto && hijosEl.length && hijosEl.every((n) => EN_LINEA.has(n.nodeName)) && !el.querySelector("[id]")) { // con ids dentro no se reescribe el HTML: un script podría tener guardado ese nodo
      const h = el.innerHTML;
      unidades.push({ tipo: "html", el, es: h, actual: h, clave: norm(h) });
      return;
    }
    for (const n of hijos) {
      if (n.nodeType === 3) {
        if (tieneLetras(n.data)) unidades.push({ tipo: "texto", nodo: n, es: n.data, actual: n.data, clave: norm(n.data) });
      } else if (n.nodeType === 1) recorrer(n);
    }
  }
  recorrer(document.documentElement);
  window.unidadesTraducibles = unidades; // lo lee tools/extraer-textos.js para generar el diccionario

  function aplicar(idioma) {
    const en = idioma === "en";
    for (const u of unidades) {
      let nuevo;
      if (u.tipo === "href") nuevo = en ? u.es.replace(/^paginas\//, "paginas/en/") : u.es;
      else if (!en) nuevo = u.es;
      else {
        const t = TEXTOS_HTML_EN[u.clave];
        if (t === undefined) continue;
        nuevo = u.tipo === "texto" ? u.es.match(/^\s*/)[0] + t + u.es.match(/\s*$/)[0] : t;
      }
      if (u.tipo === "texto") {
        if (!u.nodo.isConnected || u.nodo.data !== u.actual) continue;
        u.nodo.data = nuevo;
      } else if (u.tipo === "html") {
        if (u.el.innerHTML !== u.actual) continue;
        u.el.innerHTML = nuevo;
        nuevo = u.el.innerHTML; // el navegador normaliza el HTML: se guarda lo que realmente quedó
      } else if (u.tipo === "href") {
        if (u.el.getAttribute("href") !== u.actual) continue;
        u.el.setAttribute("href", nuevo);
      } else {
        if (u.el.getAttribute(u.attr) !== u.actual) continue;
        u.el.setAttribute(u.attr, nuevo);
      }
      u.actual = nuevo;
    }
  }

  document.addEventListener("cambio-idioma", (e) => aplicar(e.detail.idioma));
  aplicar(idiomaActual());
})();

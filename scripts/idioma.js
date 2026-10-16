// scripts/idioma.js
// Botón ES / EN de la cabecera. El estado (idiomaActivo, idiomaActual…) vive en i18n.js.
// - En el reloj (index) el cambio guarda el idioma y recarga la página (los textos de los scripts se resuelven al cargar).
//   document.addEventListener("cambio-idioma", (e) => { /* e.detail.idioma === "es" | "en" */ });
// - En las páginas internas cada idioma es un archivo (paginas/ y paginas/en/): el botón lleva a la versión equivalente.

const NOMBRES_IDIOMA = {
  es: { es: "español", en: "Spanish" },
  en: { es: "inglés", en: "English" },
};

function guardarIdioma(valor) {
  try {
    localStorage.setItem("idioma", valor);
  } catch (e) {
    /* sin almacenamiento: el idioma solo dura la visita */
  }
}

function establecerIdioma(nuevo) {
  idiomaActivo = nuevo;
  document.documentElement.lang = nuevo;
  document.documentElement.dataset.idioma = nuevo;
  const boton = document.getElementById("boton-idioma");
  if (boton) {
    const otro = IDIOMAS.find((i) => i !== nuevo);
    boton.textContent = nuevo.toUpperCase();
    boton.title = `Cambiar a ${NOMBRES_IDIOMA[otro].es} / Switch to ${NOMBRES_IDIOMA[otro].en}`;
    boton.setAttribute("aria-label", boton.title);
  }
  guardarIdioma(nuevo);
  document.dispatchEvent(new CustomEvent("cambio-idioma", { detail: { idioma: nuevo } }));
}

function inicializarIdioma() {
  establecerIdioma(idiomaActivo);
  const boton = document.getElementById("boton-idioma");
  if (!boton) return;
  boton.addEventListener("click", () => {
    const nuevo = idiomaActivo === "es" ? "en" : "es";
    const destino = urlPaginaEquivalente(nuevo);
    if (destino) { guardarIdioma(nuevo); location.href = destino; return; }
    guardarIdioma(nuevo);
    location.reload(); // los módulos del reloj escriben sus textos al cargar: recargar es lo más fiable
  });
}

inicializarIdioma();

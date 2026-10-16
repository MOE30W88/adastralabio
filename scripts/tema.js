// scripts/tema.js
// Control de modo de color de la cabecera: Auto · Sol (día) · Luna (noche).
//   Auto  → sigue el Sol REAL del lugar del dispositivo, nunca el tiempo simulado: así, aunque aceleres el
//           reloj a x1M, el tema no parpadea. Ignora la ubicación manual del cajón "Viajar".
//   Sol / Luna → fuerzan ese modo y recuerdan la elección.
// Los colores de cada modo viven en css/tema.css.

const PREFERENCIA_POR_DEFECTO = "auto";
const UMBRAL_DIA = 0;        // altura del Sol (°) por encima de la cual Auto pasa a modo día (amanecer)
const UMBRAL_NOCHE = -6;     // altura del Sol (°) por debajo de la cual Auto pasa a modo noche (fin del crepúsculo civil)
const REVISION_AUTO_MS = 15000;
const PREFERENCIAS = ["auto", "dia", "noche"];
const TEXTOS_TEMA = {
  auto: tx("Automático (según el Sol de tu lugar)"),
  dia: tx("Modo día"),
  noche: tx("Modo noche"),
};

let preferencia = PREFERENCIA_POR_DEFECTO;
let ubicacionReal = null; // última ubicación del dispositivo (la manual de "Viajar" no cuenta)

function altitudSolarReal() {
  if (ubicacion.latitud !== null && !ubicacion.esManual) {
    ubicacionReal = { latitud: ubicacion.latitud, longitud: ubicacion.longitud };
  }
  if (!ubicacionReal) return null;
  return posicionSolarHorizonte(new Date(), ubicacionReal.latitud, ubicacionReal.longitud).altura;
}

// Modo que corresponde ahora a Auto. Entre los dos umbrales mantiene el modo actual (histéresis).
function temaAutomatico(actual) {
  const altura = altitudSolarReal();
  if (altura === null) {
    const hora = new Date().getHours(); // aún sin ubicación: hora del dispositivo
    return hora >= 6 && hora < 18 ? "dia" : "noche";
  }
  if (altura > UMBRAL_DIA) return "dia";
  if (altura < UMBRAL_NOCHE) return "noche";
  return actual || (altura > (UMBRAL_DIA + UMBRAL_NOCHE) / 2 ? "dia" : "noche");
}

function aplicarTema(tema, animar = false) {
  const raiz = document.documentElement;
  if (raiz.dataset.tema === tema) return;
  const cambiar = () => {
    raiz.dataset.tema = tema;
  };
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (animar && document.startViewTransition && !reducirMovimiento) {
    document.startViewTransition(cambiar); // fundido suave (ver ::view-transition en css/estructura.css)
  } else {
    cambiar();
  }
}

function pintarControlTema() {
  document.querySelectorAll("[data-tema-pref]").forEach((boton) => {
    const activo = boton.dataset.temaPref === preferencia;
    boton.classList.toggle("activa", activo);
    boton.setAttribute("aria-pressed", String(activo));
    const texto = TEXTOS_TEMA[boton.dataset.temaPref];
    boton.title = texto;
    boton.setAttribute("aria-label", texto);
  });
}

function establecerPreferencia(nueva, animar = true) {
  preferencia = nueva;
  try {
    localStorage.setItem("tema-preferencia", nueva);
  } catch (e) {
    /* sin almacenamiento: la elección solo dura la visita */
  }
  aplicarTema(nueva === "auto" ? temaAutomatico(document.documentElement.dataset.tema) : nueva, animar);
  pintarControlTema();
}

function revisarTemaAutomatico() {
  if (preferencia !== "auto") return;
  aplicarTema(temaAutomatico(document.documentElement.dataset.tema), true);
}

function inicializarTema() {
  let guardada = null;
  try {
    guardada = localStorage.getItem("tema-preferencia");
  } catch (e) {
    guardada = null;
  }
  preferencia = PREFERENCIAS.includes(guardada) ? guardada : PREFERENCIA_POR_DEFECTO;
  establecerPreferencia(preferencia, false);
  document.querySelectorAll("[data-tema-pref]").forEach((boton) => {
    boton.addEventListener("click", () => establecerPreferencia(boton.dataset.temaPref));
  });
  // La ubicación llega unos segundos después de cargar: se vigila cada segundo hasta tenerla y luego cada 15 s
  const esperaUbicacion = setInterval(() => {
    if (ubicacion.latitud === null) return;
    clearInterval(esperaUbicacion);
    revisarTemaAutomatico();
  }, 1000);
  setInterval(revisarTemaAutomatico, REVISION_AUTO_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) revisarTemaAutomatico();
  });
}

inicializarTema();
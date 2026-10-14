// Espacio de información auxiliar asociado a la capa activa.
const NOMBRES_CAPAS_PANEL = {
  todas: "Astrolabio",
  reloj: "Reloj",
  "dia-noche": "Día y noche",
  lunario: "Lunario",
  zodiaco: "Zodíaco",
  calendario: "Calendario",
  rotacion: "Rotación",
  "sistema-solar": "Sistema solar",
};
// Ancla de cada capa en paginas/infografias.html (el botón "+" lleva a la infografía de la capa activa; el Astrolabio, a la página completa)
const ANCLAS_INFOGRAFIA = { reloj: "grupo-reloj", "dia-noche": "grupo-dia-y-noche", lunario: "grupo-lunario", zodiaco: "grupo-zodiaco", calendario: "grupo-calendario", "sistema-solar": "grupo-sistema-solar", rotacion: "grupo-rotacion" };
const CONTENIDOS_PANEL_CAPA = { todas: "astrolabio", reloj: "reloj", "dia-noche": "dia-noche", lunario: "lunario", zodiaco: "zodiaco", calendario: "calendario", rotacion: "rotacion" };
let enfoquePanelActivo = "todas";
let ultimoRefrescoPanelDinamico = 0;
let proximoCambioZodiaco = null;

function actualizarPanelPorEnfoque(clave) {
  const contenidoSolar = document.getElementById("contenido-panel-sistema-solar");
  const contenidoCapa = document.getElementById("contenido-panel-capa");
  if (!contenidoSolar || !contenidoCapa) return;

  enfoquePanelActivo = clave;
  const masInfo = document.getElementById("boton-masinfo");
  if (masInfo) {
    masInfo.href = "paginas/infografias.html" + (ANCLAS_INFOGRAFIA[clave] ? `#${ANCLAS_INFOGRAFIA[clave]}` : "");
    const titulo = ANCLAS_INFOGRAFIA[clave] ? `Infografía: ${NOMBRES_CAPAS_PANEL[clave]}` : "Infografía";
    masInfo.title = titulo;
    masInfo.setAttribute("aria-label", `Ir a ${titulo}`);
  }
  const esSistemaSolar = clave === "sistema-solar";
  contenidoSolar.hidden = !esSistemaSolar;
  contenidoCapa.hidden = esSistemaSolar;
  for (const [enfoque, id] of Object.entries(CONTENIDOS_PANEL_CAPA)) {
    const contenido = document.getElementById(`contenido-panel-${id}`);
    if (contenido) contenido.hidden = enfoque !== clave;
  }
  if (esSistemaSolar) return;

  document.getElementById("titulo-panel-capa").textContent = NOMBRES_CAPAS_PANEL[clave] ?? "Astrolabio";
  // Aquí se conectarán los cálculos y la presentación de cada capa.
  document.getElementById("datos-panel-capa").replaceChildren();
}

function actualizarPanelDatosDinamicos(ahora) {
  const panel = document.getElementById("cajon-planetas");
  if (!(["reloj", "dia-noche", "zodiaco", "lunario", "calendario", "rotacion"].includes(enfoquePanelActivo)) || !panel?.classList.contains("abierto")) return;
  const t = performance.now();
  if (t - ultimoRefrescoPanelDinamico < 500) return;
  ultimoRefrescoPanelDinamico = t;

  if (LECTORES_PANEL[enfoquePanelActivo]) { LECTORES_PANEL[enfoquePanelActivo](ahora); return; }

  if (enfoquePanelActivo === "zodiaco") {
    const solar = posicionSolar(ahora);
    const sector = normalizarGrados(-anguloZodiaco(ahora));
    const indice = Math.floor(sector / 30);
    const signo = SIGNOS[indice];
    const avance = sector % 30;
    const constelacion = CONSTELACIONES.find((item) => item.nombre === signo.nombre);
    const archivo = ARCHIVO_SIGNO[constelacion?.clave] ?? constelacion?.clave ?? signo.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const icono = document.getElementById("figura-signo-zodiaco");
    if (icono.dataset.signo !== signo.nombre) {
      icono.style.setProperty("--figura-signo", `url("${new URL(RUTAS_ZODIACO.figura(archivo), document.baseURI).href}")`);
      icono.dataset.signo = signo.nombre;
    }
    document.getElementById("simbolo-signo-zodiaco").textContent = signo.simbolo;
    document.getElementById("nombre-signo-zodiaco").textContent = signo.nombre;
    document.getElementById("dato-longitud-zodiaco").textContent = `${solar.longitudEcliptica.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}°`;
    document.getElementById("dato-avance-zodiaco").textContent = `${avance.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}° de 30° · ${(avance / 30 * 100).toLocaleString("es", { maximumFractionDigits: 1 })}%`;
    document.getElementById("dato-declinacion-zodiaco").textContent = `${solar.declinacion < 0 ? "−" : "+"}${Math.abs(solar.declinacion).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}°`;

    const anio = ahora.getUTCFullYear();
    if (!proximoCambioZodiaco || proximoCambioZodiaco.indice !== indice || proximoCambioZodiaco.anio !== anio) {
      const frontera = normalizarGrados(300 - (indice - 1) * 30);
      const distancia = normalizarGrados(frontera - solar.longitudEcliptica);
      const aproximacion = ahora.getTime() + (distancia / 0.9856474) * 86400000;
      proximoCambioZodiaco = { indice, anio, instante: instanteLongitudSolar(frontera, aproximacion) };
    }
    const pared = aHoraDePared(new Date(proximoCambioZodiaco.instante));
    document.getElementById("dato-cambio-zodiaco").textContent = `${pared.getUTCDate()} ${MESES[pared.getUTCMonth()]} · ${dosDigitos(pared.getUTCHours())}:${dosDigitos(pared.getUTCMinutes())}`;
    return;
  }

  if (enfoquePanelActivo === "dia-noche") {
    const valor = (k) => refsPanel[k]?.valor.textContent || "—";
    document.getElementById("dato-alba-astronomica").textContent = valor("albaAstro");
    document.getElementById("dato-alba-nautica").textContent = valor("albaNautico");
    document.getElementById("dato-alba-civil").textContent = valor("albaCivil");
    document.getElementById("dato-alba-dia-noche").textContent = valor("salida");
    document.getElementById("dato-maximo-dia-noche").textContent = valor("mediodia");
    document.getElementById("dato-ocaso-dia-noche").textContent = valor("puesta");
    document.getElementById("dato-ocaso-civil").textContent = valor("ocasoCivil");
    document.getElementById("dato-ocaso-nautico").textContent = valor("ocasoNautico");
    document.getElementById("dato-ocaso-astronomico").textContent = valor("ocasoAstro");

    const hayUbicacion = typeof ubicacion.latitud === "number" && typeof ubicacion.longitud === "number";
    const visible = (esVisible) => hayUbicacion ? (esVisible ? "Sobre el horizonte · visible" : "Bajo el horizonte · no visible") : "Ubicación necesaria";
    document.getElementById("dato-visibilidad-sol").textContent = visible(
      hayUbicacion && posicionSolarHorizonte(ahora, ubicacion.latitud, ubicacion.longitud).altura >= 0,
    );
    document.getElementById("dato-visibilidad-luna").textContent = visible(
      hayUbicacion && posicionLunarHorizonte(ahora, ubicacion.latitud, ubicacion.longitud).altura >= 0,
    );
    return;
  }

  const ecuacion = ecuacionDelTiempoMin(ahora);
  const declinacion = posicionSolar(ahora).declinacion;
  document.getElementById("dato-hora-24").textContent = textoDeLaHora(ahora);
  document.getElementById("dato-hora-solar").textContent = textoHoraDecimal(horaSolarVerdadera(ahora));
  document.getElementById("dato-hora-civil").textContent = textoDeLaHora(ahora);
  document.getElementById("dato-ecuacion-tiempo").textContent = `${ecuacion < 0 ? "−" : "+"}${Math.abs(ecuacion).toLocaleString("es", { maximumFractionDigits: 1 })} min`;
  document.getElementById("dato-declinacion-solar").textContent = `${declinacion < 0 ? "−" : "+"}${Math.abs(declinacion).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}°`;
}

actualizarPanelPorEnfoque(document.querySelector(".nav-capas button.activa")?.dataset.enfoque ?? "todas");
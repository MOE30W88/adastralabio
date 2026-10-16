const agujaHora = document.getElementById("aguja-hora");
const agujaMinuto = document.getElementById("aguja-minuto");
const agujaSegundo = document.getElementById("aguja-segundo");
const texto = document.getElementById("hora-digital");
const sol = document.getElementById("sol");
const luna = document.getElementById("luna");
const capaZodiaco = document.getElementById("capa-zodiaco");
const capaCalendario = document.getElementById("capa-calendario");
const fechaDigital = document.getElementById("fecha-digital");
 
const RADIO_ORBITA_SOL = 540;
const RADIO_ORBITA_LUNA = 540;
const etiquetaHuso = document.getElementById("etiqueta-huso");
 
let marcadorHora = null;
let marcadorMinuto = null;
let marcadorSegundo = null;
 
let anioCalendarioDibujado = null;
 
// Capas de movimiento lento: a velocidad normal cambian de forma invisible entre un fotograma y el siguiente, y reescribir sus ~1500
// elementos SVG 60 veces por segundo obliga al navegador a repintar casi todo el reloj. Se recalculan cada INTERVALO_CAPAS_LENTAS_MS;
// si el tiempo corre rápido (más de x60, en cualquier sentido) se calculan en cada fotograma para que el movimiento se vea fluido.
const INTERVALO_CAPAS_LENTAS_MS = 250;
const VELOCIDAD_CAPAS_FLUIDAS = 60;
const ultimoCalculoLento = {};
function capaLenta(clave, calcular) {
  const rapido = estadoTiempo.modoViajero && Math.abs(estadoTiempo.multiplicador) > VELOCIDAD_CAPAS_FLUIDAS;
  const t = performance.now();
  if (!rapido && t - (ultimoCalculoLento[clave] ?? -Infinity) < INTERVALO_CAPAS_LENTAS_MS) return;
  ultimoCalculoLento[clave] = t;
  calcular();
}
function actualizar() {
  const ahora = obtenerFechaActual();
  actualizarEventosSolaresSiCambio(ahora);
  if (typeof actualizarEventosSegunReloj === "function") actualizarEventosSegunReloj(ahora);
  actualizarPanelResultados(ahora);
  actualizarPanelPlanetas(ahora);
 
  const textoHuso = textoHusoHorario(obtenerHusoHorario(ahora));
  if (etiquetaHuso.textContent !== textoHuso) {
    etiquetaHuso.textContent = textoHuso;
  }
 
  const anguloH = anguloDeLaHora(ahora);
  const anguloM = anguloDelMinuto(ahora);
  const anguloS = anguloDelSegundo(ahora);
 
  agujaHora.setAttribute("transform", `rotate(${anguloH} 600 600)`);
  agujaMinuto.setAttribute("transform", `rotate(${anguloM} 600 600)`);
  agujaSegundo.setAttribute("transform", `rotate(${anguloS} 600 600)`);
 
  if (marcadorHora)
    marcadorHora.setAttribute("transform", `rotate(${anguloH} 600 600)`);
  if (marcadorMinuto)
    marcadorMinuto.setAttribute("transform", `rotate(${anguloM} 600 600)`);
  if (marcadorSegundo)
    marcadorSegundo.setAttribute("transform", `rotate(${anguloS} 600 600)`);
  const anguloZod = anguloZodiaco(ahora);
  capaZodiaco.setAttribute("transform", `rotate(${anguloZod} 600 600)`);
  capaLenta("traslacion", () => actualizarTraslacion(ahora));
  capaLenta("asteroides", () => actualizarAsteroides(ahora));
  capaLenta("alineacion", () => actualizarAlineacion(ahora));
  if (typeof actualizarCometas === "function") capaLenta("cometas", () => actualizarCometas(ahora));
  if (typeof actualizarLluviasOrbita === "function") capaLenta("lluvias", () => actualizarLluviasOrbita(ahora));
  capaLenta("etiquetasZodiaco", () => actualizarEtiquetasZodiaco(anguloZod));
  actualizarIndicadorZodiaco(anguloZod);
  actualizarEventoEstacional(ahora, anguloZod);
 
  const anioActual = aHoraDePared(ahora).getUTCFullYear();
  if (anioActual !== anioCalendarioDibujado) {
    dibujarCalendario(anioActual);
    anioCalendarioDibujado = anioActual;
  }
  const anguloCal = anguloCalendario(ahora);
  capaCalendario.setAttribute("transform", `rotate(${anguloCal} 600 600)`);
  capaLenta("estaciones", () => actualizarAnilloEstaciones(ahora, anguloCal));
  actualizarConstelaciones(ahora, anguloCal);
  capaLenta("calendarioChino", () => actualizarCalendarioChino(ahora));
  capaLenta("rotacion", () => actualizarRotacion(ahora));
  actualizarAnalema(ahora);
  actualizarPanelDatosDinamicos(ahora);
  actualizarHorizonte();
  actualizarMarcasEventos(ahora);
  capaLenta("etiquetasCalendario", () => actualizarEtiquetasCalendario(anguloCal));
 
  let alturaSolar = null;
  if (ubicacion.latitud !== null) {
    alturaSolar = posicionSolarHorizonte(
      ahora,
      ubicacion.latitud,
      ubicacion.longitud,
    ).altura;
  }
  actualizarEclipse(ahora, alturaSolar);
  actualizarVinetaEventoLunar(ahora);
  actualizarVinetaMapaEclipse(ahora);
  actualizarLunario(ahora);
  actualizarSol(ahora, alturaSolar);
  actualizarLuna(ahora, alturaSolar);
  actualizarPlanetasHorizonte(ahora);
 
  const horaActual = textoDeLaHora(ahora);
  if (texto.textContent !== horaActual) {
    texto.textContent = horaActual;
  }
 
  const pared = aHoraDePared(ahora);
  const fechaFormateada = `${dosDigitos(pared.getUTCDate())}/${dosDigitos(pared.getUTCMonth() + 1)}/${pared.getUTCFullYear()}`;
  if (fechaDigital.textContent !== fechaFormateada) {
    fechaDigital.textContent = fechaFormateada;
  }
 
  requestAnimationFrame(actualizar);
}
 
function actualizarSol(fecha, alturaSolar) {
  if (ubicacion.latitud === null) return;
  const angulo = anguloDeLaHora(fecha);
  const p = polar(RADIO_ORBITA_SOL, angulo);
  const intensidad = intensidadSolar(alturaSolar);
 
  sol.setAttribute("cx", p.x);
  sol.setAttribute("cy", p.y);
  sol.style.opacity = intensidad;
  sol.style.filter =
    intensidad > 0
      ? `drop-shadow(0 0 ${4 + intensidad * 14}px #f5c344)`
      : "none";
  agujaHora.classList.toggle("aguja-noche", alturaSolar <= 0);
}
 
const marcadoresReloj = dibujarMarcadoresReloj();
if (marcadoresReloj) {
  marcadorHora = marcadoresReloj.marcadorHora;
  marcadorMinuto = marcadoresReloj.marcadorMinuto;
  marcadorSegundo = marcadoresReloj.marcadorSegundo;
}
 
actualizar();
dibujarMarco();
inicializarViajero();
dibujarOrbitaTerrestre();
dibujarZodiaco();
dibujarReferenciasEstacionales();
dibujarMarcadorCalendario();
 
const textoUbicacion = document.getElementById("ubicacion");
const textoPaisCiudad = document.getElementById("pais-ciudad");
 
function mostrarUbicacion(u) {
  const latStr = tx`Lat: ${u.latitud.toFixed(4)}°`;
  const lonStr = tx`Lon: ${u.longitud.toFixed(4)}°`;
  textoUbicacion.textContent = `${latStr}\n${lonStr}`;
 
  if (u.ciudad || u.pais) {
    const partes = [u.ciudad, u.pais].filter(Boolean);
    textoPaisCiudad.textContent = partes.join(", ");
  } else {
    textoPaisCiudad.textContent = "";
  }
  dibujarTropicos();
}
 
function mostrarErrorUbicacion(mensaje) {
  textoUbicacion.textContent = mensaje;
  textoPaisCiudad.textContent = "";
}
 
pedirUbicacion(mostrarUbicacion, mostrarErrorUbicacion);
 
function actualizarLuna(fecha, alturaSolar) {
  if (ubicacion.latitud === null) return;
  const { altura } = posicionLunarHorizonte(
    fecha,
    ubicacion.latitud,
    ubicacion.longitud,
  );
  const angulo = anguloDeLaLuna(fecha) + 180;
  const p = polar(RADIO_ORBITA_LUNA, angulo);
 
  const intensidad = intensidadLunar(altura, alturaSolar, 1);
  const grupo = document.getElementById("capa-fase-lunar");
  grupo.setAttribute("transform", `translate(${p.x} ${p.y})`);
  grupo.style.opacity = intensidad;
  grupo.style.filter =
    intensidad > 0
      ? `drop-shadow(0 0 ${2 + intensidad * 10}px #cfd8e3)`
      : "none";
 
  actualizarFaseLunar(fecha);
}


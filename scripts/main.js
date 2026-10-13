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
const OPACIDAD_BAJO_HORIZONTE = 0.3; // Sol y Luna bajo el horizonte siguen visibles (atenuados) en la mitad nocturna del dial
const etiquetaHuso = document.getElementById("etiqueta-huso");
 
let marcadorHora = null;
let marcadorMinuto = null;
let marcadorSegundo = null;
 
let anioCalendarioDibujado = null;
 
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
  actualizarTraslacion(ahora);
  actualizarAsteroides(ahora);
  actualizarAlineacion(ahora);
  if (typeof actualizarCometas === "function") actualizarCometas(ahora);
  if (typeof actualizarLluviasOrbita === "function") actualizarLluviasOrbita(ahora);
  actualizarEtiquetasZodiaco(anguloZod);
  actualizarIndicadorZodiaco(anguloZod);
  actualizarEventoEstacional(ahora, anguloZod);
 
  const anioActual = aHoraDePared(ahora).getUTCFullYear();
  if (anioActual !== anioCalendarioDibujado) {
    dibujarCalendario(anioActual);
    anioCalendarioDibujado = anioActual;
  }
  const anguloCal = anguloCalendario(ahora);
  capaCalendario.setAttribute("transform", `rotate(${anguloCal} 600 600)`);
  actualizarAnilloEstaciones(ahora, anguloCal);
  actualizarConstelaciones(ahora, anguloCal);
  actualizarCalendarioChino(ahora);
  actualizarRotacion(ahora);
  actualizarAnalema(ahora);
  actualizarPanelDatosDinamicos(ahora);
  actualizarHorizonte();
  actualizarMarcasEventos(ahora);
  actualizarEtiquetasCalendario(anguloCal);
 
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
  sol.style.opacity = Math.max(intensidad, OPACIDAD_BAJO_HORIZONTE);
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
  const latStr = `Lat: ${u.latitud.toFixed(4)}°`;
  const lonStr = `Lon: ${u.longitud.toFixed(4)}°`;
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
  const angulo = anguloDeLaLuna(fecha);
  const p = polar(RADIO_ORBITA_LUNA, angulo);
 
  const intensidad = intensidadLunar(altura, alturaSolar, 1);
  const grupo = document.getElementById("capa-fase-lunar");
  grupo.setAttribute("transform", `translate(${p.x} ${p.y})`);
  grupo.style.opacity = Math.max(intensidad, OPACIDAD_BAJO_HORIZONTE);
  grupo.style.filter =
    intensidad > 0
      ? `drop-shadow(0 0 ${2 + intensidad * 10}px #cfd8e3)`
      : "none";
 
  actualizarFaseLunar(fecha);
}


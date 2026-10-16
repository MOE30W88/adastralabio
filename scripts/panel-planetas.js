// scripts/panel-planetas.js
// Cajón derecho "Sistema solar": tabla con posiciones planetarias y alineación actual.
// Se construye al cargar y se actualiza ~2 veces por segundo mientras está abierto.
 
const filasPlanetas = {}; // nombre -> { distancia, longitud }
let ultimoRefrescoPlanetas = 0;
 
function textoPeriodo(anios) {
  if (anios < 1) return `${Math.round(anios * 365.25)} d`;
  return `${anios.toFixed(anios < 10 ? 2 : 1).replace(".", ",")} a`;
}
 
function construirTablaPlanetas() {
  const cuerpo = document.getElementById("tabla-planetas-cuerpo");
  if (!cuerpo) return;
  PLANETAS.forEach((p) => {
    const fila = document.createElement("tr");
    fila.innerHTML =
      `<td><span class="punto-planeta" style="background:${p.color}"></span>${tx(p.nombre)}</td>` +
      `<td class="num"></td><td class="num"></td><td class="num">${textoPeriodo(p.periodo)}</td>`;
    cuerpo.appendChild(fila);
    const celdas = fila.querySelectorAll("td");
    filasPlanetas[p.nombre] = { distancia: celdas[1], longitud: celdas[2] };
  });
}
 
function actualizarPanelPlanetas(ahora) {
  const cajon = document.getElementById("cajon-planetas");
  if (!cajon || !cajon.classList.contains("abierto")) return;
  const t = performance.now();
  if (t - ultimoRefrescoPlanetas < 500) return;
  ultimoRefrescoPlanetas = t;
 
  PLANETAS.forEach((p) => {
    const pos = posicionHeliocentrica(p, ahora);
    const fila = filasPlanetas[p.nombre];
    fila.distancia.textContent = pos.distancia.toFixed(3).replace(".", ",");
    fila.longitud.textContent = `${pos.longitud.toFixed(1).replace(".", ",")}°`;
  });

  const evaluaciones = evaluarAlineaciones(ahora);
  const alineados = evaluaciones.filter((p) => p.alineado);
  const formatoDesvio = (p) =>
    `${tx(p.nombre)} (${p.desviacionGrados.toFixed(2).replace(".", ",")}°; ${p.distanciaEjeUA.toFixed(3).replace(".", ",")} UA)`;
  document.getElementById("planetas-alineados").textContent = alineados.length
    ? alineados.map(formatoDesvio).join(" · ")
    : tx`Ninguno; menor desviación: ${formatoDesvio(evaluaciones[0])}`;
}
 
construirTablaPlanetas();

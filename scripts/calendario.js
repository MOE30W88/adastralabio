// scripts/calendario.js

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const CALENDARIO = {
  anillo: 780,        // aro exterior: las marcas salen hacia afuera
  largoDia: 10,
  largoQuinto: 14,
  largoMes: 20,
  radioEtiqueta: 760,
  radioDigitos: 830,
  pasoDigitos: 5,
};

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

function diasEnAnio(anio) {
  return esBisiesto(anio) ? 366 : 365;
}

const DIAS_POR_MES = [31,28,31,30,31,30,31,31,30,31,30,31];

function diasEnMes(anio, mesIndex) {
  if (mesIndex === 1) return esBisiesto(anio) ? 29 : 28;
  return DIAS_POR_MES[mesIndex];
}

function diaDelAnio(fecha) {
  const inicioAnio = new Date(fecha.getFullYear(), 0, 1);
  return Math.floor((fecha - inicioAnio) / 86400000);
}

function anguloCalendario(fecha) {
  const p = aHoraDePared(fecha);
  const N = diasEnAnio(p.getUTCFullYear());
  return normalizarGrados(-(diaDelAnioFraccional(p) / N) * 360);
}

function anguloDeInicioDeMes(anio, mesIndex) {
  let dias = 0;
  for (let m = 0; m < mesIndex; m++) dias += diasEnMes(anio, m);
  return (dias / diasEnAnio(anio)) * 360;
}

function crearMarcaCalendario(grados, radioInterno, radioExterno, clase) {
  const a = polar(radioInterno, grados);
  const b = polar(radioExterno, grados);
  const linea = document.createElementNS(SVG_NS, "line");
  linea.setAttribute("x1", a.x);
  linea.setAttribute("y1", a.y);
  linea.setAttribute("x2", b.x);
  linea.setAttribute("y2", b.y);
  linea.setAttribute("class", clase);
  return linea;
}

const etiquetasCalendario = [];

function crearEtiquetaMesCurva(texto, anguloMedio, radio) {
  const grupo = document.createElementNS(SVG_NS, "g");
  
  // Usamos siempre el mismo sentido para que mantengan la orientación uniforme
  const anguloInicio = anguloMedio - 15;
  const anguloFin = anguloMedio + 15;

  const p1 = polar(radio, anguloInicio);
  const p2 = polar(radio, anguloFin);
  const sweep = 1; // Fijo para mantener la misma dirección en todo el círculo

  const pathId = "path-mes-" + Math.random().toString(36).slice(2, 11);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("id", pathId);
  path.setAttribute("d", `M ${p1.x} ${p1.y} A ${radio} ${radio} 0 0 ${sweep} ${p2.x} ${p2.y}`);
  path.setAttribute("fill", "none");
  grupo.appendChild(path);

  const textoEl = document.createElementNS(SVG_NS, "text");
  textoEl.setAttribute("class", "etiqueta-mes");
  
  const textPath = document.createElementNS(SVG_NS, "textPath");
  textPath.setAttribute("href", "#" + pathId);
  textPath.setAttribute("startOffset", "50%");
  textPath.setAttribute("text-anchor", "middle");
  textPath.textContent = texto;

  textoEl.appendChild(textPath);
  grupo.appendChild(textoEl);

  etiquetasCalendario.push({ elemento: grupo, path: path, radio: radio, medio: anguloMedio });

  return grupo;
}

function crearDigitoCalendario(dia, grados) {
  const p = polar(CALENDARIO.radioDigitos, grados);
  const texto = document.createElementNS(SVG_NS, "text");
  texto.setAttribute("x", p.x);
  texto.setAttribute("y", p.y);
  texto.setAttribute("transform", `rotate(${grados} ${p.x} ${p.y})`);
  texto.setAttribute("class", "digito-calendario");
  texto.textContent = dia;
  return texto;
}

function dibujarCalendario(anio) {
  etiquetasCalendario.length = 0;
  const capa = document.getElementById("capa-calendario");
  capa.innerHTML = "";

  const anioObjetivo = anio || aHoraDePared(obtenerFechaActual()).getUTCFullYear();

  for (let mes = 0; mes < 12; mes++) {
    const anguloInicio = anguloDeInicioDeMes(anioObjetivo, mes);
    const dias = diasEnMes(anioObjetivo, mes);
    const anchoMes = (dias / diasEnAnio(anioObjetivo)) * 360;

    capa.appendChild(crearMarcaCalendario(anguloInicio, CALENDARIO.anillo, CALENDARIO.anillo + CALENDARIO.largoMes, "marca-calendario marca-mes"));

    const anguloMedio = anguloInicio + anchoMes / 2;
    capa.appendChild(crearEtiquetaMesCurva(tx(MESES[mes]), anguloMedio, CALENDARIO.radioEtiqueta));

    for (let dia = 1; dia <= dias; dia++) {
      const anguloDia = anguloInicio + ((dia - 1) / dias) * anchoMes;
      const esQuinto = dia % 5 === 0 || dia === 1;
      const largo = esQuinto ? CALENDARIO.largoQuinto : CALENDARIO.largoDia;
      capa.appendChild(crearMarcaCalendario(anguloDia, CALENDARIO.anillo, CALENDARIO.anillo + largo, esQuinto ? "marca-calendario marca-dia-quinto" : "marca-calendario marca-dia"));
      if (dia === 1 || dia % CALENDARIO.pasoDigitos === 0) {
        capa.appendChild(crearDigitoCalendario(dia, anguloDia + anchoMes / dias / 2));
      }
    }
  }
}

function dibujarMarcadorCalendario() {
  const capa = document.getElementById("capa-marcador-calendario");
  const radioPunta = CALENDARIO.anillo + CALENDARIO.largoMes + 4;
  const punta = polar(radioPunta, 0);
  const baseIzq = polar(radioPunta + 18, -0.8);
  const baseDer = polar(radioPunta + 18, 0.8);
  const marcador = document.createElementNS(SVG_NS, "polygon");
  marcador.setAttribute("points", `${punta.x},${punta.y} ${baseIzq.x},${baseIzq.y} ${baseDer.x},${baseDer.y}`);
  marcador.setAttribute("class", "marcador-calendario");
  capa.appendChild(marcador);
}

function actualizarEtiquetasCalendario(anguloRotacion) {
  etiquetasCalendario.forEach(({ path, radio, medio }) => {
    const anguloInicio = medio - 15;
    const anguloFin = medio + 15;

    const p1 = polar(radio, anguloInicio);
    const p2 = polar(radio, anguloFin);
    const sweep = 1;

    path.setAttribute("d", `M ${p1.x} ${p1.y} A ${radio} ${radio} 0 0 ${sweep} ${p2.x} ${p2.y}`);
  });
}
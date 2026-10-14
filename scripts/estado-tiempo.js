// scripts/estado-tiempo.js

const estadoTiempo = {
  modoViajero: false,
  fechaBase: null,       // fecha elegida por el usuario
  momentoFijado: null,   // Date.now() real en el instante que se fijó fechaBase
  multiplicador: 1,
};

// Rango donde los cálculos son fiables (ver Alcance): 1900–2150
const FECHA_MIN = Date.UTC(1900, 0, 1);
const FECHA_MAX = Date.UTC(2150, 11, 31, 23, 59);

function obtenerFechaActual() {
  if (!estadoTiempo.modoViajero) {
    return new Date();
  }
  const transcurridoReal = Date.now() - estadoTiempo.momentoFijado;
  const transcurridoSimulado = transcurridoReal * estadoTiempo.multiplicador;
  const t = estadoTiempo.fechaBase.getTime() + transcurridoSimulado;
  return new Date(Math.min(FECHA_MAX, Math.max(FECHA_MIN, t)));
}

function establecerFechaViajero(fecha) {
  estadoTiempo.modoViajero = true;
  estadoTiempo.fechaBase = fecha;
  estadoTiempo.momentoFijado = Date.now();
}

function establecerMultiplicador(valor) {
  // "congelamos" la fecha actual como nueva base antes de cambiar la velocidad,
  // para que el cambio no produzca un salto brusco
  estadoTiempo.fechaBase = obtenerFechaActual();
  estadoTiempo.momentoFijado = Date.now();
  estadoTiempo.multiplicador = valor;
  estadoTiempo.modoViajero = true;
}

function volverAAhora() {
  estadoTiempo.modoViajero = false;
  estadoTiempo.fechaBase = null;
  estadoTiempo.momentoFijado = null;
  estadoTiempo.multiplicador = 1;
}
// Alterna la proyección del sistema solar entre el plano orbital XY y la vista lateral XZ.
function actualizarControlVistaSolar(boton) {
  const siguiente = vistaSistemaSolar === "xy" ? "XZ" : "XY";
  boton.dataset.vista = vistaSistemaSolar;
  boton.setAttribute("aria-label", tx`Cambiar a vista ${siguiente}`);
  boton.setAttribute("aria-pressed", String(vistaSistemaSolar === "xz"));
  boton.title = tx`Vista ${vistaSistemaSolar.toUpperCase()} · cambiar a ${siguiente}`;
}

let transicionVistaSolarActiva = false;

async function cambiarVistaSistemaSolar() {
  if (transicionVistaSolarActiva) return;
  transicionVistaSolarActiva = true;

  const reloj = document.getElementById("reloj");
  const boton = document.getElementById("boton-vista-solar");
  const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  boton.disabled = true;

  if (!movimientoReducido) {
    reloj.classList.add("cambiando-vista-solar");
    await new Promise((resolver) => requestAnimationFrame(() => setTimeout(resolver, 220)));
  }

  try {
    vistaSistemaSolar = vistaSistemaSolar === "xy" ? "xz" : "xy";
    actualizarControlVistaSolar(boton);
    document.getElementById("capa-orbita-terrestre").innerHTML = "";
    document.getElementById("capa-orbitas-planetarias").innerHTML = "";
    document.getElementById("capa-planetas").innerHTML = "";
    document.getElementById("capa-planetas-frente").innerHTML = "";
    Object.keys(planetasEnDial).forEach((nombre) => delete planetasEnDial[nombre]);

    const fecha = obtenerFechaActual();
    dibujarOrbitaTerrestre();
    actualizarTraslacion(fecha);
    actualizarAsteroides(fecha);
    actualizarAlineacion(fecha);
  } finally {
    if (!movimientoReducido) {
      requestAnimationFrame(() => reloj.classList.remove("cambiando-vista-solar"));
      await new Promise((resolver) => setTimeout(resolver, 240));
    }
    boton.disabled = false;
    transicionVistaSolarActiva = false;
  }
}

const botonVistaSolar = document.getElementById("boton-vista-solar");
if (botonVistaSolar) {
  actualizarControlVistaSolar(botonVistaSolar);
  botonVistaSolar.addEventListener("click", cambiarVistaSistemaSolar);
}

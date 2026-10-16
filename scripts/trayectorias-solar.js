// scripts/trayectorias-solar.js
// Botón redondo (vista Sistema solar): muestra/oculta órbitas de cometas y marcas de lluvias. Por defecto, ocultas.
// API: establecerTrayectorias(bool), trayectoriasActivas(). La capa "ver en reloj" de evento-detalle.js las activa para cometas y lluvias.
const botonTrayectorias = document.getElementById("boton-trayectorias");

function trayectoriasActivas() {
  return document.getElementById("reloj").classList.contains("ver-trayectorias");
}

function establecerTrayectorias(activas) {
  document.getElementById("reloj").classList.toggle("ver-trayectorias", activas);
  if (!botonTrayectorias) return;
  botonTrayectorias.setAttribute("aria-pressed", String(activas));
  botonTrayectorias.title = activas ? tx("Ocultar órbitas de cometas y lluvias") : tx("Mostrar órbitas de cometas y lluvias");
  botonTrayectorias.setAttribute("aria-label", botonTrayectorias.title);
}

if (botonTrayectorias) {
  botonTrayectorias.addEventListener("click", () => establecerTrayectorias(!trayectoriasActivas()));
  establecerTrayectorias(false);
  // visible solo en el enfoque Sistema solar (sin tocar enfoque-capas.js)
  const reloj = document.getElementById("reloj");
  const sincronizar = () => { botonTrayectorias.hidden = !reloj.classList.contains("enfoque-sistema-solar"); };
  new MutationObserver(sincronizar).observe(reloj, { attributes: true, attributeFilter: ["class"] });
  sincronizar();
}
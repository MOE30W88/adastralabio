const PANELES_LATERALES = [
  ["boton-viajar", "cajon-viajero"],
  ["boton-geolocalizacion", "panel-geolocalizacion"],
  ["boton-planetas", "cajon-planetas"],
];

function cerrarPanelesLaterales(panelAConservar = null) {
  PANELES_LATERALES.forEach(([idBoton, idPanel]) => {
    if (idPanel === panelAConservar) return;
    const boton = document.getElementById(idBoton);
    const panel = document.getElementById(idPanel);
    if (!boton || !panel) return;
    panel.classList.remove("abierto");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;
    boton.setAttribute("aria-expanded", "false");
  });
  document.getElementById("contenedor-app")?.classList.remove("desplazado");
}

document.addEventListener("pointerdown", (evento) => {
  const destino = evento.target;
  const dentroDeUnPanel = PANELES_LATERALES.some(([, idPanel]) =>
    document.getElementById(idPanel)?.contains(destino),
  );
  const dentroDeUnBoton = PANELES_LATERALES.some(([idBoton]) =>
    document.getElementById(idBoton)?.contains(destino),
  );
  if (!dentroDeUnPanel && !dentroDeUnBoton) cerrarPanelesLaterales("cajon-planetas");
});

PANELES_LATERALES.forEach(([idBoton, idPanel]) => {
  const boton = document.getElementById(idBoton);
  const panel = document.getElementById(idPanel);
  if (!boton || !panel) return;

  boton.addEventListener("click", () => {
    const abrir = !panel.classList.contains("abierto");

    cerrarPanelesLaterales();
    if (!abrir) return;

    panel.classList.add("abierto");
    panel.setAttribute("aria-hidden", "false");
    panel.inert = false;
    boton.setAttribute("aria-expanded", "true");

    if (idPanel === "cajon-viajero") {
      document.getElementById("contenedor-app")?.classList.remove("desplazado", "mapa-abierto");
    }
    if (idPanel === "panel-geolocalizacion") document.getElementById("contenedor-app")?.classList.add("mapa-abierto");
    if (idPanel === "cajon-planetas") ultimoRefrescoPlanetas = 0;
  });
});

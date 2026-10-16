// scripts/infografias.js / eventos-carrusel.js
// Dibuja la sección de eventos del carrusel a partir de obtenerEventosProximos() (scripts/eventos-datos.js):
//   1 · carrusel de eventos (icono + título con enlace) que se mueve hacia la izquierda
//   2 · visor: imagen de fondo con opacidad, panel glass con la información y galería de tarjetas
//       (la seleccionada se expande; flechas y puntos dependen de las imágenes cargadas)
// Depende de: scripts/eventos-datos.js (cargar antes) / scripts/datos-infografias.js (antiguo)

function colocarIconoEvento(contenedor, ruta) {
  if (!ruta) return;
  const url = new URL(ruta, document.baseURI).href;
  const sonda = new Image(); // solo se pinta si el archivo existe; si no, queda el ✦
  sonda.onload = () => {
    contenedor.style.setProperty("--icono", `url("${url}")`);
    contenedor.classList.add("con-icono");
  };
  sonda.src = url;
}

function crearEventoTicker(evento, plantilla) {
  const nodo = plantilla.content.firstElementChild.cloneNode(true);
  const detalle = [evento.titulo, evento.fecha, evento.alcance].filter(Boolean).join(" · ");
  nodo.href = evento.destino || "#eventos-proximos";
  nodo.title = detalle;
  nodo.setAttribute("aria-label", detalle);
  nodo.querySelector(".evento-ticker-titulo").textContent = evento.titulo;
  colocarIconoEvento(nodo.querySelector(".evento-icono"), evento.icono);
  if (typeof decorarEventoTicker === "function") decorarEventoTicker(nodo, evento); // evento-detalle.js: cuenta regresiva y viñeta
  return nodo;
}

function renderizarEventosProximos(eventos) {
  const pista = document.getElementById("eventos-pista");
  const plantilla = document.getElementById("plantilla-evento");
  const controles = document.getElementById("eventos-controles");
  pista.replaceChildren();
  pista.classList.remove("hay-eventos");

  if (!eventos.length) {
    const estado = document.createElement("p");
    estado.className = "estado-eventos";
    estado.textContent = tx("Los próximos eventos aparecerán aquí cuando estén disponibles los cálculos.");
    pista.appendChild(estado);
    controles.hidden = true;
    return;
  }

  eventos.forEach((evento) => pista.appendChild(crearEventoTicker(evento, plantilla)));
  if (eventos.length > 1) { // copia del recorrido para que la cinta no tenga saltos
    const duplicado = document.createElement("div");
    duplicado.className = "eventos-pista-clon";
    duplicado.setAttribute("aria-hidden", "true");
    duplicado.inert = true;
    duplicado.style.display = "contents";
    eventos.forEach((evento) => duplicado.appendChild(crearEventoTicker(evento, plantilla)));
    pista.appendChild(duplicado);
    pista.style.animationDuration = `${Math.max(40, eventos.length * (typeof EVD_SEGUNDOS_POR_EVENTO === "number" ? EVD_SEGUNDOS_POR_EVENTO : 14))}s`; // más segundos por evento = más lento
    pista.classList.add("hay-eventos");
  }
  controles.hidden = eventos.length < 2;
}

function escribirTextoPanel(descripcion, detalle) {
  const caja = document.getElementById("infografia-texto");
  caja.replaceChildren();
  const parrafos = Array.isArray(descripcion) ? descripcion : descripcion ? [descripcion] : [];
  parrafos.forEach((texto) => {
    const p = document.createElement("p");
    p.textContent = texto;
    caja.appendChild(p);
  });
  if (detalle) {
    const p = document.createElement("p");
    p.className = "infografia-detalle";
    p.textContent = detalle;
    caja.appendChild(p);
  }
}

function renderizarGaleria(eventos) {
  if (!document.getElementById("galeria-pista")) return;
  const imagenes = eventos.flatMap((evento) => (evento.imagenes || []).map((imagen) => ({ ...imagen, evento: evento.titulo })));
  const pista = document.getElementById("galeria-pista");
  const puntos = document.getElementById("galeria-puntos");
  const fondo = document.getElementById("infografia-fondo");
  const vacia = document.getElementById("infografia-vacia");
  const datos = document.getElementById("infografia-datos");
  const galeria = document.querySelector(".infografia-galeria");
  const galeriaVacia = document.getElementById("galeria-vacia");
  const anterior = document.getElementById("galeria-anterior");
  const siguiente = document.getElementById("galeria-siguiente");
  const plantilla = document.getElementById("plantilla-imagen-infografia");
  let seleccion = 0;

  pista.replaceChildren();
  puntos.replaceChildren();
  const hayImagenes = imagenes.length > 0;
  fondo.hidden = true;
  vacia.hidden = hayImagenes;
  datos.hidden = !hayImagenes;
  galeria.hidden = !hayImagenes;
  galeriaVacia.hidden = hayImagenes;
  anterior.hidden = siguiente.hidden = imagenes.length < 2;
  if (!hayImagenes) return;

  function seleccionar(indice) {
    seleccion = (indice + imagenes.length) % imagenes.length;
    const imagen = imagenes[seleccion];
    fondo.onerror = () => { fondo.hidden = true; };
    fondo.src = imagen.ruta;
    fondo.hidden = false;
    document.getElementById("infografia-tema").textContent = imagen.tema || imagen.evento;
    document.getElementById("infografia-titulo").textContent = imagen.titulo || imagen.evento;
    escribirTextoPanel(imagen.descripcion, imagen.detalle);

    [...pista.children].forEach((item, i) => {
      item.classList.toggle("expandida", i === seleccion);
      item.querySelector(".galeria-tarjeta").setAttribute("aria-current", String(i === seleccion));
    });
    [...puntos.children].forEach((punto, i) => punto.setAttribute("aria-current", String(i === seleccion)));

    // Si hay más tarjetas de las que caben, centra la elegida dentro de la pista (sin mover la página)
    const item = pista.children[seleccion];
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => pista.scrollTo({
      left: item.offsetLeft - (pista.clientWidth - item.offsetWidth) / 2,
      behavior: reducido ? "auto" : "smooth",
    }), 560);
  }

  imagenes.forEach((imagen, indice) => {
    const item = plantilla.content.firstElementChild.cloneNode(true);
    const tarjeta = item.querySelector(".galeria-tarjeta");
    const foto = tarjeta.querySelector("img");
    const titulo = imagen.titulo || imagen.evento;
    foto.src = imagen.ruta;
    foto.alt = imagen.alt || "";
    foto.addEventListener("error", () => { foto.hidden = true; }, { once: true });
    item.querySelector(".galeria-leyenda").textContent = titulo;
    tarjeta.setAttribute("aria-label", tx`Mostrar ${titulo}`);
    tarjeta.addEventListener("click", () => seleccionar(indice));
    pista.appendChild(item);

    const punto = document.createElement("button");
    punto.type = "button";
    punto.className = "galeria-punto";
    punto.setAttribute("aria-label", tx`Mostrar imagen ${indice + 1}: ${titulo}`);
    punto.setAttribute("aria-current", "false");
    punto.addEventListener("click", () => seleccionar(indice));
    puntos.appendChild(punto);
  });

  anterior.onclick = () => seleccionar(seleccion - 1);
  siguiente.onclick = () => seleccionar(seleccion + 1);
  pista.onkeydown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    seleccionar(seleccion + (e.key === "ArrowRight" ? 1 : -1));
    pista.children[seleccion].querySelector(".galeria-tarjeta").focus({ preventScroll: true });
  };
  seleccionar(0);
}

function inicializarInfografias() {
  const eventos = obtenerEventosProximos();
  renderizarEventosProximos(eventos);
  renderizarGaleria(eventos);
  const pista = document.getElementById("eventos-pista");
  // ❚❚ / ▷: el que corresponde al estado actual queda resaltado ("activa")
  const botonPausa = document.getElementById("pausar-eventos"), botonPlay = document.getElementById("reanudar-eventos");
  const fijarPausa = (pausado) => {
    pista.classList.toggle("eventos-pausados", pausado);
    pista.dataset.pausaUsuario = pausado ? "1" : "";
    botonPausa.classList.toggle("activa", pausado);
    botonPlay.classList.toggle("activa", !pausado);
    botonPausa.setAttribute("aria-pressed", String(pausado));
    botonPlay.setAttribute("aria-pressed", String(!pausado));
  };
  botonPausa.addEventListener("click", () => fijarPausa(true));
  botonPlay.addEventListener("click", () => fijarPausa(false));
  fijarPausa(false);

}

inicializarInfografias();

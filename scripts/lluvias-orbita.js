// scripts/lluvias-orbita.js
// Lluvias de estrellas en la vista Sistema solar: una marca sobre la órbita de la Tierra en el punto donde cada año cruza la corriente de polvo.
// La marca se enciende (y muestra el nombre) cuando el Sol del reloj está a menos de LLUVIAS_ORBITA_DIAS días del pico.
// Depende de: eventos-lluvias.js (LLUVIAS, LLUVIAS_ZHR_MINIMO), eventos-astronomicos.js (instanteLongitudAparente), planetas.js (posicionHeliocentrica, posicionEnVistaSistemaSolar, PLANETA_TIERRA),
//             astronomia.js (posicionSolar)

const LLUVIAS_ORBITA_DIAS = 6;
let capaLluviasOrbita = null, claveLluviasOrbita = null;
const marcasLluvia = []; // { l, grupo, marca, texto, lon }

function obtenerCapaLluviasOrbita() {
  if (capaLluviasOrbita?.isConnected) return capaLluviasOrbita;
  capaLluviasOrbita = null; marcasLluvia.length = 0; claveLluviasOrbita = null; // el cambio XY/XZ vacía capa-orbita-terrestre: se redibuja
  const padre = document.getElementById("capa-orbita-terrestre"); // se escala con el resto del Sistema solar
  if (!padre) return null;
  capaLluviasOrbita = document.createElementNS(SVG_NS, "g");
  capaLluviasOrbita.setAttribute("id", "capa-lluvias-orbita");
  padre.appendChild(capaLluviasOrbita);
  LLUVIAS.filter((l) => l.zhr === null || l.zhr >= LLUVIAS_ZHR_MINIMO).forEach((l) => {
    const grupo = document.createElementNS(SVG_NS, "g");
    grupo.setAttribute("class", "lluvia-orbita");
    const marca = document.createElementNS(SVG_NS, "circle");
    marca.setAttribute("class", "marca-lluvia");
    marca.setAttribute("r", 4.5);
    marca.setAttribute("tabindex", "0");
    marca.setAttribute("role", "img");
    marca.setAttribute("data-tooltip", tx`Lluvia de estrellas: ${l.nombre}`);
    marca.setAttribute("aria-label", tx`Lluvia de estrellas: ${l.nombre}`);
    const texto = document.createElementNS(SVG_NS, "text");
    texto.setAttribute("class", "texto-lluvia");
    texto.textContent = l.nombre;
    grupo.append(marca, texto);
    capaLluviasOrbita.appendChild(grupo);
    marcasLluvia.push({ l, grupo, marca, texto });
  });
  return capaLluviasOrbita;
}

// Se llama en cada fotograma desde main.js
function actualizarLluviasOrbita(fecha) {
  if (!obtenerCapaLluviasOrbita()) return;
  const anio = fecha.getUTCFullYear(), clave = `${anio}|${vistaSistemaSolar}`;
  const precesion = 1.3969713 * ((anio + 0.5 - 2000) / 100);
  if (clave !== claveLluviasOrbita) { // posición de la Tierra en el instante del pico de ese año
    claveLluviasOrbita = clave;
    marcasLluvia.forEach((m) => {
      m.lon = (m.l.lon + precesion) % 360;
      const pico = instanteLongitudAparente(m.lon, Date.UTC(anio, m.l.mes, m.l.dia, 12));
      const p = posicionEnVistaSistemaSolar(posicionHeliocentrica(PLANETA_TIERRA, new Date(pico)));
      m.marca.setAttribute("cx", p.x);
      m.marca.setAttribute("cy", p.y);
      const lejos = Math.hypot(p.x - 600, p.y - 600) || 1;
      m.texto.setAttribute("x", p.x + ((p.x - 600) / lejos) * 12);
      m.texto.setAttribute("y", p.y + ((p.y - 600) / lejos) * 12);
      m.texto.setAttribute("text-anchor", p.x - 600 >= 0 ? "start" : "end");
    });
  }
  const sol = posicionSolar(fecha).longitudEcliptica;
  marcasLluvia.forEach((m) => {
    const dif = Math.abs(((sol - m.lon + 540) % 360) - 180); // grados de Sol ≈ días
    m.grupo.classList.toggle("activa", dif <= LLUVIAS_ORBITA_DIAS);
  });
}
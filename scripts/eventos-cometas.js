// scripts/eventos-cometas.js
// Cometas del carrusel: lista MANUAL (este motor no predice cometas). eventos-astronomicos.js llama a eventosCometas().
// Solo aparecen los que caen en la ventana de 12 meses desde la fecha del reloj: con el viajero en el pasado/futuro salen los históricos.
// Para añadir uno: una línea con fecha en UTC (Date.UTC(año, mes 0-11, día, hora, minuto)), título y texto.
const COMETA_ICONO = "svg/eventos/cometa.svg";
const COMETAS = [
  // ── Próximos (fechas de pronósticos publicados; el brillo de un cometa es incierto) ──
  { titulo: "Perihelio del cometa 161P/Hartley–IRAS", fecha: Date.UTC(2026, 10, 27), texto: "Solo con telescopio (mag. ~13) · pasó más cerca de la Tierra el 2 oct 2026" },
  { titulo: "Mayor acercamiento del cometa Encke (2P)", fecha: Date.UTC(2027, 1, 3), texto: "Mag. ~6: prismáticos, muy cerca del Sol al anochecer" },
  { titulo: "Perihelio del cometa Encke (2P)", fecha: Date.UTC(2027, 1, 10), texto: "Mag. ~6 · el cometa de menor período (3,3 años)" },
  { titulo: "Perihelio del cometa Halley (1P)", fecha: Date.UTC(2061, 6, 28), texto: "Vuelve cada 75–76 años · visible a simple vista" },
  // ── Históricos (para el viajero del tiempo) ──
  { titulo: "Perihelio del Gran Cometa de 1680", fecha: Date.UTC(1680, 11, 18), texto: "Primer cometa hallado con telescopio · Newton usó su órbita para probar la gravitación" },
  { titulo: "Perihelio del cometa Encke (2P)", fecha: Date.UTC(2023, 9, 22), texto: "Su vuelta anterior · cada 3,3 años" },
  { titulo: "Perihelio del Gran Cometa de 1811", fecha: Date.UTC(1811, 8, 12), texto: "Visible a simple vista 260 días · el «vino del cometa»" },
  { titulo: "El cometa Biela se parte en dos", fecha: Date.UTC(1846, 0, 13), texto: "Desapareció tras 1852 y dejó las Biélidas" },
  { titulo: "Perihelio del Gran Cometa de 1843", fecha: Date.UTC(1843, 1, 27), texto: "Rasante del Sol · una de las colas más largas jamás vistas" },
  { titulo: "Perihelio del cometa Donati", fecha: Date.UTC(1858, 8, 30), texto: "Primer cometa fotografiado" },
  { titulo: "Perihelio del Gran Cometa de septiembre de 1882", fecha: Date.UTC(1882, 8, 17), texto: "Visible a plena luz del día junto al Sol · su núcleo se rompió en cuatro" },
  { titulo: "Perihelio del cometa Halley (1910)", fecha: Date.UTC(1910, 3, 20), texto: "Pánico mundial por el cianógeno de su cola" },
  { titulo: "Perihelio del cometa West", fecha: Date.UTC(1976, 1, 25), texto: "«El gran cometa que nadie vio» · su núcleo se dividió en cuatro" },
  { titulo: "Perihelio del cometa Halley (1986)", fecha: Date.UTC(1986, 1, 9), texto: "Primer cometa estudiado por sondas espaciales" },
  { titulo: "Choque del cometa Shoemaker-Levy 9 con Júpiter", fecha: Date.UTC(1994, 6, 16, 20, 15), texto: "Más de 20 fragmentos · cicatrices visibles durante meses" },
  { titulo: "Máximo acercamiento del cometa Hyakutake", fecha: Date.UTC(1996, 2, 25), texto: "Cola de más de 80° · primer cometa con rayos X detectados" },
  { titulo: "Perihelio del cometa Hale-Bopp", fecha: Date.UTC(1997, 3, 1), texto: "Visible a simple vista 18 meses seguidos" },
  { titulo: "Perihelio del cometa McNaught", fecha: Date.UTC(2007, 0, 12), texto: "El Gran Cometa de 2007 · el más brillante en 40 años" },
  { titulo: "Aterrizaje de Philae en el cometa 67P", fecha: Date.UTC(2014, 10, 12, 15, 34), texto: "Misión Rosetta: primer cometa orbitado y con módulo posado" },
];

function eventosCometas(desdeMs, hastaMs) {
  return COMETAS.filter((c) => c.fecha >= desdeMs && c.fecha <= hastaMs).map((c) => ({
    tipo: `cometa-${c.titulo}`, maximo: c.fecha, titulo: c.titulo, icono: c.icono ?? COMETA_ICONO, alcance: c.texto ?? "",
  }));
}
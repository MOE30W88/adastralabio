# AD ASTRA — Reloj astronómico 2D

**AD ASTRA** es un reloj astronómico interactivo inspirado en el Orloj de Praga. Reúne en una esfera SVG el reloj civil, el ciclo día/noche, el Sol y la Luna, el zodiaco, el calendario, el sistema solar y los eventos astronómicos próximos. La intención es didáctica: explorar cómo se relacionan el tiempo, la fecha y la ubicación mediante capas que se recalculan al cambiar cualquiera de ellos.

Está hecho con HTML, CSS, SVG y JavaScript nativo; sin librerías y sin compilación para desarrollar (el paso de empaquetado es solo para publicar). Todo se calcula en el navegador. La ubicación se obtiene con la geolocalización del navegador, con un **selector en mapa** (búsqueda de lugares o clic en el planisferio) o con coordenadas manuales.

---

## Capas de la esfera

La esfera comparte centro y eje de lectura. El dial de 24 h tiene el mediodía arriba y la medianoche abajo (15°/h). No todas las distancias visuales están a escala física.

| Capa                      | Qué muestra                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reloj**                 | Agujas, lectura digital, marcas de hora y escala de 60 min.                                                                                                                                                                                                                                                                                                                       |
| **Día y noche**           | Anillo según la altura solar local (alba, día, ocaso, noche, crepúsculos); Sol y Luna que se desvanecen bajo el horizonte; línea de horizonte, icono del observador y marcas de eventos. Sub-capa **Planetas**: solo los visibles a simple vista (altura ≥ 3°, elongación ≥ 8° y magnitud bajo el límite según la altura del Sol). Incluye geometría de eclipses y nodos lunares. |
| **Zodiaco**               | Zodiaco tropical (12 sectores de 30°), constelaciones y signo solar activo; calendario chino con sus figuras y símbolos.                                                                                                                                                                                                                                                          |
| **Estaciones y trópicos** | Equinoccios y solsticios por longitud eclíptica real, banda estacional y círculos de los trópicos según la latitud.                                                                                                                                                                                                                                                               |
| **Calendario**            | Meses proporcionales a sus días reales, marcador del día, anillo de estaciones y analema.                                                                                                                                                                                                                                                                                         |
| **Lunario**               | Fases, edad lunar, mareas y vista de la Luna desde la Tierra.                                                                                                                                                                                                                                                                                                                     |
| **Sistema solar**         | Planetas, órbitas y trayectorias en proyección XY y XZ; cometas, lluvias de meteoros y asteroides como capas de referencia; alineaciones planetarias.                                                                                                                                                                                                                             |
| **Rotación terrestre**    | Globo con inclinación axial de 23,44°, paralelos, meridianos y velocidad superficial para la latitud activa.                                                                                                                                                                                                                                                                      |

El menú de **enfoque de capas** atenúa las no seleccionadas (opacidad 0,12).

### Paneles y eventos

- **Panel de lecturas** (bajo la esfera): lugar, coordenadas, fecha, huso, salida/puesta del Sol, duración del día, fase lunar, signo, estación, crepúsculos, hora solar verdadera, ecuación del tiempo, alturas del Sol y la Luna.
- **Paneles laterales** con información y datos dinámicos por capa (Lunario, Calendario, Rotación, Sistema solar).
- **Carrusel de eventos próximos**: viñetas con icono, título, fecha y hora, indicador SÍ/NO de visibilidad desde la ubicación activa y botón «ver en reloj». El detalle incluye mejor lugar de observación y, en eclipses, mapa y trayecto.
- **Viajero**: fecha y hora simuladas, ubicación, velocidad y sentido del tiempo (x1 hasta x10 000 000).
- **Selector de ubicación en mapa**: panel lateral con planisferio dibujado en SVG (costas, fronteras, países y ciudades), zoom con rueda, pellizco o botones, arrastre y teclado. Un clic fija las coordenadas exactas; el nombre del lugar se consulta a Nominatim solo por acción del usuario. El reloj se desplaza para dejar espacio al panel en pantallas anchas.
- **Botón «+» de infografías**: enlaza a la infografía de la capa activa.

### Páginas internas (`paginas/`)

Alcance, Infografías, Matemáticas (fórmulas y métodos usados) y Soporte (mapa del sitio, política de privacidad, términos y condiciones, preguntas frecuentes y créditos).

---

## Cómo ejecutarlo

1. Sirve la carpeta como sitio estático: Live Server de VS Code, o `python -m http.server 8000` y abre `http://localhost:8000`.
2. **Mi ubicación** requiere `localhost` o HTTPS.
3. Para desarrollar no hay compilación; tras cambios, recarga forzada (**Ctrl + Shift + R**).

Los scripts usan `defer` y comparten estado global: **el orden de carga en `index.html` importa**. `atributos-eficientes.js` va siempre el primero.

### Publicar

El sitio se publica empaquetado, sin tocar las fuentes:

```text
npm init -y && npm i -D esbuild     # una sola vez
node tools/auditar-rutas.js          # revisa mayúsculas y rutas (GitHub Pages distingue mayúsculas)
node tools/empaquetar.js             # crea publicar/ con estilos y scripts unidos y minificados
```

`tools/empaquetar.js` lee `index.html` y reúne los CSS en `dist/estilos.css` y los scripts en dos archivos (`dist/app.js`, hasta `main.js`, y `dist/app2.js`, el resto, para respetar el orden de arranque). `publicar/` se genera y no se versiona. La publicación automática en GitHub Pages está en `.github/workflows/publicar.yml` (Settings → Pages → Source: GitHub Actions).

---

## Estructura del proyecto

```text
index.html                 reloj principal
paginas/                   alcance, infografias, matematicas, soporte
css/                       un archivo por capa o componente; tema.css define todas las variables de color;
                           fuentes.css declara la tipografía alojada
fonts/                     Playfair Display (woff2) y su licencia OFL
tools/                     auditar-rutas.js, empaquetar.js, generar-mapa.js (genera los datos del mapa)
scripts/                   más de 80 módulos, agrupados por función:
  núcleo                   atributos-eficientes, main, hora, hora-local, estado-tiempo, ubicacion, viajero, idioma, tema
  astronomía               astronomia, efemerides-precisas (Meeus), efemerides-solares, planetas,
                           traslacion, eclipses, nodos-lunares, cometas/lluvias/asteroides-orbita
  dial y capas             marco, horizonte, luna-angulo, fase-lunar, cuerpos-horizonte,
                           planetas-horizonte, zodiaco, calendario, lunario*, rotacion, enfoque-capas
  eventos                  eventos-*, evento-detalle, evento-visibilidad, evento-mejor-lugar,
                           vinetas-eventos, eclipse-*, marcas-eventos
  paneles                  panel-*, paneles-laterales, menu-lateral*, ayudas-contextuales
  mapa                     mapa-selector (lógica), mapa-fronteras-datos (generado; se carga al abrir el panel)
svg/                       iconos propios (eclipses, eventos, iconos, zodiaco occidental y chino, redes…)
publicar/                  salida del empaquetado (generada, no se versiona)
```

---

## Precisión y aproximaciones

AD ASTRA sirve para visualizar ciclos y relaciones; **no es un instrumento de navegación**.

- **Sol y Luna:** posiciones con series periódicas (Meeus) en `efemerides-precisas.js`. La Luna se calcula geocéntrica, sin paralaje. Salida y puesta con umbral −0,833°, sin presión, temperatura, relieve ni elevación del observador.
- **Eclipses:** calculados con geometría de nodos y fases; adecuados para fechas y visibilidad aproximadas, no para trayectorias de precisión.
- **Planetas visibles:** altura, elongación y magnitud (Meeus cap. 41); el umbral de visibilidad es un criterio práctico, no una predicción observacional exacta.
- **Posición en el dial:** el dial es _relativo al Sol_: el Sol marca la hora del reloj y cada cuerpo se coloca por su ángulo horario relativo a él. No es un mapa del horizonte ni da el azimut real.
- **Sistema solar:** elementos keplerianos aproximados (válidos ~1800–2050), distancias comprimidas con escala no lineal. Los **cometas** usan órbitas aproximadas y los **asteroides** son decorativos.
- **Calendario y husos:** en coordenadas manuales el huso se estima por franjas de 15°; no hay fronteras políticas ni horario de verano. Con geolocalización se usa el huso del dispositivo.
- **Estaciones y zodiaco:** zodiaco tropical; la banda estacional es una visualización diaria, no el instante exacto de equinoccio o solsticio.
- **Rotación:** inclinación fija de 23,44° y velocidad ecuatorial constante; modelo didáctico.
- **Mapa del selector:** proyección equirectangular a partir de Natural Earth 110 m, simplificada (tolerancia 0,15°). El dibujo es aproximado; las coordenadas de un clic sí son exactas. El nombre del lugar viene de Nominatim y puede variar o faltar.

---

## Rendimiento

El coste está en repintar el SVG (unos 2 000 elementos), no en el JavaScript. Medidas aplicadas: escritura de atributos SVG solo si cambian y con decimales acotados (`atributos-eficientes.js`); las capas de movimiento lento se recalculan cada 250 ms salvo a velocidades de viaje mayores de x60; CSS y JS empaquetados (de 214 a 113 peticiones); SVG del zodiaco optimizados con SVGO; tipografía propia en lugar de Google Fonts. Medido con Lighthouse: escritorio ≈ 95; móvil simulado (CPU 4× más lenta) entre 55 y 65 según la corrida, con LCP y TBT como límites. La cifra real es la de PageSpeed sobre el sitio publicado.

---

## Pendientes

- Traducciones reales ES/EN (el control guarda el idioma, pero los textos están en español).
- Revisión de privacidad y términos por un profesional del derecho (los textos ya están completos).
- Medir con PageSpeed sobre el sitio publicado; ideas pendientes: reducir la frecuencia de dibujado y sustituir la animación de lluvias de meteoros, que repinta todo el SVG.

---

## Dependencias externas

Sin librerías JavaScript. El único servicio externo es **Nominatim** (OpenStreetMap), para el nombre de la ciudad y el país y para la búsqueda de lugares; solo se consulta por acción o permiso del usuario. Sin conexión puede faltar la localidad; los cálculos y las coordenadas siguen funcionando. La tipografía y los datos del mapa están incluidos en el proyecto.

## Créditos y licencias

- Algoritmos: Jean Meeus (_Astronomical Algorithms_); elementos keplerianos de NASA JPL (E. M. Standish); ΔT de F. Espenak y J. Meeus; validación con PyEphem.
- Mapa: Natural Earth (dominio público), vía el paquete `world-atlas`. Nombres de lugares: © OpenStreetMap contributors (ODbL).
- Tipografía: Playfair Display, de Claus Eggers Sørensen, bajo SIL Open Font License 1.1 (`fonts/OFL-Playfair-Display.txt`).
- Iconos e ilustraciones SVG: obra original del autor.
- Código, diseño y textos: © 2026 Moisés Soriano, bajo la licencia de `LICENSE.md` (uso personal, educativo y no comercial, con atribución).

---

**Última actualización:** 16 de octubre de 2026

# AD ASTRA — Reloj astronómico 2D

**AD ASTRA** es un reloj astronómico interactivo inspirado en el Orloj de Praga. Reúne en una esfera SVG el reloj civil, el ciclo día/noche, el Sol y la Luna, el zodiaco, el calendario, el sistema solar y los eventos astronómicos próximos. La intención es didáctica: explorar cómo se relacionan el tiempo, la fecha y la ubicación mediante capas que se recalculan al cambiar cualquiera de ellos.

Está hecho con HTML, CSS, SVG y JavaScript nativo; sin librerías ni compilación. Todo se calcula en el navegador. La ubicación se obtiene con la geolocalización del navegador o con coordenadas manuales.

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

### Páginas internas (`paginas/`)

Acerca de, Alcance, Infografías, Matemáticas (fórmulas y métodos usados) y Soporte (ayuda, créditos, privacidad y términos).

---

## Cómo ejecutarlo

1. Sirve la carpeta como sitio estático: Live Server de VS Code, o `python -m http.server 8000` y abre `http://localhost:8000`.
2. **Mi ubicación** requiere `localhost` o HTTPS.
3. No hay compilación; tras cambios, recarga forzada (**Ctrl + Shift + R**).

Los scripts usan `defer` y comparten estado global: **el orden de carga en `index.html` importa**.

---

## Estructura del proyecto

```text
index.html                 reloj principal
paginas/                   acerca-de, alcance, infografias, matematicas, soporte
css/                       un archivo por capa o componente; tema.css define todas las variables de color
scripts/                   ~85 módulos, agrupados por función:
  núcleo                   main, hora, hora-local, estado-tiempo, ubicacion, viajero, idioma, tema
  astronomía               astronomia, efemerides-precisas (Meeus), efemerides-solares, planetas,
                           traslacion, eclipses, nodos-lunares, cometas/lluvias/asteroides-orbita
  dial y capas             marco, horizonte, luna-angulo, fase-lunar, cuerpos-horizonte,
                           planetas-horizonte, zodiaco, calendario, lunario*, rotacion, enfoque-capas
  eventos                  eventos-*, evento-detalle, evento-visibilidad, evento-mejor-lugar,
                           vinetas-eventos, eclipse-*, marcas-eventos
  paneles                  panel-*, paneles-laterales, menu-lateral*, ayudas-contextuales
svg/                       iconos propios (eclipses, eventos, iconos, zodiaco occidental y chino, redes…)
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

---

## Pendientes

- Pulido del index, móvil y Lighthouse
- Publicación en GitHub Pages (revisar mayúsculas/minúsculas en rutas).
- Contenido propio: texto de **Acerca de**, correo y redes reales en el pie.
- Traducciones reales ES/EN (el control guarda el idioma, pero los textos están en español).
- Revisión legal de privacidad y términos; completar los marcadores «pendiente» de Soporte (correo, hospedaje, jurisdicción, licencia, ley de datos).

---

## Dependencias externas

Sin librerías JavaScript. **Nominatim** (OpenStreetMap) para la búsqueda inversa de ciudad y país y **Google Fonts** para la tipografía. Sin conexión pueden faltar la localidad o la fuente; los cálculos y las coordenadas siguen funcionando.

---

**Última actualización:** 13 de octubre de 2026

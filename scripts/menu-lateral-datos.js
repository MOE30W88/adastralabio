// scripts/menu-lateral-datos.js
// Contenido de los menús laterales de las páginas internas. Cada menú es una lista de grupos { titulo, items }.
// Un ítem puede ser un texto (su ancla se genera sola: "<grupo>-<ítem>", sin tildes ni espacios) o { texto, id } para fijarla.
// En la página, cada ítem enlaza a "#ancla". Mientras no exista una sección con ese id, el ítem se ve apagado ("pendiente").
//   Alcance: "alcance".   Matemáticas e Infografía: "capas" (capas del Astrolabio > subcapas).
// Estos menús NO enlazan al reloj: son el índice del contenido de cada página.

const MENUS_LATERALES = {
  alcance: [
    {
      titulo: "Contenido",
      items: [
        { texto: "Precisión e incertidumbre", id: "precision" },
        { texto: "Modelos de cálculo", id: "modelos" },
        { texto: "Precisión por fenómeno", id: "fenomenos" },
        { texto: "Límites temporales y geográficos", id: "condiciones" },
        { texto: "Validación y limitaciones conocidas", id: "validacion" },
        { texto: "Fuentes y referencias", id: "referencias" },
      ],
    },
  ],

    soporte: [
    { titulo: "Contenido", items: [
      { texto: "Mapa del sitio", id: "mapa-del-sitio" },
      { texto: "Política de privacidad", id: "privacidad" },
      { texto: "Términos y condiciones", id: "terminos" },
      { texto: "FAQs", id: "faqs" },
      { texto: "Créditos y fuentes", id: "creditos" } ] } ],

  capas: [
    { titulo: "Reloj", items: ["Fondo del reloj", "Marco y escala horaria", "Escala de minutos", "Aguja horaria", "Aguja minutera", "Segundero", "Marcadores del reloj", "Analema"] },
    { titulo: "Día y noche", items: ["Eventos solares", "Sol", "Luna", "Planetas sobre el horizonte", "Eclipse", "Horizonte", "Marcas de eventos"] },
    { titulo: "Lunario", items: ["Fase lunar"] },
    { titulo: "Zodíaco", items: ["Franja zodiacal", "Indicador zodiacal", "Referencias estacionales", "Marcador estacional", "Trópicos", "Constelaciones", "Sol central"] },
    { titulo: "Calendario", items: ["Calendario", "Marcador de fecha", "Estaciones", "Calendario chino", "Sol central"] },
    { titulo: "Sistema solar", items: ["Órbita terrestre", "Órbitas planetarias", "Asteroides", "Alineación planetaria", "Planetas", "Sol central", "Planetas en primer plano"] },
    { titulo: "Rotación", items: ["Representación de la rotación", "Eje de rotación"] },
  ],
};
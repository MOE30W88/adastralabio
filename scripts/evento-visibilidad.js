// scripts/evento-visibilidad.js
// ¿Se ve el evento desde la ubicación actual? visibilidadEvento(e) → { estado: "si" | "regular" | "no" | "reloj" | null, texto }
// (e = evento crudo con tipo/maximo; lo llama eventosParaCarrusel en eventos-lunares.js). estado null = no aplica (se muestra "—").
// Depende de: eventos-lunares.js (evlAlcanceEclipse), eventos-lluvias.js (LLUVIAS, alturaRadiante), eventos-observacion.js (OBS_TELESCOPIO), eclipses.js (faseLunarPrecisa)

function visibilidadEvento(e) {
  const t = e.tipo || "";
  const hayLugar = typeof ubicacion !== "undefined" && typeof ubicacion.latitud === "number";
  if (e.eclipse) {
    const x = evlAlcanceEclipse(e.eclipse);
    return { estado: !hayLugar ? null : x.startsWith("No") ? "no" : "si", texto: x };
  }
  if (["superluna", "microluna", "luna-azul", "luna-cosecha"].includes(t)) return { estado: "si", texto: tx("Sí · la Luna llena se ve esa noche") };
  if (t === "luna-negra") return { estado: "no", texto: tx("No · la Luna nueva no se ve") };
  if (t.startsWith("lluvia-")) {
    const l = LLUVIAS.find((x) => t === `lluvia-${x.nombre}`), h = l ? alturaRadiante(l.dec) : null, luna = faseLunarPrecisa(e.maximo).fraccion * 100;
    if (h !== null && h < 10) return { estado: "no", texto: tx("No · el radiante casi no sale sobre el horizonte") };
    if (luna >= 70) return { estado: "regular", texto: tx("Regular · mucha luz lunar") };
    if (h !== null && h < 30) return { estado: "regular", texto: tx("Regular · radiante bajo") };
    return { estado: "si", texto: luna < 35 ? tx("Sí · cielo oscuro") : tx("Sí · algo de luz lunar") };
  }
  if (t.startsWith("oposicion-")) { const aparato = OBS_TELESCOPIO[t.slice(10)]; return { estado: "si", texto: tx`Sí · toda la noche${aparato ? ` (${aparato})` : ""}` }; }
  if (t.startsWith("elongacion-")) return { estado: "si", texto: t.endsWith("este") ? tx("Sí · al atardecer") : tx("Sí · antes del amanecer") };
  if (t.startsWith("alineacion-")) return { estado: "reloj", texto: tx("Se ve en el reloj (alineación heliocéntrica)") };
  return { estado: null, texto: tx("No aplica") };
}
const ubicacion = {
  latitud: null,
  longitud: null,
  ciudad: null,
  pais: null,
  esManual: false,
};

function mensajeDeError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return tx("Permiso de ubicación denegado.");
    case error.POSITION_UNAVAILABLE:
      return tx("No se pudo determinar la ubicación.");
    case error.TIMEOUT:
      return tx("La ubicación tardó demasiado en responder.");
    default:
      return tx("Error desconocido al obtener la ubicación.");
  }
}

async function obtenerPaisYCiudad(lat, lon) {
  try {
    const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
      headers: {
        'Accept-Language': idiomaActual()
      }
    });
    const datos = await respuesta.json();
    if (datos && datos.address) {
      ubicacion.ciudad = datos.address.city || datos.address.town || datos.address.village || datos.address.county || "";
      ubicacion.pais = datos.address.country || "";
      return {
        ciudad: ubicacion.ciudad,
        pais: ubicacion.pais
      };
    }
  } catch (e) {
    console.error("No se pudo obtener la localidad", e);
  }
  return null;
}

function pedirUbicacion(alExito, alError) {
  if (!("geolocation" in navigator)) {
    alError("Este navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (posicion) => {
      ubicacion.latitud = posicion.coords.latitude;
      ubicacion.longitud = posicion.coords.longitude;
      if (typeof refrescarEventosProximos === "function") refrescarEventosProximos();
      ubicacion.esManual = false;
      
      await obtenerPaisYCiudad(ubicacion.latitud, ubicacion.longitud);
      
      alExito(ubicacion);
    },
    (error) => {
      alError(mensajeDeError(error));
    },
    { timeout: 10000, maximumAge: 600000 }
  );
}

function establecerUbicacionManual(lat, lon) {
  ubicacion.esManual = true;
  ubicacion.latitud = lat;
  ubicacion.longitud = lon;
  if (typeof refrescarEventosProximos === "function") refrescarEventosProximos();
  ubicacion.ciudad = "";
  ubicacion.pais = "";

  obtenerPaisYCiudad(lat, lon).then((resultado) => {
    if (resultado) {
      const partes = [resultado.ciudad, resultado.pais].filter(Boolean);
      document.getElementById("pais-ciudad").textContent = partes.join(", ");
    }
  });

  document.getElementById("ubicacion").textContent =
    tx`Lat: ${lat.toFixed(4)}°\nLon: ${lon.toFixed(4)}°`;

  dibujarTropicos();
}

function obtenerHusoHorario(fecha) {
  if (ubicacion.latitud === null) return null;
  if (!ubicacion.esManual) return -fecha.getTimezoneOffset() / 60;
  return Math.round(ubicacion.longitud / 15);
}

function textoHusoHorario(huso) {
  if (huso === null) return "";
  const signo = huso < 0 ? "-" : "+";
  const abs = Math.abs(huso);
  const horas = Math.floor(abs);
  const minutos = Math.round((abs - horas) * 60);
  const sufijo = minutos ? `:${String(minutos).padStart(2, "0")}` : "";
  return `(GMT${signo}${horas}${sufijo})`;
}

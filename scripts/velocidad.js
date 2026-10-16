// scripts/velocidad.js
// Controles flotantes de velocidad del tiempo, a los lados del reloj.
//   Derecha:   ▷▷ adelantar (cada clic sube: x10, x100, x1000…)   ▷/❚❚ reproducir normal (x1) / pausar
//   Izquierda: ◁◁ retroceder (cada clic sube: x10, x100, x1000…)  ◁ reproducir hacia atrás (x-1)
// Para cambiar los escalones, edita PASOS_VELOCIDAD.

const PASOS_VELOCIDAD = [10, 100, 1000, 10000, 100000, 1000000, 10000000];

const controlesVelocidad = { sentido: 1, nivel: 0, pausado: false }; // nivel 0 = reproducción normal; 1..n = escalón rápido

function multiplicadorActual() {
  const { sentido, nivel } = controlesVelocidad;
  return sentido * (nivel === 0 ? 1 : PASOS_VELOCIDAD[nivel - 1]);
}

function textoMultiplicador(valor) {
  return valor >= 1000000 ? `x${valor / 1000000}M` : `x${valor}`;
}

const ICONO_PLAY = "M7 4.5v15l12-7.5z", ICONO_PAUSA = "M6 4.5h4v15H6zM14 4.5h4v15h-4z";

// Como un reproductor: el botón del lado que está corriendo a x1 muestra ❚❚ (pausar); en cualquier otro caso muestra ▷ (reproducir)
function pintarControlesVelocidad() {
  const { sentido, nivel, pausado } = controlesVelocidad;
  const magnitud = Math.abs(multiplicadorActual());
  [-1, 1].forEach((lado) => {
    const caja = document.getElementById(lado === 1 ? "controles-tiempo-der" : "controles-tiempo-izq");
    const activo = !pausado && sentido === lado;
    const corriendo = activo && nivel === 0;
    const normal = caja.querySelector('[data-tipo="normal"]');
    caja.classList.toggle("activa", activo);
    caja.querySelector(".control-tiempo-etiqueta").textContent = pausado && lado === 1 ? tx("pausa") : textoMultiplicador(activo ? magnitud : 1);
    normal.classList.toggle("activa", corriendo);
    normal.querySelector("path").setAttribute("d", corriendo ? ICONO_PAUSA : ICONO_PLAY);
    const sentidoTxt = lado === 1 ? tx("a velocidad normal") : tx("hacia atrás");
    const texto = corriendo ? tx("Pausar el tiempo") : tx`Reproducir ${sentidoTxt} (x1)`;
    normal.title = texto;
    normal.setAttribute("aria-label", texto);
    caja.querySelector('[data-tipo="rapido"]').classList.toggle("activa", activo && nivel > 0);
  });
}

function aplicarVelocidad(sentido, nivel) {
  controlesVelocidad.sentido = sentido;
  controlesVelocidad.nivel = nivel;
  controlesVelocidad.pausado = false;
  establecerMultiplicador(multiplicadorActual());
  pintarControlesVelocidad();
}

// Congela el tiempo (botón ❚❚ y "ver en reloj" de las viñetas); cualquier botón de velocidad lo reanuda
function pausarControlesVelocidad() {
  controlesVelocidad.sentido = 1;
  controlesVelocidad.nivel = 0;
  controlesVelocidad.pausado = true;
  establecerMultiplicador(0);
  pintarControlesVelocidad();
}

// Lo llama el botón "Ahora" del cajón Viajar
function reiniciarControlesVelocidad() {
  controlesVelocidad.sentido = 1;
  controlesVelocidad.nivel = 0;
  controlesVelocidad.pausado = false;
  pintarControlesVelocidad();
}

function inicializarControlesVelocidad() {
  document.querySelectorAll(".control-tiempo-boton").forEach((boton) => {
    const lado = Number(boton.closest(".controles-tiempo").dataset.sentido);
    boton.addEventListener("click", () => {
      if (boton.dataset.tipo === "normal") {
        if (!controlesVelocidad.pausado && controlesVelocidad.sentido === lado && controlesVelocidad.nivel === 0) pausarControlesVelocidad(); // corriendo: pausa
        else if (controlesVelocidad.pausado && lado === 1 && document.getElementById("boton-ahora")) document.getElementById("boton-ahora").click(); // ▷ tras una pausa: vuelve a la hora real (y restaura capa/lugar del evento)
        else aplicarVelocidad(lado, 0); // otro modo: reproduce
        return;
      }
      // rápido: sube un escalón; tras el último vuelve a la reproducción normal de ese lado
      const siguiente = controlesVelocidad.sentido === lado ? controlesVelocidad.nivel + 1 : 1;
      aplicarVelocidad(lado, siguiente > PASOS_VELOCIDAD.length ? 0 : siguiente);
    });
  });
  pintarControlesVelocidad();
}

inicializarControlesVelocidad();

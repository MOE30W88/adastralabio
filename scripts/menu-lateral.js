// scripts/menu-lateral.js
// Dibuja el menú lateral de las páginas internas a partir de MENUS_LATERALES (menu-lateral-datos.js).
//   <nav class="menu-lateral" data-menu="capas" data-titulo="Matemáticas" data-descripcion="..."></nav>
// - Acordeón: se abre un grupo a la vez; se abre solo el del ítem activo.
// - Resalta el ítem cuya sección está en pantalla (IntersectionObserver).
// - Ítem sin sección con su id en la página = "pendiente" (apagado, sin salto).
// - ≤ 900 px el menú queda plegado bajo su título; el título lo despliega.
// Depende de: menu-lateral-datos.js. Estilos: css/menu-lateral.css.

function mlAncla(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mlCrear(nav) {
  const grupos = MENUS_LATERALES[nav.dataset.menu];
  if (!grupos) return;
  const numerar = nav.dataset.numerar !== "no";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ml-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `<span class="ml-titulo"></span><span class="ml-descripcion"></span>`;
  toggle.querySelector(".ml-titulo").textContent = nav.dataset.titulo || "";
  toggle.querySelector(".ml-descripcion").textContent = nav.dataset.descripcion || "";

  const cuerpo = document.createElement("div");
  cuerpo.className = "ml-cuerpo";
  grupos.forEach((g, i) => {
    const det = document.createElement("details");
    det.className = "ml-grupo";
    const sum = document.createElement("summary");
    sum.textContent = tx(g.titulo);
    const ol = document.createElement("ol");
    g.items.forEach((it, n) => {
      const texto = typeof it === "string" ? it : it.texto;
      const id = typeof it === "string" ? `${mlAncla(g.titulo)}-${mlAncla(it)}` : it.id;
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${id}`;
      if (numerar) {
        const num = document.createElement("span");
        num.className = "ml-num";
        num.textContent = `${n + 1}.`;
        a.append(num, " ");
      }
      a.append(tx(texto));
      li.appendChild(a);
      ol.appendChild(li);
    });
    det.append(sum, ol);
    cuerpo.appendChild(det);
  });
  nav.replaceChildren(toggle, cuerpo);

  const enlaces = [...nav.querySelectorAll(".ml-grupo a")];
  const objetivos = new Map();
  enlaces.forEach((a) => {
    const destino = document.getElementById(a.hash.slice(1));
    if (destino) objetivos.set(destino, a);
    else { a.classList.add("pendiente"); a.setAttribute("aria-disabled", "true"); a.tabIndex = -1; a.addEventListener("click", (e) => e.preventDefault()); }
  });

  const abrirGrupo = (det) => nav.querySelectorAll(".ml-grupo").forEach((d) => { d.open = d === det; });
  nav.querySelectorAll(".ml-grupo").forEach((d) => d.addEventListener("toggle", () => { if (d.open) nav.querySelectorAll(".ml-grupo").forEach((o) => { if (o !== d) o.open = false; }); }));
  const activar = (a) => {
    enlaces.forEach((x) => { x.classList.toggle("activa", x === a); if (x === a) x.setAttribute("aria-current", "location"); else x.removeAttribute("aria-current"); });
    abrirGrupo(a.closest(".ml-grupo"));
  };

  toggle.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    toggle.setAttribute("aria-expanded", String(abierto));
  });

  if (objetivos.size && "IntersectionObserver" in window) {
    const visibles = new Set();
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
      const primero = [...objetivos.keys()].find((t) => visibles.has(t)); // el más alto en el documento
      if (primero) activar(objetivos.get(primero));
    }, { rootMargin: "-15% 0px -70% 0px" });
    objetivos.forEach((_, t) => obs.observe(t));
  }
  const inicial = enlaces.find((a) => a.hash && a.hash === location.hash && !a.classList.contains("pendiente")) || enlaces.find((a) => !a.classList.contains("pendiente")) || enlaces[0];
  if (inicial) { if (objetivos.size) activar(inicial); else abrirGrupo(inicial.closest(".ml-grupo")); }
}

document.querySelectorAll("nav.menu-lateral[data-menu]").forEach(mlCrear);
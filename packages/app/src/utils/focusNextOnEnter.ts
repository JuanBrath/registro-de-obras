import type { KeyboardEvent } from "react";

// Enter dentro de un formulario de carga de datos no tiene que enviarlo (eso
// queda para el boton correspondiente): en cambio, avanza el foco al
// siguiente campo, como si fuera Tab. Los botones responden a Enter con su
// comportamiento nativo (asi el boton de guardar sigue funcionando con
// Enter una vez que tiene el foco), y los textarea lo tratan como salto de
// linea, no como avance. Tipado sobre HTMLElement (no HTMLFormElement) para
// poder usarse tanto en un <form> real como en el <div> de ObraEditForm, que
// no es un form.
export function focusNextOnEnter(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "BUTTON" || target.tagName === "TEXTAREA") return;
  e.preventDefault();

  const focusables = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("input, select, textarea, button"),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.offsetParent !== null &&
      !el.classList.contains("help-icon") &&
      !el.classList.contains("link-icon-button") &&
      // El input type="date" oculto de CampoFecha (ver CampoFecha.tsx) solo
      // se usa para abrir el calendario nativo por codigo: no es un campo
      // real por el que haya que pasar al avanzar con Enter.
      !el.classList.contains("campo-fecha-nativo-oculto"),
  );

  // Si Enter se disparo en el input oculto de CampoFecha (recien se eligio
  // una fecha con el calendario), avanzar desde el input de texto visible
  // que esta justo antes en el DOM, no desde el propio input oculto (que no
  // forma parte de `focusables`).
  const origen = target.classList.contains("campo-fecha-nativo-oculto") ? target.previousElementSibling : target;
  const currentIndex = focusables.indexOf(origen as HTMLElement);
  if (currentIndex === -1) return;
  focusables[currentIndex + 1]?.focus();
}

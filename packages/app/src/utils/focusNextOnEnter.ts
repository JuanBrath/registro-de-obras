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
      !el.classList.contains("link-icon-button"),
  );

  const currentIndex = focusables.indexOf(target);
  if (currentIndex === -1) return;
  focusables[currentIndex + 1]?.focus();
}

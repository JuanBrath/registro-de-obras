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
  // una fecha con el calendario), hay que saltear todo el campo (el icono Y
  // el input de texto visible, ambos dentro del mismo <label>), no solo el
  // input oculto: si no, el primer Enter cae en el input de texto visible
  // del mismo campo en vez de pasar al campo realmente siguiente.
  const esCalendarioOculto = target.classList.contains("campo-fecha-nativo-oculto");
  const labelDelCampo = esCalendarioOculto ? target.closest("label") : null;

  // Se busca el primer focusable que este DESPUES de `target` en el
  // documento (en vez de su indice exacto dentro de la lista) para que
  // funcione incluso si Enter se dispara en un elemento que no forma parte
  // de `focusables`, como el propio input oculto.
  const siguiente = focusables.find((el) => {
    if (labelDelCampo?.contains(el)) return false;
    return target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  siguiente?.focus();
}

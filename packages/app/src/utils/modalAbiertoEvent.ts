/**
 * Nombre del evento que Modal.tsx dispara al montarse, para que HelpIcon.tsx
 * (u otro cartel flotante de menor z-index) pueda cerrarse solo apenas se
 * abre un modal por encima, sin depender de que el clic que lo abrio haya
 * pasado por el mecanismo de "clic afuera" (que un modal activado por
 * teclado, por ejemplo, no dispara).
 */
export const EVENTO_MODAL_ABIERTO = "registro:modal-abierto";

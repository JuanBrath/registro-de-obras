import type { EdicionId } from "../models/workspace.js";

export function edicionIncluyePersonal(edicion: EdicionId): boolean {
  return edicion === "personal" || edicion === "personal_galeria";
}

export function edicionIncluyeGaleria(edicion: EdicionId): boolean {
  return edicion === "galeria" || edicion === "personal_galeria";
}

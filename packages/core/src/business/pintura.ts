import type { SubtipoPintura } from "../models/obraPintura.js";

export function derivarEsSeriadaPintura(subtipo: SubtipoPintura): boolean {
  return subtipo !== "Original";
}

export function esSeriadaEditablePintura(subtipo: SubtipoPintura): boolean {
  return subtipo === "Original";
}

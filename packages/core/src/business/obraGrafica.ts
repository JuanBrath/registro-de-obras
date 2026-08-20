import type { SubtipoObraGrafica } from "../models/obraDetalle.js";

// Todas las familias de grabado/estampa son inherentemente ediciones,
// salvo Monotipos (por definicion, sin tirada repetible).
export function derivarEsSeriadaObraGrafica(subtipo: SubtipoObraGrafica): boolean {
  return subtipo !== "Monotipos";
}

export type { WorkspaceId } from "../adapters/PlatformAdapterFactory.js";

/**
 * Qué workspaces habilita la licencia de esta instalación. No tiene relación
 * con el almacenamiento de datos (que sigue siendo dos bases totalmente
 * independientes) — solo gatea cuáles de esos workspaces puede abrir el
 * usuario. "personal" habilita Lightroom y excluye comisión/multi-artista;
 * "galeria" es lo inverso; "personal_galeria" combina ambos.
 */
export type EdicionId = "personal" | "galeria" | "personal_galeria";

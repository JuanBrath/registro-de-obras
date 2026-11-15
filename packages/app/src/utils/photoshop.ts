import { invoke } from "@tauri-apps/api/core";

/** Abre el archivo en la copia de Adobe Photoshop más nueva instalada en este equipo. */
export async function abrirEnPhotoshop(ruta: string): Promise<void> {
  await invoke("abrir_en_photoshop", { ruta });
}

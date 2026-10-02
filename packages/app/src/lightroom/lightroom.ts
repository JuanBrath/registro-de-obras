import { invoke } from "@tauri-apps/api/core";
import { interpretarEnvioLightroom, type EnvioLightroom } from "@registro/core";

/**
 * Vinculacion opcional con Lightroom Classic. Galeris Studio funciona igual sin ella: si nunca se
 * instala el complemento, la carpeta de entrada no existe y nada de esto hace nada. La carpeta la
 * maneja el lado de Rust (src-tauri/src/lightroom.rs).
 */

/** Lo que mando Lightroom: los datos ya validados y la foto preparada (o null si no llego). */
export interface RecibidoDeLightroom {
  envio: EnvioLightroom;
  imagen: File | null;
}

/** Lo que mando Lightroom y todavia no se cargo, o null si no hay nada (o si no se entendio). */
export async function leerEnvioLightroom(): Promise<RecibidoDeLightroom | null> {
  const contenido = await invoke<string | null>("leer_envio_lightroom");
  if (contenido === null) return null;
  const envio = interpretarEnvioLightroom(contenido);
  if (!envio) {
    await borrarEnvioLightroom();
    return null;
  }
  let imagen: File | null = null;
  if (envio.imagen) {
    try {
      const bytes = await invoke<ArrayBuffer>("leer_imagen_envio_lightroom", { nombre: envio.imagen });
      imagen = new File([bytes], envio.imagen, { type: "image/jpeg" });
    } catch {
      // Si la foto no llego, se cargan igual los datos.
    }
  }
  return { envio, imagen };
}

/** Si Lightroom dejo una obra esperando (sin leerla ni vaciar la carpeta). */
export async function hayEnvioLightroom(): Promise<boolean> {
  return (await invoke<string | null>("leer_envio_lightroom")) !== null;
}

/** Vacia la carpeta de entrada, para que el mismo envio no se cargue dos veces. */
export const borrarEnvioLightroom = () => invoke<void>("borrar_envio_lightroom");

export interface EstadoLightroom {
  instalado: boolean;
  desactualizado: boolean;
  lightroomEncontrado: boolean;
  carpeta: string;
}

export const estadoLightroom = () => invoke<EstadoLightroom>("estado_lightroom");
export const instalarComplementoLightroom = () => invoke<void>("instalar_complemento_lightroom");
export const quitarComplementoLightroom = () => invoke<void>("quitar_complemento_lightroom");

/**
 * Direccion opuesta a leerEnvioLightroom: pide abrir una foto en Lightroom Classic a partir de la
 * ruta del archivo original guardada en una obra ("ubicación del archivo original"). Si Lightroom no
 * esta corriendo, lo abre. El complemento (VigilarPedidos.lua, ya corriendo dentro de Lightroom
 * mientras este abierto) es quien busca la foto y avisa con un cartel propio si no la encuentra —
 * Galeris Studio no se entera del resultado, asi que esto no tira error si la foto no estaba.
 */
export const pedirAbrirEnLightroom = (ruta: string) => invoke<void>("pedir_abrir_en_lightroom", { ruta });

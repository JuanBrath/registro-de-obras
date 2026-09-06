import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { ask } from "@tauri-apps/plugin-dialog";
import type { DatabaseAdapter, PlatformAdapterFactory, WorkspaceId } from "@registro/core";
import { createTauriDatabaseAdapter } from "./TauriDatabaseAdapter.js";
import { TauriFileSystemAdapter, pickTauriRootDirectory } from "./TauriFileSystemAdapter.js";
import { detectarProveedorNubeEnRuta } from "./detectCloudSyncFolder.js";

const STORE_FILE = "workspace-roots.json";

/** true si la carpeta sigue existiendo en disco (false si un disco externo esta desconectado, o la carpeta se movio/renombro/borro). */
async function raizExiste(root: string): Promise<boolean> {
  try {
    return await invoke<boolean>("fs_exists", { root, relativePath: "" });
  } catch {
    return false;
  }
}

/**
 * Abre el selector de carpetas y repite hasta que el usuario elija una fuera
 * de un servicio de nube conocido, o confirme explicitamente que quiere
 * usarla a pesar del aviso (ver detectCloudSyncFolder.ts). No guarda nada
 * todavia — eso lo decide cada llamador (pickAndSaveRoot guarda de una,
 * moverTauriWorkspaceRoot recien guarda si la copia termina bien).
 */
async function pickFolderAvoidingCloud(mensajeSiCancela: string): Promise<string> {
  for (;;) {
    const picked = await pickTauriRootDirectory();
    if (!picked) {
      throw new Error(mensajeSiCancela);
    }

    const proveedorNube = detectarProveedorNubeEnRuta(picked);
    if (proveedorNube) {
      const usarIgual = await ask(
        `La carpeta elegida está dentro de ${proveedorNube}. Si esa carpeta sigue sincronizándose mientras la app escribe datos, el archivo de la base de datos se puede corromper y perder información.\n\nSe recomienda elegir una carpeta local que no sincronice con ningún servicio de nube.`,
        {
          title: "Carpeta sincronizada con la nube",
          kind: "warning",
          okLabel: "Usar igual esta carpeta",
          cancelLabel: "Elegir otra carpeta",
        },
      );
      if (!usarIgual) continue;
    }

    return picked;
  }
}

/**
 * Elige una carpeta y la guarda para este workspace — usado tanto para la
 * primera eleccion como para "Cambiar carpeta" desde Ajustes y para
 * relocalizar una carpeta perdida.
 */
async function pickAndSaveRoot(store: Store, workspace: WorkspaceId): Promise<string> {
  const picked = await pickFolderAvoidingCloud(`Se necesita elegir una carpeta para el registro "${workspace}"`);
  await store.set(workspace, picked);
  await store.save();
  return picked;
}

async function getOrPickRoot(store: Store, workspace: WorkspaceId): Promise<string> {
  const existing = await store.get<string>(workspace);
  if (!existing) {
    return pickAndSaveRoot(store, workspace);
  }
  if (await raizExiste(existing)) {
    return existing;
  }

  // La carpeta que se uso la ultima vez ya no aparece: puede ser un disco
  // externo desconectado, o que la carpeta se haya movido o renombrado.
  // Se ofrece buscarla de nuevo o, como ultimo recurso, generar una carpeta
  // nueva (los datos viejos no se borran, solo se deja de apuntar a ellos).
  const buscarla = await ask(
    `No encontramos la carpeta donde estaban guardados los datos de este registro (última ubicación conocida: ${existing}). Puede que un disco externo no esté conectado, o que la carpeta se haya movido o renombrado.`,
    {
      title: "No se encontró la carpeta de datos",
      kind: "warning",
      okLabel: "Buscarla",
      cancelLabel: "Generar una carpeta nueva",
    },
  );
  if (buscarla) {
    return pickAndSaveRoot(store, workspace);
  }

  const confirmaNueva = await ask(
    "Vas a generar una carpeta nueva y vacía. Los datos que tenías antes no se borran de donde estaban, pero Galeris va a dejar de mostrarlos hasta que vuelvas a apuntar a esa carpeta (podés hacerlo más adelante desde Ajustes, con \"Cambiar carpeta\").\n\n¿Confirmás que querés generar una carpeta nueva?",
    { title: "Generar carpeta nueva", kind: "warning", okLabel: "Sí, generar nueva", cancelLabel: "Cancelar" },
  );
  if (!confirmaNueva) {
    throw new Error(`No se encontró la carpeta del registro "${workspace}".`);
  }
  return pickAndSaveRoot(store, workspace);
}

/** Usado por el boton "Cambiar carpeta" de Ajustes: fuerza a elegir una carpeta nueva para este workspace, aunque la actual siga siendo valida. */
export async function changeTauriWorkspaceRoot(workspace: WorkspaceId): Promise<string> {
  const store = await Store.load(STORE_FILE);
  return pickAndSaveRoot(store, workspace);
}

export interface ResultadoMudanzaCarpeta {
  nuevaRuta: string;
  rutaVieja: string;
}

/**
 * "Mover carpeta": a diferencia de "Cambiar carpeta" (que solo le indica a
 * Galeris una carpeta distinta, asumiendo que el usuario ya movio los
 * archivos a mano), esta funcion copia ella misma todo el contenido de la
 * carpeta actual a una carpeta nueva elegida por el usuario, pensado para
 * quien no esta comodo moviendo carpetas en el Finder/Explorador.
 *
 * Pasos, en orden por seguridad:
 * 1. Cierra `dbActual` ANTES de copiar — copiar el archivo .db mientras la
 *    conexion sigue abierta se puede llevar una foto a mitad de una
 *    escritura y corromper la copia en el destino.
 * 2. Copia todo (base de datos, obras, certificados) reportando progreso.
 * 3. Abre la copia nueva y corre una consulta trivial para confirmar que
 *    quedo utilizable antes de dar la mudanza por buena.
 * 4. Recien ahi actualiza el workspace para que apunte a la carpeta nueva.
 *
 * La carpeta vieja NUNCA se borra aca — el llamador decide por separado
 * (ver borrarCarpetaViejaTauri) una vez que el usuario confirma que todo
 * quedo bien.
 */
export async function moverTauriWorkspaceRoot(
  workspace: WorkspaceId,
  dbActual: DatabaseAdapter,
  onProgreso: (copiados: number, total: number) => void,
): Promise<ResultadoMudanzaCarpeta> {
  const store = await Store.load(STORE_FILE);
  const rutaVieja = await store.get<string>(workspace);
  if (!rutaVieja) {
    throw new Error(`No hay una carpeta actual para el registro "${workspace}"`);
  }

  const destino = await pickFolderAvoidingCloud("Se necesita elegir una carpeta destino para mover los datos");

  await dbActual.close();

  const unlisten = await listen<{ copiados: number; total: number }>("carpeta-copiando-progreso", (event) => {
    onProgreso(event.payload.copiados, event.payload.total);
  });
  try {
    await invoke("fs_copiar_carpeta", { origen: rutaVieja, destino });
  } finally {
    unlisten();
  }

  const dbNueva = await createTauriDatabaseAdapter(`${destino}/registro.db`);
  try {
    await dbNueva.query("SELECT 1");
  } finally {
    await dbNueva.close();
  }

  await store.set(workspace, destino);
  await store.save();

  return { nuevaRuta: destino, rutaVieja };
}

/** Borra una carpeta vieja despues de una mudanza confirmada (ver moverTauriWorkspaceRoot). Accion aparte y explicita: nunca automatica. */
export async function borrarCarpetaViejaTauri(rutaVieja: string): Promise<void> {
  await invoke("fs_remove_workspace_root", { path: rutaVieja });
}

export async function createTauriAdapterFactory(): Promise<PlatformAdapterFactory> {
  const store = await Store.load(STORE_FILE);

  return {
    async createDatabaseAdapter(workspace) {
      const root = await getOrPickRoot(store, workspace);
      return createTauriDatabaseAdapter(`${root}/registro.db`);
    },
    async createFileSystemAdapter(workspace) {
      const root = await getOrPickRoot(store, workspace);
      const fs = new TauriFileSystemAdapter(root);
      await fs.ensureDir("obras");
      await fs.ensureDir("certificados");
      return fs;
    },
  };
}

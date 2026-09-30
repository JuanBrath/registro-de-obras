import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { ask } from "@tauri-apps/plugin-dialog";
import type { DatabaseAdapter, PlatformAdapterFactory, WorkspaceId } from "@registro/core";
import { createTauriDatabaseAdapter } from "./TauriDatabaseAdapter.js";
import { TauriFileSystemAdapter, pickTauriRootDirectory } from "./TauriFileSystemAdapter.js";
import { detectarProveedorNubeEnRuta } from "./detectCloudSyncFolder.js";
import { leerMiniaturasEnParalelo } from "../../utils/imageObjectUrl.js";
import { getTraductor } from "../../i18n/getTraductor.js";

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
      const t = await getTraductor();
      const usarIgual = await ask(t("dialogo.carpetaNubeMensaje", { proveedor: proveedorNube }), {
        title: t("dialogo.carpetaNubeTitulo"),
        kind: "warning",
        okLabel: t("dialogo.carpetaNubeUsarIgual"),
        cancelLabel: t("dialogo.carpetaNubeElegirOtra"),
      });
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
  const t = await getTraductor();
  const buscarla = await ask(t("dialogo.carpetaNoEncontradaMensaje", { ruta: existing }), {
    title: t("dialogo.carpetaNoEncontradaTitulo"),
    kind: "warning",
    okLabel: t("dialogo.carpetaNoEncontradaBuscarla"),
    cancelLabel: t("dialogo.carpetaNoEncontradaGenerarNueva"),
  });
  if (buscarla) {
    return pickAndSaveRoot(store, workspace);
  }

  const confirmaNueva = await ask(t("dialogo.carpetaNuevaMensaje"), {
    title: t("dialogo.carpetaNuevaTitulo"),
    kind: "warning",
    okLabel: t("dialogo.carpetaNuevaConfirmar"),
    cancelLabel: t("common.cancel"),
  });
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

/** Nombre de la subcarpeta de una copia de seguridad: "<etiqueta> - copia de seguridad AAAA-MM-DD HHhMM". */
function nombreCarpetaBackup(etiqueta: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}h${pad(d.getMinutes())}`;
  return `${etiqueta} - copia de seguridad ${fecha}`;
}

/**
 * Copia de seguridad completa del workspace (base de datos, obras,
 * certificados) en una subcarpeta nueva, con fecha y hora, dentro de la
 * carpeta que elija el usuario. El workspace actual no cambia de lugar: al
 * terminar se abre una conexion nueva a la MISMA carpeta de siempre (hace
 * falta porque, igual que en moverTauriWorkspaceRoot, hay que cerrar la
 * conexion antes de copiar el archivo .db, para no llevarse una foto a
 * mitad de una escritura).
 */
export async function hacerBackupTauriWorkspace(
  workspace: WorkspaceId,
  dbActual: DatabaseAdapter,
  etiqueta: string,
  onProgreso: (copiados: number, total: number) => void,
): Promise<{ destino: string; dbNueva: DatabaseAdapter }> {
  const store = await Store.load(STORE_FILE);
  const raiz = await store.get<string>(workspace);
  if (!raiz) {
    throw new Error(`No hay una carpeta actual para el registro "${workspace}"`);
  }

  const carpetaElegida = await pickTauriRootDirectory();
  if (!carpetaElegida) {
    throw new Error("Se necesita elegir una carpeta donde guardar la copia de seguridad");
  }
  // Si la carpeta elegida fuera la actual (o estuviera adentro de ella), la
  // copia terminaria adentro de si misma: fs_copiar_carpeta solo rechaza que
  // el destino sea EXACTAMENTE el origen, y encima ese chequeo no aplica
  // aca porque el destino (una subcarpeta nueva, con fecha) todavia no
  // existe cuando se hace. Se corta antes de intentarlo.
  const raizNormalizada = raiz.replace(/\/+$/, "");
  if (carpetaElegida === raizNormalizada || carpetaElegida.startsWith(`${raizNormalizada}/`)) {
    throw new Error("Elegí una carpeta distinta a la del registro actual (o una de sus subcarpetas) para guardar la copia de seguridad.");
  }
  const destino = `${carpetaElegida}/${nombreCarpetaBackup(etiqueta)}`;

  await dbActual.close();
  const unlisten = await listen<{ copiados: number; total: number }>("carpeta-copiando-progreso", (event) => {
    onProgreso(event.payload.copiados, event.payload.total);
  });
  try {
    await invoke("fs_copiar_carpeta", { origen: raiz, destino });
  } finally {
    unlisten();
  }

  const dbNueva = await createTauriDatabaseAdapter(`${raiz}/registro.db`);
  return { destino, dbNueva };
}

/**
 * Restaura el workspace actual desde una copia de seguridad elegida por el
 * usuario (ver hacerBackupTauriWorkspace): borra el contenido actual de la
 * carpeta del workspace y lo reemplaza por el de la copia. Accion
 * destructiva a proposito — el llamador tiene que confirmarla con el
 * usuario ANTES de invocar esto, dejando bien claro que se pierde todo lo
 * cargado despues de esa copia.
 */
export async function restaurarTauriWorkspaceDesdeBackup(
  workspace: WorkspaceId,
  dbActual: DatabaseAdapter,
  onProgreso: (copiados: number, total: number) => void,
): Promise<void> {
  const store = await Store.load(STORE_FILE);
  const raiz = await store.get<string>(workspace);
  if (!raiz) {
    throw new Error(`No hay una carpeta actual para el registro "${workspace}"`);
  }

  const origen = await pickTauriRootDirectory();
  if (!origen) {
    throw new Error("Se necesita elegir la carpeta de la copia de seguridad");
  }
  if (!(await invoke<boolean>("fs_exists", { root: origen, relativePath: "registro.db" }))) {
    throw new Error("Esa carpeta no parece ser una copia de seguridad de Galeris (no tiene registro.db)");
  }

  await dbActual.close();

  const unlisten = await listen<{ copiados: number; total: number }>("carpeta-copiando-progreso", (event) => {
    onProgreso(event.payload.copiados, event.payload.total);
  });
  // Primero se copia la copia de seguridad elegida a una carpeta temporal (al
  // lado de la actual, nunca ENCIMA de la actual): asi, si por error se
  // elige la carpeta actual como "copia de seguridad" (o cualquier otro
  // problema a mitad de camino), este primer paso nunca llega a borrar nada
  // — recien se borra la carpeta actual una vez que la copia ya esta a
  // salvo en la temporal, y de ahi se trae de vuelta a su lugar.
  const temporal = `${raiz}.restaurando-tmp-${Date.now()}`;
  try {
    await invoke("fs_copiar_carpeta", { origen, destino: temporal });
    await invoke("fs_remove_workspace_root", { path: raiz });
    await invoke("fs_copiar_carpeta", { origen: temporal, destino: raiz });
  } finally {
    unlisten();
    await invoke("fs_remove_workspace_root", { path: temporal }).catch(() => {});
  }
}

/**
 * Trae hasta `cantidad` miniaturas al azar de un workspace YA CONFIGURADO,
 * para decorar la pantalla de seleccion de modulo con fotos de las obras
 * cargadas — a diferencia de abrir el workspace de verdad (openWorkspace vía
 * createDatabaseAdapter/getOrPickRoot), esto NUNCA dispara un dialogo
 * nativo: si el workspace todavia no tiene carpeta asignada (primer uso de
 * la app) o esa carpeta no esta disponible ahora mismo (por ejemplo un
 * disco externo desconectado), devuelve una lista vacia en silencio en vez
 * de pedirle una carpeta al usuario antes de que elija a que modulo entrar.
 */
export async function peekRandomThumbnails(workspace: WorkspaceId, cantidad: number): Promise<string[]> {
  try {
    const store = await Store.load(STORE_FILE);
    const root = await store.get<string>(workspace);
    if (!root || !(await raizExiste(root))) return [];

    // OJO: no se cierra esta conexion. tauri-plugin-sql identifica cada conexion solo por la
    // ruta del archivo, sin contar cuantos la estan usando: si esta foto al azar (de paso, solo
    // para decorar la pantalla) se abre justo cuando el mismo workspace se esta abriendo de
    // verdad (por ejemplo porque llego algo de Lightroom), cerrarla aca cortaria tambien esa
    // conexion real ("attempted to acquire a connection on a closed pool"), aunque nadie la haya
    // mandado a cerrar. Dejarla abierta no molesta: la proxima vez que se abra este mismo archivo
    // (esta miniatura de nuevo, o el workspace de verdad) se reemplaza sola.
    const db = await createTauriDatabaseAdapter(`${root}/registro.db`);
    const rows = await db.query<{ miniatura_path: string }>(
      "SELECT miniatura_path FROM obra WHERE miniatura_path IS NOT NULL ORDER BY RANDOM() LIMIT ?",
      [cantidad],
    );
    const fs = new TauriFileSystemAdapter(root);
    return await leerMiniaturasEnParalelo(
      fs,
      rows.map((row) => row.miniatura_path),
    );
  } catch {
    return [];
  }
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

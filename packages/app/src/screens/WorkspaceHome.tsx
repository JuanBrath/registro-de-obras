import { useEffect, useRef, useState } from "react";
import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useMiniaturasModo } from "../state/MiniaturasModoContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasEnParalelo } from "../utils/imageObjectUrl.js";
import { useAutoHoverCollage } from "../utils/useAutoHoverCollage.js";
import { RecorridoInicial, type PasoRecorrido } from "../components/RecorridoInicial.js";

// Mas de las que entran en una sola fila de 480px de ancho con miniaturas de
// 84px (ver .workspace-home-collage, que no hace wrap): la fila sencillamente
// se ensancha mas alla de esos 480px en vez de recortarse o pasar a una
// segunda linea, ya que nada le pone un limite de ancho propio.
const CANTIDAD_MINIATURAS_HOME = 7;

// "Ya viste el recorrido de bienvenida" — una clave por workspace (personal/galeria), para que
// cambiar de modulo en una instalacion Suite vuelva a mostrarlo la primera vez en cada uno.
const RECORRIDO_VISTO_STORAGE_PREFIX = "recorridoInicialVisto_";

function cargarRecorridoVisto(workspace: string): boolean {
  try {
    return localStorage.getItem(RECORRIDO_VISTO_STORAGE_PREFIX + workspace) === "1";
  } catch {
    return false;
  }
}

function guardarRecorridoVisto(workspace: string): void {
  try {
    localStorage.setItem(RECORRIDO_VISTO_STORAGE_PREFIX + workspace, "1");
  } catch {
    // No se pudo persistir la preferencia; no rompe el uso de esta sesion.
  }
}

export function WorkspaceHome({
  onEditProfile,
  onVerObras,
  onArtistas,
  onVentas,
  onGaleriaPerfil,
  onClientes,
  onManual,
}: {
  onEditProfile: () => void;
  onVerObras: () => void;
  onArtistas: () => void;
  onVentas: () => void;
  onGaleriaPerfil: () => void;
  onClientes: () => void;
  onManual: () => void;
}) {
  const { context, personalArtista, open } = useWorkspace();
  const { edicion } = useEdicion();
  const { miniaturasModo } = useMiniaturasModo();
  const { t } = useLanguage();
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const miniaturasRef = useRef<string[]>([]);
  const indiceAutoAbierto = useAutoHoverCollage(miniaturas.length, miniaturasModo === "dinamicas");
  const [mostrarRecorrido, setMostrarRecorrido] = useState(() => !cargarRecorridoVisto(context?.workspace ?? ""));

  // Decora esta pantalla con fotos al azar de las obras de este workspace,
  // igual que en la pantalla de presentacion, pero en una sola fila. A
  // diferencia de WorkspacePicker (donde todavia no hay ningun workspace
  // abierto y peekRandomThumbnails abre su propia conexion de paso), aca ya
  // hay una conexion abierta (context.db) — abrir otra al mismo archivo y
  // despues cerrarla rompia esa conexion compartida para el resto de la app
  // (tauri-plugin-sql comparte el pool por ruta de archivo).
  useEffect(() => {
    if (!context) return;
    const ctx = context;
    let cancelado = false;

    async function cargarMiniaturas() {
      const rows = await ctx.db.query<{ miniatura_path: string }>(
        "SELECT miniatura_path FROM obra WHERE miniatura_path IS NOT NULL ORDER BY RANDOM() LIMIT ?",
        [CANTIDAD_MINIATURAS_HOME],
      );
      const urls = await leerMiniaturasEnParalelo(
        ctx.fs,
        rows.map((row) => row.miniatura_path),
      );
      if (cancelado) {
        for (const url of urls) URL.revokeObjectURL(url);
        return;
      }
      miniaturasRef.current = urls;
      setMiniaturas(urls);
    }
    void cargarMiniaturas();

    return () => {
      cancelado = true;
      for (const url of miniaturasRef.current) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  if (!context) return null;

  const esRegistroPersonal = context.workspace === "personal";
  const otroWorkspace = esRegistroPersonal ? "galeria" : "personal";
  // El boton para pasar al otro modulo solo tiene sentido si la edicion de
  // esta instalacion habilita los dos workspaces (Recer Suite) — en una
  // instalacion de un solo modulo (Recer Studio o Recer Space) el otro
  // workspace no esta disponible aunque exista tecnicamente su codigo.
  const puedeCambiarModulo = edicion !== null && edicionIncluyePersonal(edicion) && edicionIncluyeGaleria(edicion);

  function handleCerrarRecorrido() {
    setMostrarRecorrido(false);
    if (context) guardarRecorridoVisto(context.workspace);
  }

  // Los textos de cada paso reutilizan las mismas claves que ya usa el boton que senalan: si el
  // texto de un boton cambia el dia de mañana, el recorrido lo sigue automaticamente.
  const pasosRecorrido: PasoRecorrido[] = [
    { targetSelector: null, titulo: t("recorridoInicial.introTitulo"), texto: t("recorridoInicial.introTexto") },
    esRegistroPersonal
      ? { targetSelector: '[data-recorrido="perfil"]', titulo: t("workspaceHome.miPerfil"), texto: t("recorridoInicial.miPerfilTexto") }
      : { targetSelector: '[data-recorrido="perfil"]', titulo: t("galeriaProfile.titulo"), texto: t("recorridoInicial.galeriaPerfilTexto") },
    ...(esRegistroPersonal
      ? []
      : [{ targetSelector: '[data-recorrido="artistas"]', titulo: t("workspaceHome.artistas"), texto: t("recorridoInicial.artistasTexto") }]),
    { targetSelector: '[data-recorrido="obras"]', titulo: t("workspaceHome.obras"), texto: t("recorridoInicial.obrasTexto") },
    { targetSelector: '[data-recorrido="clientes"]', titulo: t("workspaceHome.clientes"), texto: t("recorridoInicial.clientesTexto") },
    { targetSelector: '[data-recorrido="ventas"]', titulo: t("workspaceHome.ventas"), texto: t("recorridoInicial.ventasTexto") },
    { targetSelector: '[data-recorrido="manual"]', titulo: t("workspaceHome.manual"), texto: t("recorridoInicial.manualTexto") },
    { targetSelector: null, titulo: t("recorridoInicial.cierreTitulo"), texto: t("recorridoInicial.cierreTexto") },
  ];

  return (
    <div className="workspace-home">
      <h1>{esRegistroPersonal ? t("workspacePicker.personal") : t("workspacePicker.galeria")}</h1>
      {esRegistroPersonal && personalArtista && (
        <p>{t("workspaceHome.titular", { nombre: personalArtista.nombreCompleto })}</p>
      )}

      <div className="workspace-home-options">
        {esRegistroPersonal && (
          <button type="button" data-recorrido="perfil" onClick={onEditProfile}>
            {t("workspaceHome.miPerfil")}
          </button>
        )}
        {!esRegistroPersonal && (
          <button type="button" data-recorrido="perfil" onClick={onGaleriaPerfil}>
            {t("galeriaProfile.titulo")}
          </button>
        )}
        {!esRegistroPersonal && (
          <button type="button" data-recorrido="artistas" onClick={onArtistas}>
            {t("workspaceHome.artistas")}
          </button>
        )}
        <button type="button" data-recorrido="obras" onClick={onVerObras}>
          {t("workspaceHome.obras")}
        </button>
        <button type="button" data-recorrido="clientes" onClick={onClientes}>
          {t("workspaceHome.clientes")}
        </button>
        <button type="button" data-recorrido="ventas" onClick={onVentas}>
          {t("workspaceHome.ventas")}
        </button>
        <button type="button" data-recorrido="manual" onClick={onManual}>
          {t("workspaceHome.manual")}
        </button>
        <button type="button" onClick={() => setMostrarRecorrido(true)}>
          {t("workspaceHome.verRecorrido")}
        </button>
      </div>

      {puedeCambiarModulo && (
        <button type="button" className="workspace-home-cambiar-modulo" onClick={() => void open(otroWorkspace)}>
          {t(esRegistroPersonal ? "workspacePicker.galeria" : "workspacePicker.personal")}
        </button>
      )}

      {miniaturas.length > 0 && (
        <div className={`workspace-home-collage${indiceAutoAbierto !== null ? " collage-auto-activo" : ""}`}>
          {miniaturas.map((url, i) => (
            <div
              key={i}
              className={`workspace-picker-collage-thumb${i === indiceAutoAbierto ? " workspace-picker-collage-thumb-auto-abierta" : ""}`}
            >
              <img src={url} alt="" className="workspace-picker-collage-img" />
            </div>
          ))}
        </div>
      )}

      {mostrarRecorrido && <RecorridoInicial pasos={pasosRecorrido} onCerrar={handleCerrarRecorrido} />}
    </div>
  );
}

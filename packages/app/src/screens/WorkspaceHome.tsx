import { useEffect, useRef, useState } from "react";
import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useMiniaturasModo } from "../state/MiniaturasModoContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasEnParalelo } from "../utils/imageObjectUrl.js";
import { useAutoHoverCollage } from "../utils/useAutoHoverCollage.js";

// Mas de las que entran en una sola fila de 480px de ancho con miniaturas de
// 84px (ver .workspace-home-collage, que no hace wrap): la fila sencillamente
// se ensancha mas alla de esos 480px en vez de recortarse o pasar a una
// segunda linea, ya que nada le pone un limite de ancho propio.
const CANTIDAD_MINIATURAS_HOME = 7;

export function WorkspaceHome({
  onEditProfile,
  onVerObras,
  onArtistas,
  onVentas,
  onGaleriaPerfil,
  onClientes,
}: {
  onEditProfile: () => void;
  onVerObras: () => void;
  onArtistas: () => void;
  onVentas: () => void;
  onGaleriaPerfil: () => void;
  onClientes: () => void;
}) {
  const { context, personalArtista, open } = useWorkspace();
  const { edicion } = useEdicion();
  const { miniaturasModo } = useMiniaturasModo();
  const { t } = useLanguage();
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const miniaturasRef = useRef<string[]>([]);
  const indiceAutoAbierto = useAutoHoverCollage(miniaturas.length, miniaturasModo === "dinamicas");

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
  // esta instalacion habilita los dos workspaces (Galeris Suite) — en una
  // instalacion de un solo modulo (Galeris Studio o Galeris Space) el otro
  // workspace no esta disponible aunque exista tecnicamente su codigo.
  const puedeCambiarModulo = edicion !== null && edicionIncluyePersonal(edicion) && edicionIncluyeGaleria(edicion);

  return (
    <div className="workspace-home">
      <h1>{esRegistroPersonal ? t("workspacePicker.personal") : t("workspacePicker.galeria")}</h1>
      {esRegistroPersonal && personalArtista && (
        <p>{t("workspaceHome.titular", { nombre: personalArtista.nombreCompleto })}</p>
      )}

      <div className="workspace-home-options">
        {esRegistroPersonal && (
          <button type="button" onClick={onEditProfile}>
            {t("workspaceHome.miPerfil")}
          </button>
        )}
        {!esRegistroPersonal && (
          <button type="button" onClick={onGaleriaPerfil}>
            {t("galeriaProfile.titulo")}
          </button>
        )}
        {!esRegistroPersonal && (
          <button type="button" onClick={onArtistas}>
            {t("workspaceHome.artistas")}
          </button>
        )}
        <button type="button" onClick={onVerObras}>
          {t("workspaceHome.obras")}
        </button>
        <button type="button" onClick={onClientes}>
          {t("workspaceHome.clientes")}
        </button>
        <button type="button" onClick={onVentas}>
          {t("workspaceHome.ventas")}
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
    </div>
  );
}

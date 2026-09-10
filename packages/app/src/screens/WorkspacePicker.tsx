import { useEffect, useRef, useState } from "react";
import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { BrandHeader } from "../components/BrandHeader.js";
import { isTauri } from "../adapters/detectPlatform.js";

const CANTIDAD_MINIATURAS_COLLAGE = 10;

export function WorkspacePicker() {
  const { loading, error, open } = useWorkspace();
  const { edicion } = useEdicion();
  const { t } = useLanguage();
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const miniaturasRef = useRef<string[]>([]);

  const cargandoEdicion = edicion === null;
  const mostrarPersonal = edicion !== null && edicionIncluyePersonal(edicion);
  const mostrarGaleria = edicion !== null && edicionIncluyeGaleria(edicion);

  // Decora esta pantalla con fotos al azar de las obras ya cargadas (si
  // hay). Se limita a Tauri (desktop) y nunca dispara el selector de
  // carpeta: si algun workspace todavia no tiene datos, esta seccion
  // simplemente no aparece (ver peekRandomThumbnails).
  useEffect(() => {
    if (!isTauri() || edicion === null) return;
    let cancelado = false;

    async function cargarMiniaturas() {
      const { peekRandomThumbnails } = await import("../adapters/tauri/tauriAdapterFactory.js");
      const grupos = await Promise.all([
        mostrarPersonal ? peekRandomThumbnails("personal", CANTIDAD_MINIATURAS_COLLAGE) : Promise.resolve([]),
        mostrarGaleria ? peekRandomThumbnails("galeria", CANTIDAD_MINIATURAS_COLLAGE) : Promise.resolve([]),
      ]);
      if (cancelado) return;
      const urls = [...grupos[0], ...grupos[1]]
        .sort(() => Math.random() - 0.5)
        .slice(0, CANTIDAD_MINIATURAS_COLLAGE);
      miniaturasRef.current = urls;
      setMiniaturas(urls);
    }
    void cargarMiniaturas();

    return () => {
      cancelado = true;
      for (const url of miniaturasRef.current) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicion, mostrarPersonal, mostrarGaleria]);

  return (
    <div className="workspace-picker">
      <BrandHeader size="splash" className="workspace-picker-brand" />
      <div className="workspace-picker-options">
        {cargandoEdicion && <p>{t("common.loading")}</p>}
        {mostrarPersonal && (
          <button type="button" disabled={loading} onClick={() => open("personal")}>
            {t("workspacePicker.personal")}
          </button>
        )}
        {mostrarGaleria && (
          <button type="button" disabled={loading} onClick={() => open("galeria")}>
            {t("workspacePicker.galeria")}
          </button>
        )}
      </div>
      {loading && <p>{t("workspacePicker.opening")}</p>}
      {error && <p className="error">{error}</p>}
      {miniaturas.length > 0 && (
        <div className="workspace-picker-collage">
          {miniaturas.map((url, i) => (
            <div key={i} className="workspace-picker-collage-thumb">
              <img src={url} alt="" className="workspace-picker-collage-img" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useMiniaturasModo } from "../state/MiniaturasModoContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { BrandHeader } from "../components/BrandHeader.js";
import { isTauri } from "../adapters/detectPlatform.js";
import { useAutoHoverCollage } from "../utils/useAutoHoverCollage.js";
import { hayEnvioLightroom } from "../lightroom/lightroom.js";

const CANTIDAD_MINIATURAS_COLLAGE = 10;

export function WorkspacePicker({ onManual }: { onManual: () => void }) {
  const { loading, error, open } = useWorkspace();
  const { edicion } = useEdicion();
  const { miniaturasModo } = useMiniaturasModo();
  const { t } = useLanguage();
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const miniaturasRef = useRef<string[]>([]);
  const indiceAutoAbierto = useAutoHoverCollage(miniaturas.length, miniaturasModo === "dinamicas");

  // Si Lightroom Classic dejo una obra esperando (ver lightroom/lightroom.ts), se entra solo al registro
  // personal: alli se abre "Nueva obra" con esos datos, sin tener que elegir nada. Se intenta una sola vez por
  // envio: si abrir el registro falla, se muestra el error como siempre, sin reintentar en bucle.
  const abrirRegistro = useRef(open);
  abrirRegistro.current = open;
  const cargandoRef = useRef(loading);
  cargandoRef.current = loading;
  const yaIntentoAbrir = useRef(false);
  const mostrarPersonalRef = edicion !== null && edicionIncluyePersonal(edicion);
  useEffect(() => {
    if (!isTauri() || !mostrarPersonalRef) return;
    async function revisar() {
      if (cargandoRef.current) return;
      const hay = await hayEnvioLightroom().catch(() => false);
      if (!hay) {
        yaIntentoAbrir.current = false;
        return;
      }
      if (yaIntentoAbrir.current) return;
      yaIntentoAbrir.current = true;
      void abrirRegistro.current("personal");
    }
    void revisar();
    window.addEventListener("focus", revisar);
    return () => window.removeEventListener("focus", revisar);
  }, [mostrarPersonalRef]);

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
      <div className="workspace-picker-manual">
        <button type="button" onClick={onManual}>
          {t("workspaceHome.manual")}
        </button>
      </div>
      {loading && <p>{t("workspacePicker.opening")}</p>}
      {error && <p className="error">{error}</p>}
      {miniaturas.length > 0 && (
        <div className={`workspace-picker-collage${indiceAutoAbierto !== null ? " collage-auto-activo" : ""}`}>
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

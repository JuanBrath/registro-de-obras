import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { BrandHeader } from "../components/BrandHeader.js";

export function WorkspacePicker() {
  const { loading, error, open } = useWorkspace();
  const { edicion } = useEdicion();
  const { t } = useLanguage();

  const cargandoEdicion = edicion === null;
  const mostrarPersonal = edicion !== null && edicionIncluyePersonal(edicion);
  const mostrarGaleria = edicion !== null && edicionIncluyeGaleria(edicion);

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
    </div>
  );
}

import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";

export function WorkspaceHome({
  onEditProfile,
  onVerObras,
  onArtistas,
  onGaleriaFotos,
  onVentas,
}: {
  onEditProfile: () => void;
  onVerObras: () => void;
  onArtistas: () => void;
  onGaleriaFotos: () => void;
  onVentas: () => void;
}) {
  const { context, personalArtista } = useWorkspace();
  const { t } = useLanguage();
  if (!context) return null;

  const esRegistroPersonal = context.workspace === "personal";

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
          <button type="button" onClick={onArtistas}>
            {t("workspaceHome.artistas")}
          </button>
        )}
        <button type="button" onClick={onVerObras}>
          {t("workspaceHome.obras")}
        </button>
        <button type="button" onClick={onGaleriaFotos}>
          {t("workspaceHome.galeriaFotos")}
        </button>
        <button type="button" onClick={onVentas}>
          {t("workspaceHome.ventas")}
        </button>
      </div>
    </div>
  );
}

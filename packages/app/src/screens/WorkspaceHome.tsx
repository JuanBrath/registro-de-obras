import { edicionIncluyeGaleria, edicionIncluyePersonal } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";

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
  const { t } = useLanguage();
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
    </div>
  );
}

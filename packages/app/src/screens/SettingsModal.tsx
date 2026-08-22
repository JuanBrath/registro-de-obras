import { useState } from "react";
import { Modal } from "../components/Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useTheme } from "../state/ThemeContext.js";
import { useFontSize } from "../state/FontSizeContext.js";
import { useWorkspace } from "../state/WorkspaceContext.js";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { idioma, setIdioma, t } = useLanguage();
  const { tema, setTema } = useTheme();
  const { tamanoFuente, setTamanoFuente } = useFontSize();
  const { context } = useWorkspace();
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetExito, setResetExito] = useState(false);

  async function handleResetearNumeradores() {
    if (!context) return;
    setReseteando(true);
    setResetError(null);
    try {
      await context.db.transaction(async (tx) => {
        await tx.execute("UPDATE artista_contador SET siguiente_numero = 1 WHERE id = 1");
        await tx.execute("UPDATE certificado_contador SET siguiente_numero = 1 WHERE id = 1");
      });
      setConfirmandoReset(false);
      setResetExito(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : String(err));
    } finally {
      setReseteando(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{t("settings.title")}</h2>
      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.idioma")}</legend>
        <label>
          <input type="radio" name="idioma" checked={idioma === "es"} onChange={() => setIdioma("es")} />
          {t("settings.espanol")}
        </label>
        <label>
          <input type="radio" name="idioma" checked={idioma === "en"} onChange={() => setIdioma("en")} />
          {t("settings.ingles")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.apariencia")}</legend>
        <label>
          <input type="radio" name="tema" checked={tema === "claro"} onChange={() => setTema("claro")} />
          {t("settings.claro")}
        </label>
        <label>
          <input type="radio" name="tema" checked={tema === "oscuro"} onChange={() => setTema("oscuro")} />
          {t("settings.oscuro")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.tamanoLetra")}</legend>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "chica"}
            onChange={() => setTamanoFuente("chica")}
          />
          {t("settings.letraChica")}
        </label>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "mediana"}
            onChange={() => setTamanoFuente("mediana")}
          />
          {t("settings.letraMediana")}
        </label>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "grande"}
            onChange={() => setTamanoFuente("grande")}
          />
          {t("settings.letraGrande")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.numeradoresAutomaticos")}</legend>
        {resetExito && <p className="success" role="status">✅ {t("settings.resetearNumeradoresExito")}</p>}
        {resetError && (
          <p className="error" role="alert">
            ⚠️ {resetError}
          </p>
        )}
        {confirmandoReset ? (
          <div className="confirm-box">
            <p>{t("settings.resetearNumeradoresAdvertencia")}</p>
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleResetearNumeradores} disabled={reseteando}>
                {reseteando ? t("common.saving") : t("settings.resetearNumeradoresConfirmar")}
              </button>
              <button type="button" onClick={() => setConfirmandoReset(false)} disabled={reseteando}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setResetExito(false);
              setConfirmandoReset(true);
            }}
          >
            {t("settings.resetearNumeradoresBoton")}
          </button>
        )}
      </fieldset>
    </Modal>
  );
}

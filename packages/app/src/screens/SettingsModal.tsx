import { Modal } from "../components/Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useTheme } from "../state/ThemeContext.js";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { idioma, setIdioma, t } = useLanguage();
  const { tema, setTema } = useTheme();

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
    </Modal>
  );
}

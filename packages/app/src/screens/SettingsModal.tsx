import { Modal } from "../components/Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useTheme } from "../state/ThemeContext.js";
import { useFontSize } from "../state/FontSizeContext.js";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { idioma, setIdioma, t } = useLanguage();
  const { tema, setTema } = useTheme();
  const { tamanoFuente, setTamanoFuente } = useFontSize();

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
    </Modal>
  );
}

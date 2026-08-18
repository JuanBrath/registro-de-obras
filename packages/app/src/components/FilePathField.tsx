import { isTauri } from "../adapters/detectPlatform.js";
import { pickTauriFilePath } from "../adapters/tauri/TauriFileSystemAdapter.js";
import { openLocalPath } from "../utils/openExternalUrl.js";
import { useLanguage } from "../i18n/LanguageContext.js";

export function FilePathField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const { t } = useLanguage();

  if (!isTauri()) {
    // No hay navegación de archivos del sistema fuera de desktop (sandbox de mobile).
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  async function handlePick() {
    const picked = await pickTauriFilePath();
    if (picked) onChange(picked);
  }

  return (
    <div className="file-path-field">
      <input type="text" value={value} readOnly placeholder={t("filePathField.ningunoSeleccionado")} />
      <button type="button" onClick={handlePick}>
        {t("filePathField.elegirArchivo")}
      </button>
      {value && (
        <button type="button" onClick={() => onChange("")}>
          {t("common.remove")}
        </button>
      )}
      {value && (
        <button
          type="button"
          className="link-icon-button"
          onClick={() => openLocalPath(value)}
          aria-label={t("common.abrirEnlace")}
          title={t("common.abrirEnlace")}
        >
          🔗
        </button>
      )}
    </div>
  );
}

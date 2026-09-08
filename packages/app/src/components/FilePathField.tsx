import { useState } from "react";
import { isTauri } from "../adapters/detectPlatform.js";
import { pickTauriFilePath, readAbsoluteFileBytes } from "../adapters/tauri/TauriFileSystemAdapter.js";
import { revealInFileManager } from "../utils/openExternalUrl.js";
import { readImageMetadata, type ArchivoMetadata } from "../utils/readImageMetadata.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

// Formatos que readImageMetadata sabe interpretar. Se chequea la extension
// ANTES de leer el archivo para no cargar en memoria (via IPC) archivos
// pesados de formatos no soportados (por ejemplo un .psd de varios cientos
// de MB), que es lo que colgaba la app al elegir un archivo asi.
const EXTENSIONES_CON_METADATA = ["jpg", "jpeg", "tif", "tiff", "heic", "heif"];

function tieneExtensionConMetadata(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONES_CON_METADATA.includes(extension);
}

export function FilePathField({
  value,
  onChange,
  onMetadata,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Metadatos (EXIF) leidos del archivo elegido, si se pueden leer. */
  onMetadata?: (metadata: ArchivoMetadata | null) => void;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  if (!isTauri()) {
    // No hay navegación de archivos del sistema fuera de desktop (sandbox de mobile).
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  async function handlePick() {
    const picked = await pickTauriFilePath();
    if (!picked) return;
    onChange(picked);
    if (!onMetadata) return;
    if (!tieneExtensionConMetadata(picked)) {
      onMetadata(null);
      return;
    }
    try {
      onMetadata(readImageMetadata(await readAbsoluteFileBytes(picked)));
    } catch {
      // El archivo puede no ser una imagen legible o no tener permisos de lectura — no rompe el flujo.
      onMetadata(null);
    }
  }

  async function handleMostrarEnExplorador() {
    setError(null);
    try {
      await revealInFileManager(value);
    } catch {
      // El archivo pudo haberse movido, renombrado o estar en una carpeta
      // (nube) que ya no esta disponible — avisar en vez de no hacer nada.
      setError(t("filePathField.errorNoSePudoAbrir"));
    }
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
          onClick={handleMostrarEnExplorador}
          aria-label={t("filePathField.mostrarEnExplorador")}
          title={t("filePathField.mostrarEnExplorador")}
        >
          📁
        </button>
      )}
      {error && (
        <p className="error file-path-field-error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

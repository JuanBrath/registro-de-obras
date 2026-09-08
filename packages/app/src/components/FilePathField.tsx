import { useState } from "react";
import { isTauri } from "../adapters/detectPlatform.js";
import { pickTauriFilePath, readAbsoluteFileBytes } from "../adapters/tauri/TauriFileSystemAdapter.js";
import { revealInFileManager } from "../utils/openExternalUrl.js";
import { readImageMetadata, type ArchivoMetadata } from "../utils/readImageMetadata.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

// Formatos que readImageMetadata sabe interpretar. Se chequea la extension
// ANTES de leer el archivo para no cargar en memoria (via IPC) archivos
// pesados de formatos no soportados, que es lo que colgaba la app al elegir
// un archivo asi.
const EXTENSIONES_CON_METADATA = [
  "jpg",
  "jpeg",
  "tif",
  "tiff",
  "heic",
  "heif",
  "psd",
  "psb",
  // RAW de camara: por dentro son archivos TIFF validos, asi que los lee el
  // mismo motor sin codigo aparte. CR3 (Canon) y RAF (Fujifilm) usan un
  // contenedor distinto y todavia no estan soportados.
  "cr2",
  "nef",
  "arw",
  "orf",
  "dng",
];

// Formatos que pueden pesar mucho mas que un jpg comun (un PSD/PSB puede
// llegar a varios GB; un RAW de camara suele andar en decenas de MB): la
// metadata que nos interesa siempre esta cerca del principio del archivo,
// asi que alcanza con traer un prefijo en vez de mandar el archivo entero
// por el canal de comunicacion con la app nativa.
const EXTENSIONES_ARCHIVO_POTENCIALMENTE_GRANDE = ["psd", "psb", "cr2", "nef", "arw", "orf", "dng"];
const PREFIJO_METADATA_MAX_BYTES = 32 * 1024 * 1024; // 32 MB

function obtenerExtension(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function tieneExtensionConMetadata(path: string): boolean {
  return EXTENSIONES_CON_METADATA.includes(obtenerExtension(path));
}

function esArchivoPotencialmenteGrande(path: string): boolean {
  return EXTENSIONES_ARCHIVO_POTENCIALMENTE_GRANDE.includes(obtenerExtension(path));
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
      const bytes = esArchivoPotencialmenteGrande(picked)
        ? await readAbsoluteFileBytes(picked, PREFIJO_METADATA_MAX_BYTES)
        : await readAbsoluteFileBytes(picked);
      onMetadata(readImageMetadata(bytes));
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

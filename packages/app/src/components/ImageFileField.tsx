import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { limitImageResolution } from "../utils/limitImageResolution.js";
import { extraerMiniaturaJpegDePsd } from "../utils/readImageMetadata.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

// El atributo accept="image/*" del input solo filtra la lista del selector
// de archivos, pero no impide elegir "Todos los archivos" y confirmar algo
// que no es una imagen (o un archivo renombrado con extension .jpg). Probar
// que el navegador pueda decodificarlo es la unica forma confiable de
// detectar eso antes de guardarlo.
async function esArchivoDeImagenValido(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

function obtenerExtension(nombreArchivo: string): string {
  return nombreArchivo.split(".").pop()?.toLowerCase() ?? "";
}

// Un PSD/PSB puede pesar varios GB (el navegador no sabe decodificarlo de
// entrada, a diferencia de un JPG/PNG); la miniatura que Photoshop guarda
// adentro del archivo esta siempre cerca del principio, asi que alcanza con
// leer un prefijo en vez de todo el archivo para no colgar la app.
const PREFIJO_PSD_MAX_BYTES = 32 * 1024 * 1024; // 32 MB

/**
 * Reemplaza un PSD/PSB elegido por su miniatura embebida, convertida a un
 * archivo JPEG comun — de ahi en mas el resto del formulario (vista previa,
 * miniatura final, alta resolucion guardada) no necesita saber que el
 * origen fue un PSD, porque nunca deja de ver un JPEG normal. Devuelve null
 * si el archivo no tiene esa miniatura guardada (por ejemplo, si se
 * desactivo "Vistas previas de imagen" en las preferencias de Photoshop).
 */
async function convertirPsdAJpeg(file: File): Promise<File | null> {
  const bytes = new Uint8Array(await file.slice(0, PREFIJO_PSD_MAX_BYTES).arrayBuffer());
  const miniatura = extraerMiniaturaJpegDePsd(bytes);
  if (!miniatura) return null;
  const nombre = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([miniatura], nombre, { type: "image/jpeg", lastModified: file.lastModified });
}

// <input type="file"> renders a native OS/browser button ("Choose File" /
// "Elegir archivo") whose text follows the system locale, not the language
// picked in Configuracion. This hides that native control and drives it
// through our own translated button instead.
export function ImageFileField({
  value,
  onChange,
  disabled = false,
  hasImage = false,
  showFileName = true,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  /** Ya existe una imagen guardada (aunque todavia no se eligio un archivo nuevo en esta sesion). */
  hasImage?: boolean;
  /** Si el campo ya muestra una miniatura propia, el nombre del archivo es redundante. */
  showFileName?: boolean;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  useEffect(() => {
    if (value === null && inputRef.current) inputRef.current.value = "";
  }, [value]);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null;
    setError(null);
    if (!raw) {
      onChange(null);
      return;
    }
    setProcesando(true);
    try {
      const esPsd = ["psd", "psb"].includes(obtenerExtension(raw.name));
      if (esPsd) {
        const convertido = await convertirPsdAJpeg(raw);
        if (!convertido) {
          setError(t("imageFileField.errorPsdSinMiniatura"));
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        onChange(await limitImageResolution(convertido));
        return;
      }
      if (!(await esArchivoDeImagenValido(raw))) {
        setError(t("imageFileField.errorFormatoNoCompatible"));
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      onChange(await limitImageResolution(raw));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <div className="image-file-field">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.psd,.psb"
          className="image-file-field-input"
          onChange={handleChange}
        />
        <span className="image-file-field-name">
          {procesando
            ? t("common.loading")
            : !showFileName
              ? ""
              : value
                ? value.name
                : hasImage
                  ? ""
                  : t("imageFileField.ningunoSeleccionado")}
        </span>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={procesando || disabled}>
          {value || hasImage ? t("imageFileField.cambiarImagen") : t("imageFileField.elegirImagen")}
        </button>
      </div>
      {error && (
        <p className="error image-file-field-error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </>
  );
}

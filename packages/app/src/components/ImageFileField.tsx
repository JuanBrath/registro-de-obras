import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../adapters/detectPlatform.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { limitImageResolution } from "../utils/limitImageResolution.js";
import {
  convertirImagenAJpeg,
  EXTENSIONES_A_CONVERTIR,
  EXTENSIONES_DE_IMAGEN,
  extensionDe,
  leerArchivoCrudo,
  nombreDe,
  TIPO_MIME_POR_EXTENSION,
} from "../utils/convertirImagen.js";
import {
  decodificarImageDataPsd,
  extraerMiniaturaJpegDePsd,
  ubicarImageDataPsd,
  type ImagenDecodificada,
} from "../utils/readImageMetadata.js";
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
// entrada, a diferencia de un JPG/PNG). Para ubicar donde arranca la seccion
// "Image Data" (ver ubicarImageDataPsd) alcanza con un prefijo chico: no
// hace falta leer la seccion de capas en si (la que puede pesar muchisimo),
// solo su largo declarado. Recien la imagen compuesta en si se lee en una
// segunda pasada, arrancando justo en ese offset (ver intentarComposicion).
const PREFIJO_PSD_MAX_BYTES = 32 * 1024 * 1024; // 32 MB
const IMAGE_DATA_PSD_MAX_BYTES = 200 * 1024 * 1024; // 200 MB, generoso para la imagen aplanada real

/** Convierte pixeles RGBA ya decodificados en un Blob JPEG, via canvas. */
async function rgbaAJpegBlob({ width, height, rgba }: ImagenDecodificada): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

/**
 * Intenta decodificar la vista compuesta real de un PSD/PSB (en la
 * resolucion del documento) leyendo el archivo en dos pasadas: una chica
 * para ubicar donde arranca esa seccion, y otra recien ahi para traer sus
 * bytes — sin necesidad de cargar en memoria la seccion de capas, que puede
 * ser mucho mas pesada. Devuelve null si el archivo usa un modo de color o
 * una compresion que este codigo no sabe reconstruir (ver
 * decodificarImageDataPsd), en cuyo caso conviene recurrir a la miniatura
 * chica embebida (ver convertirPsdAJpeg).
 */
async function intentarComposicionPsd(file: File): Promise<ImagenDecodificada | null> {
  try {
    const prefijo = new Uint8Array(await file.slice(0, PREFIJO_PSD_MAX_BYTES).arrayBuffer());
    const info = ubicarImageDataPsd(prefijo);
    if (!info) return null;
    const bytesImageData = new Uint8Array(
      await file.slice(info.offset, info.offset + IMAGE_DATA_PSD_MAX_BYTES).arrayBuffer(),
    );
    return decodificarImageDataPsd(bytesImageData, info);
  } catch {
    return null;
  }
}

/**
 * Reemplaza un PSD/PSB elegido por una imagen JPEG comun — de ahi en mas el
 * resto del formulario (vista previa, miniatura final, alta resolucion
 * guardada) no necesita saber que el origen fue un PSD, porque nunca deja
 * de ver un JPEG normal. Primero intenta la vista compuesta completa (mejor
 * calidad, en la resolucion real del documento); si el archivo usa algo que
 * ese camino no sabe reconstruir, cae a la miniatura chica que Photoshop
 * guarda aparte. Devuelve null solo si NINGUNA de las dos funciono (por
 * ejemplo, si se desactivo "Vistas previas de imagen" en las preferencias
 * de Photoshop y ademas el archivo usa un modo/compresion no soportados).
 */
async function convertirPsdAJpeg(file: File): Promise<File | null> {
  const nombre = file.name.replace(/\.[^.]+$/, ".jpg");

  const composicion = await intentarComposicionPsd(file);
  if (composicion) {
    const blob = await rgbaAJpegBlob(composicion);
    if (blob) return new File([blob], nombre, { type: "image/jpeg", lastModified: file.lastModified });
  }

  const prefijo = new Uint8Array(await file.slice(0, PREFIJO_PSD_MAX_BYTES).arrayBuffer());
  const miniatura = extraerMiniaturaJpegDePsd(prefijo);
  if (!miniatura) return null;
  return new File([new Uint8Array(miniatura)], nombre, { type: "image/jpeg", lastModified: file.lastModified });
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
  // Se muestra siempre que la imagen actual salio de un PSD/PSB (haya
  // funcionado la vista compuesta completa o solo la miniatura chica): en
  // ningun caso es una garantia de que la imagen quede identica a la obra
  // real, asi que conviene avisar aunque la conversion haya funcionado bien.
  const [avisoPsd, setAvisoPsd] = useState(false);
  useEscapeToDismiss(avisoPsd, () => setAvisoPsd(false));
  // Aviso (no es un error) de que se genero un JPG a partir de un PSD/PSB/TIFF.
  const [avisoConversion, setAvisoConversion] = useState<string | null>(null);

  useEffect(() => {
    if (value === null && inputRef.current) {
      inputRef.current.value = "";
      setAvisoPsd(false);
      setAvisoConversion(null);
    }
  }, [value]);

  /**
   * En el programa de escritorio la imagen se elige con el dialogo del sistema, que da la RUTA del archivo: asi
   * un PSD, PSB o TIFF (que puede pesar varios GB) lo convierte a JPEG el lado de Rust, sin cargarlo entero en el
   * navegador, y da lo mismo en macOS que en Windows (ver utils/convertirImagen.ts).
   */
  async function elegirConDialogo() {
    setError(null);
    const ruta = await open({
      multiple: false,
      directory: false,
      filters: [{ name: t("imageFileField.filtroImagenes"), extensions: EXTENSIONES_DE_IMAGEN }],
    });
    if (typeof ruta !== "string") return;
    setProcesando(true);
    try {
      await procesarRuta(ruta);
    } catch (e) {
      setAvisoPsd(false);
      setAvisoConversion(null);
      setError(t("imageFileField.errorConversion", { motivo: e instanceof Error ? e.message : String(e) }));
    } finally {
      setProcesando(false);
    }
  }

  async function procesarRuta(ruta: string) {
    const extension = extensionDe(ruta);
    const nombre = nombreDe(ruta);
    setAvisoPsd(false);
    setAvisoConversion(null);

    if (EXTENSIONES_A_CONVERTIR.includes(extension)) {
      const nombreJpg = nombre.replace(/\.[^.]+$/, ".jpg");
      let motivo = "";
      try {
        const jpeg = await convertirImagenAJpeg(ruta);
        const archivo = await limitImageResolution(new File([jpeg as BlobPart], nombreJpg, { type: "image/jpeg" }));
        onChange(archivo);
        const bitmap = await createImageBitmap(archivo);
        setAvisoConversion(t("imageFileField.convertida", { ancho: bitmap.width, alto: bitmap.height }));
        bitmap.close();
        return;
      } catch (e) {
        motivo = e instanceof Error ? e.message : String(e);
      }
      // No se pudo generar la imagen completa: de un PSD/PSB todavia se puede sacar la miniatura que trae adentro.
      if (extension === "psd" || extension === "psb") {
        const miniatura = extraerMiniaturaJpegDePsd(await leerArchivoCrudo(ruta, PREFIJO_PSD_MAX_BYTES));
        if (miniatura) {
          setAvisoPsd(true);
          onChange(await limitImageResolution(new File([new Uint8Array(miniatura)], nombreJpg, { type: "image/jpeg" })));
        } else {
          setError(t("imageFileField.errorPsdSinMiniatura"));
        }
        return;
      }
      setError(t("imageFileField.errorConversion", { motivo }));
      return;
    }

    // JPG, PNG, GIF, WEBP: el navegador los abre solo.
    const archivo = new File([(await leerArchivoCrudo(ruta)) as BlobPart], nombre, { type: TIPO_MIME_POR_EXTENSION[extension] ?? "" });
    if (!(await esArchivoDeImagenValido(archivo))) {
      setError(t("imageFileField.errorFormatoNoCompatible"));
      return;
    }
    onChange(await limitImageResolution(archivo));
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null;
    setError(null);
    setAvisoConversion(null);
    if (!raw) {
      setAvisoPsd(false);
      onChange(null);
      return;
    }
    setProcesando(true);
    try {
      const esPsd = ["psd", "psb"].includes(obtenerExtension(raw.name));
      if (esPsd) {
        const convertido = await convertirPsdAJpeg(raw);
        if (!convertido) {
          setAvisoPsd(false);
          setError(t("imageFileField.errorPsdSinMiniatura"));
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
        setAvisoPsd(true);
        onChange(await limitImageResolution(convertido));
        return;
      }
      setAvisoPsd(false);
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
        <button
          type="button"
          onClick={() => (isTauri() ? void elegirConDialogo() : inputRef.current?.click())}
          disabled={procesando || disabled}
        >
          {value || hasImage ? t("imageFileField.cambiarImagen") : t("imageFileField.elegirImagen")}
        </button>
      </div>
      {error && (
        <p className="error image-file-field-error" role="alert">
          ⚠️ {error}
        </p>
      )}
      {avisoConversion && !error && !avisoPsd && <p className="field-note image-file-field-error">{avisoConversion}</p>}
      {avisoPsd && !error && (
        <p className="error image-file-field-error" role="alert">
          ⚠️ {t("imageFileField.avisoPsd")}
        </p>
      )}
    </>
  );
}

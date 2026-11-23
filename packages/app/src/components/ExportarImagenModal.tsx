import { useState } from "react";
import { Modal } from "./Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import {
  exportarImagenConDialogo,
  OPCIONES_TAMANO_COLOR_POR_DEFECTO,
  resolverOpcionesTamanoColor,
  type FormatoExportacion,
  type OpcionesTamanoColor,
} from "../utils/exportarImagen.js";
import { CamposTamanoColor } from "./OpcionesTamanoColor.js";

/**
 * Ventana de "Exportar imagen…" (ver el menú contextual de la miniatura y de la vista de
 * pantalla completa en ObraDetail.tsx). Siempre parte del archivo original de la obra —ya
 * verificado como cargado antes de abrir este modal—, y ofrece exportarlo como JPG o TIFF (con
 * redimensión opcional, sin ampliar nunca, y con un copyright a elección) o copiarlo tal cual.
 */
export function ExportarImagenModal({
  titulo,
  nombreArtista,
  rutaOriginal,
  onClose,
}: {
  titulo: string;
  nombreArtista: string;
  rutaOriginal: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [formato, setFormato] = useState<FormatoExportacion>("jpg");
  const [opciones, setOpciones] = useState<OpcionesTamanoColor>(OPCIONES_TAMANO_COLOR_POR_DEFECTO);
  const [copyright, setCopyright] = useState(
    nombreArtista ? `© ${nombreArtista} ${new Date().getFullYear()}` : `© ${new Date().getFullYear()}`,
  );
  const [exportando, setExportando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const nombreSugerido = titulo.replace(/[^a-zA-Z0-9]+/g, "_");

  async function handleExportar() {
    setError(null);
    setMensaje(null);

    const resuelta = resolverOpcionesTamanoColor(opciones);
    if ("error" in resuelta) {
      setError(t(resuelta.error === "ppp" ? "exportarImagen.errorPppInvalida" : "exportarImagen.errorMedidaInvalida"));
      return;
    }

    setExportando(true);
    try {
      const destino = await exportarImagenConDialogo({
        rutaOriginal,
        nombreSugerido,
        formato,
        lado: opciones.lado,
        medida: resuelta.medida,
        profundidad: resuelta.profundidad,
        ppp: resuelta.ppp,
        copyright,
      });
      if (destino) setMensaje(t("exportarImagen.exportadoMensaje"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExportando(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{t("exportarImagen.titulo")}</h2>

      <fieldset className="informes-fieldset">
        <legend>{t("exportarImagen.formatoLegend")}</legend>
        <div className="radio-row">
          <label>
            <input type="radio" name="exportarFormato" checked={formato === "jpg"} onChange={() => setFormato("jpg")} />
            {t("exportarImagen.formatoJpg")}
          </label>
          <label>
            <input type="radio" name="exportarFormato" checked={formato === "tiff"} onChange={() => setFormato("tiff")} />
            {t("exportarImagen.formatoTiff")}
          </label>
          <label>
            <input
              type="radio"
              name="exportarFormato"
              checked={formato === "original"}
              onChange={() => setFormato("original")}
            />
            {t("exportarImagen.formatoOriginal")}
          </label>
        </div>
      </fieldset>

      <CamposTamanoColor formato={formato} valor={opciones} onChange={setOpciones} nombre="exportar" />

      {formato !== "original" && (
        <>
          <label>
            {t("exportarImagen.copyrightLabel")}
            <input type="text" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
          </label>
        </>
      )}

      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
      {mensaje && (
        <p className="success" role="status">
          ✅ {mensaje}
        </p>
      )}

      <div className="obra-form-saved-actions">
        <button type="button" onClick={handleExportar} disabled={exportando}>
          {exportando ? t("exportarImagen.exportando") : t("exportarImagen.exportarBoton")}
        </button>
        <button type="button" onClick={onClose} disabled={exportando}>
          {t("common.back")}
        </button>
      </div>
    </Modal>
  );
}

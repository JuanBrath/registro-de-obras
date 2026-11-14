import { useState } from "react";
import { Modal } from "./Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import {
  exportarImagenConDialogo,
  type FormatoExportacion,
  type LadoExportacion,
} from "../utils/exportarImagen.js";

const MEDIDA_POR_DEFECTO = 3000;

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
  const [lado, setLado] = useState<LadoExportacion>("largo");
  const [medida, setMedida] = useState(String(MEDIDA_POR_DEFECTO));
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

    const medidaNum = Number(medida);
    if (formato !== "original" && (!medidaNum || medidaNum <= 0)) {
      setError(t("exportarImagen.errorMedidaInvalida"));
      return;
    }

    setExportando(true);
    try {
      const destino = await exportarImagenConDialogo({
        rutaOriginal,
        nombreSugerido,
        formato,
        lado,
        medida: medidaNum,
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

      {formato !== "original" && (
        <>
          <fieldset className="informes-fieldset">
            <legend>{t("exportarImagen.ladoLegend")}</legend>
            <div className="radio-row">
              <label>
                <input type="radio" name="exportarLado" checked={lado === "corto"} onChange={() => setLado("corto")} />
                {t("exportarImagen.ladoCorto")}
              </label>
              <label>
                <input type="radio" name="exportarLado" checked={lado === "largo"} onChange={() => setLado("largo")} />
                {t("exportarImagen.ladoLargo")}
              </label>
            </div>
          </fieldset>

          <label>
            {t("exportarImagen.medidaLabel")}
            <input type="number" min={1} value={medida} onChange={(e) => setMedida(e.target.value)} />
          </label>
          <p className="field-note">{t("exportarImagen.medidaNota")}</p>

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

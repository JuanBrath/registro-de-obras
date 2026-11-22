import { useState } from "react";
import { Modal } from "./Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import {
  exportarImagenesEnLote,
  type FormatoExportacion,
  type LadoExportacion,
  type ObraParaExportar,
  type ResultadoExportacionLote,
} from "../utils/exportarImagen.js";

const MEDIDA_POR_DEFECTO = 3000;

/**
 * "Exportar fotos" de una selección: las mismas opciones que "Exportar imagen…" de la ficha de una obra
 * (formato JPG/TIFF/original, lado de referencia, medida y copyright), aplicadas a todas las obras de la
 * selección, siempre partiendo de su archivo original y guardándolas en una carpeta que se elige una vez.
 */
export function ExportarSeleccionModal({
  seleccionNombre,
  obras,
  onClose,
}: {
  seleccionNombre: string;
  obras: ObraParaExportar[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [formato, setFormato] = useState<FormatoExportacion>("jpg");
  const [lado, setLado] = useState<LadoExportacion>("largo");
  const [medida, setMedida] = useState(String(MEDIDA_POR_DEFECTO));
  const [copyrightAutomatico, setCopyrightAutomatico] = useState(true);
  const [copyright, setCopyright] = useState(`© ${new Date().getFullYear()}`);
  const [exportando, setExportando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoExportacionLote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conArchivo = obras.filter((o) => o.rutaOriginal).length;

  async function exportar() {
    setError(null);
    setResultado(null);
    const medidaNum = Number(medida);
    if (formato !== "original" && (!medidaNum || medidaNum <= 0)) {
      setError(t("exportarImagen.errorMedidaInvalida"));
      return;
    }
    setExportando(true);
    try {
      const res = await exportarImagenesEnLote({
        obras,
        formato,
        lado,
        medida: medidaNum,
        copyright: copyrightAutomatico ? null : copyright,
        onProgreso: (hechas, total) => setProgreso({ hechas, total }),
      });
      if (res) setResultado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExportando(false);
      setProgreso(null);
    }
  }

  return (
    <Modal onClose={exportando ? () => {} : onClose} maximizable>
      <div className="dossier-modal">
        <h2 className="dossier-titulo">{t("exportarSeleccion.titulo", { nombre: seleccionNombre })}</h2>
        <p className="dossier-nota">{t("exportarSeleccion.resumen", { conArchivo, total: obras.length })}</p>

        <fieldset className="informes-fieldset">
          <legend>{t("exportarImagen.formatoLegend")}</legend>
          <div className="radio-row">
            <label>
              <input type="radio" name="expSelFormato" checked={formato === "jpg"} onChange={() => setFormato("jpg")} />
              {t("exportarImagen.formatoJpg")}
            </label>
            <label>
              <input type="radio" name="expSelFormato" checked={formato === "tiff"} onChange={() => setFormato("tiff")} />
              {t("exportarImagen.formatoTiff")}
            </label>
            <label>
              <input
                type="radio"
                name="expSelFormato"
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
                  <input type="radio" name="expSelLado" checked={lado === "corto"} onChange={() => setLado("corto")} />
                  {t("exportarImagen.ladoCorto")}
                </label>
                <label>
                  <input type="radio" name="expSelLado" checked={lado === "largo"} onChange={() => setLado("largo")} />
                  {t("exportarImagen.ladoLargo")}
                </label>
              </div>
            </fieldset>

            <label>
              {t("exportarImagen.medidaLabel")}
              <input type="number" min={1} value={medida} onChange={(e) => setMedida(e.target.value)} />
            </label>
            <p className="field-note">{t("exportarImagen.medidaNota")}</p>

            <label className="dossier-check">
              <input type="checkbox" checked={copyrightAutomatico} onChange={(e) => setCopyrightAutomatico(e.target.checked)} />
              <span>{t("exportarSeleccion.copyrightAutomatico")}</span>
            </label>
            {!copyrightAutomatico && (
              <label>
                {t("exportarImagen.copyrightLabel")}
                <input type="text" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
              </label>
            )}
          </>
        )}

        {progreso && (
          <p role="status">{t("exportarSeleccion.progreso", { hechas: progreso.hechas, total: progreso.total })}</p>
        )}
        {error && (
          <p className="error" role="alert">
            ⚠️ {error}
          </p>
        )}
        {resultado && (
          <div role="status">
            <p className="success">✅ {t("exportarSeleccion.listo", { cantidad: resultado.exportadas, carpeta: resultado.carpeta })}</p>
            {resultado.sinArchivo.length > 0 && (
              <p className="dossier-nota">
                {t("exportarSeleccion.sinArchivo", { obras: resultado.sinArchivo.join(", ") })}
              </p>
            )}
            {resultado.conError.length > 0 && (
              <p className="error">
                {t("exportarSeleccion.conError", {
                  obras: resultado.conError.map((e) => `${e.titulo} (${e.mensaje})`).join("; "),
                })}
              </p>
            )}
          </div>
        )}

        <div className="dossier-acciones">
          <button type="button" onClick={onClose} disabled={exportando}>
            {t("common.close")}
          </button>
          <button type="button" onClick={exportar} disabled={exportando || conArchivo === 0}>
            {exportando ? t("exportarImagen.exportando") : t("exportarSeleccion.exportarBoton")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

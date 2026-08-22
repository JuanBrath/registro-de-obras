import { HelpIcon } from "../../components/HelpIcon.js";
import { useLanguage, type TranslationKey } from "../../i18n/LanguageContext.js";

export interface EdicionDetalleState {
  fechaImpresion: string;
  tipoImpresion: string;
  soporteImpresion: string;
  tipoTintas: string;
  tallerImpresion: string;
  dimensiones: string;
  tipoEnmarcado: string;
  tamanoFinalEnmarcado: string;
  ubicacionFirma: string;
  selloSecoHolograma: string;
  ubicacionActual: string;
  notas: string;
  coaNumero: string;
  coaEmisor: string;
  coaFecha: string;
  valorSeguro: string;
  monedaSeguro: string;
  vidrioProteccionFrontal: string;
  sistemaCuelgue: string;
  coaSistemaSeguridad: string;
  informeConservacion: string;
  dimensionesSoporteCompleto: string;
  peso: string;
  tipoFirma: string;
  clasificacionPruebaEspecial: string;
  instruccionesManipulacion: string;
  adhesivosMontaje: string;
  inscripcionesAnotaciones: string;
}

export const initialEdicionDetalleState: EdicionDetalleState = {
  fechaImpresion: "",
  tipoImpresion: "",
  soporteImpresion: "",
  tipoTintas: "",
  tallerImpresion: "",
  dimensiones: "",
  tipoEnmarcado: "",
  tamanoFinalEnmarcado: "",
  ubicacionFirma: "",
  selloSecoHolograma: "",
  ubicacionActual: "",
  notas: "",
  coaNumero: "",
  coaEmisor: "",
  coaFecha: "",
  valorSeguro: "",
  monedaSeguro: "",
  vidrioProteccionFrontal: "",
  sistemaCuelgue: "",
  coaSistemaSeguridad: "",
  informeConservacion: "",
  dimensionesSoporteCompleto: "",
  peso: "",
  tipoFirma: "",
  clasificacionPruebaEspecial: "",
  instruccionesManipulacion: "",
  adhesivosMontaje: "",
  inscripcionesAnotaciones: "",
};

function resumenEdicion(value: EdicionDetalleState): string[] {
  const partes: string[] = [];
  if (value.fechaImpresion) partes.push(value.fechaImpresion);
  if (value.soporteImpresion) partes.push(value.soporteImpresion);
  if (value.dimensiones) partes.push(value.dimensiones);
  if (value.ubicacionActual) partes.push(value.ubicacionActual);
  return partes;
}

export function EdicionDetalleRow({
  numero,
  value,
  onChange,
  editing,
  onStartEdit,
  onStopEdit,
  esFotografia,
  esFotografiaDigital,
  esFotografiaDigitalOSintografia,
  permiteEnmarcado,
  esPruebaArtista,
  esGaleria,
  esObraGrafica,
  esEscultura,
  esDibujo,
  esTextilCeramica,
}: {
  numero: string;
  value: EdicionDetalleState;
  onChange: (next: EdicionDetalleState) => void;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  esFotografia: boolean;
  esFotografiaDigital: boolean;
  esFotografiaDigitalOSintografia: boolean;
  permiteEnmarcado: boolean;
  esPruebaArtista: boolean;
  esGaleria: boolean;
  esObraGrafica: boolean;
  esEscultura: boolean;
  esDibujo: boolean;
  esTextilCeramica: boolean;
}) {
  const { t } = useLanguage();

  if (editing) {
    return (
      <fieldset className="obra-form-detalle-edicion">
        <legend>
          {numero}
          {esPruebaArtista && <HelpIcon fieldKey="prueba_artista_info" />}
        </legend>

        {(esObraGrafica || esEscultura) && esPruebaArtista && (
          <label>
            {t("fields.obraGrafica.clasificacionPruebaEspecialLabel")}{" "}
            <HelpIcon fieldKey="clasificacion_prueba_especial" />
            <select
              value={value.clasificacionPruebaEspecial}
              onChange={(e) => onChange({ ...value, clasificacionPruebaEspecial: e.target.value })}
            >
              <option value="">{t("fields.obraGrafica.clasificacionPruebaEspecialNA")}</option>
              <option value="PE">{t("fields.obraGrafica.clasificacionPruebaEspecialPE")}</option>
              <option value="BAT">{t("fields.obraGrafica.clasificacionPruebaEspecialBAT")}</option>
              <option value="HC">{t("fields.obraGrafica.clasificacionPruebaEspecialHC")}</option>
              <option value="PI">{t("fields.obraGrafica.clasificacionPruebaEspecialPI")}</option>
              <option value="FC">{t("fields.obraGrafica.clasificacionPruebaEspecialFC")}</option>
            </select>
          </label>
        )}

        <label>
          {t("obraDetail.fechaImpresion")}
          <input
            type="date"
            value={value.fechaImpresion}
            onChange={(e) => onChange({ ...value, fechaImpresion: e.target.value })}
          />
        </label>

        {(esFotografiaDigital || esObraGrafica) && (
          <label>
            {t("obraDetail.tipoImpresionLabel")}
            <input
              type="text"
              value={value.tipoImpresion}
              onChange={(e) => onChange({ ...value, tipoImpresion: e.target.value })}
            />
          </label>
        )}

        <label>
          {t("obraDetail.soporteImpresion")}
          <input
            type="text"
            value={value.soporteImpresion}
            onChange={(e) => onChange({ ...value, soporteImpresion: e.target.value })}
          />
        </label>

        {(esFotografiaDigitalOSintografia || esObraGrafica) && (
          <label>
            {t("obraDetail.tipoTintasLabel")} <HelpIcon fieldKey="tipo_tintas" />
            <input
              type="text"
              value={value.tipoTintas}
              onChange={(e) => onChange({ ...value, tipoTintas: e.target.value })}
            />
          </label>
        )}

        <label>
          {t("obraDetail.tamanoEjemplarLabel")}
          <input
            type="text"
            value={value.dimensiones}
            onChange={(e) => onChange({ ...value, dimensiones: e.target.value })}
          />
        </label>

        {(esFotografia || esObraGrafica || esEscultura || esDibujo) && (
          <>
            <label>
              {t("obraDetail.dimensionesSoporteCompletoLabel")}{" "}
              <HelpIcon fieldKey="dimensiones_soporte_completo" />
              <input
                type="text"
                value={value.dimensionesSoporteCompleto}
                onChange={(e) => onChange({ ...value, dimensionesSoporteCompleto: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.pesoLabel")} <HelpIcon fieldKey="peso_ejemplar" />
              <input type="text" value={value.peso} onChange={(e) => onChange({ ...value, peso: e.target.value })} />
            </label>
          </>
        )}

        {(esFotografiaDigital || esObraGrafica || esEscultura) && (
          <label>
            {t("obraDetail.tallerImpresionLabel")} <HelpIcon fieldKey="taller_impresion" />
            <input
              type="text"
              value={value.tallerImpresion}
              onChange={(e) => onChange({ ...value, tallerImpresion: e.target.value })}
            />
          </label>
        )}

        {permiteEnmarcado && (
          <>
            <label>
              {t("obraDetail.tipoEnmarcadoLabel")} <HelpIcon fieldKey="tipo_enmarcado" />
              <input
                type="text"
                value={value.tipoEnmarcado}
                onChange={(e) => onChange({ ...value, tipoEnmarcado: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.tamanoFinalEnmarcadoLabel")}
              <input
                type="text"
                value={value.tamanoFinalEnmarcado}
                onChange={(e) => onChange({ ...value, tamanoFinalEnmarcado: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.vidrioProteccionFrontalLabel")} <HelpIcon fieldKey="vidrio_proteccion_frontal" />
              <input
                type="text"
                value={value.vidrioProteccionFrontal}
                onChange={(e) => onChange({ ...value, vidrioProteccionFrontal: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.sistemaCuelgueLabel")} <HelpIcon fieldKey="sistema_cuelgue" />
              <input
                type="text"
                value={value.sistemaCuelgue}
                onChange={(e) => onChange({ ...value, sistemaCuelgue: e.target.value })}
              />
            </label>
            {esDibujo && (
              <label>
                {t("fields.dibujo.adhesivosMontajeLabel")} <HelpIcon fieldKey="adhesivos_montaje" />
                <input
                  type="text"
                  value={value.adhesivosMontaje}
                  onChange={(e) => onChange({ ...value, adhesivosMontaje: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        {(esFotografia || esObraGrafica || esEscultura || esDibujo || esTextilCeramica) && (
          <label>
            {t("obraDetail.ubicacionFirmaLabel")} <HelpIcon fieldKey="ubicacion_firma" />
            <input
              type="text"
              value={value.ubicacionFirma}
              onChange={(e) => onChange({ ...value, ubicacionFirma: e.target.value })}
            />
          </label>
        )}
        {esObraGrafica && (
          <label>
            {t("fields.obraGrafica.tipoFirmaLabel")} <HelpIcon fieldKey="tipo_firma" />
            <select value={value.tipoFirma} onChange={(e) => onChange({ ...value, tipoFirma: e.target.value })}>
              <option value="">—</option>
              <option value="AManoLapiz">{t("fields.obraGrafica.tipoFirmaAManoLapiz")}</option>
              <option value="Monograma">{t("fields.obraGrafica.tipoFirmaMonograma")}</option>
              <option value="EnPlancha">{t("fields.obraGrafica.tipoFirmaEnPlancha")}</option>
              <option value="SelloTestamentarioTaller">
                {t("fields.obraGrafica.tipoFirmaSelloTestamentarioTaller")}
              </option>
            </select>
          </label>
        )}
        {(esFotografia || esObraGrafica) && (
          <label>
            {t("obraDetail.selloSecoHologramaLabel")} <HelpIcon fieldKey="sello_seco_holograma" />
            <input
              type="text"
              value={value.selloSecoHolograma}
              onChange={(e) => onChange({ ...value, selloSecoHolograma: e.target.value })}
            />
          </label>
        )}

        <label>
          {t("obraDetail.ubicacionActualCopia")}
          <input
            type="text"
            value={value.ubicacionActual}
            onChange={(e) => onChange({ ...value, ubicacionActual: e.target.value })}
          />
        </label>

        {esGaleria && (
          <>
            <label>
              {t("obraDetail.coaNumeroLabel")} <HelpIcon fieldKey="coa_numero" />
              <input
                type="text"
                value={value.coaNumero}
                onChange={(e) => onChange({ ...value, coaNumero: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.coaEmisorLabel")} <HelpIcon fieldKey="coa_emisor" />
              <input
                type="text"
                value={value.coaEmisor}
                onChange={(e) => onChange({ ...value, coaEmisor: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.coaFechaLabel")} <HelpIcon fieldKey="coa_fecha" />
              <input
                type="date"
                value={value.coaFecha}
                onChange={(e) => onChange({ ...value, coaFecha: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.coaSistemaSeguridadLabel")} <HelpIcon fieldKey="coa_sistema_seguridad" />
              <input
                type="text"
                value={value.coaSistemaSeguridad}
                onChange={(e) => onChange({ ...value, coaSistemaSeguridad: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.valorSeguroLabel")} <HelpIcon fieldKey="valor_seguro" />
              <div className="venta-form-valor-row">
                <select
                  value={value.monedaSeguro || "ARS"}
                  onChange={(e) => onChange({ ...value, monedaSeguro: e.target.value })}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value.valorSeguro}
                  onChange={(e) => onChange({ ...value, valorSeguro: e.target.value })}
                />
              </div>
            </label>
            <label>
              {t("obraDetail.informeConservacionLabel")} <HelpIcon fieldKey="informe_conservacion" />
              <textarea
                rows={2}
                value={value.informeConservacion}
                onChange={(e) => onChange({ ...value, informeConservacion: e.target.value })}
              />
            </label>
          </>
        )}

        {(esEscultura || esTextilCeramica) && (
          <label>
            {t("fields.escultura.instruccionesManipulacionLabel")}{" "}
            <HelpIcon fieldKey="instrucciones_manipulacion" />
            <textarea
              rows={2}
              value={value.instruccionesManipulacion}
              onChange={(e) => onChange({ ...value, instruccionesManipulacion: e.target.value })}
            />
          </label>
        )}

        {esDibujo && (
          <label>
            {t("fields.dibujo.inscripcionesAnotacionesLabel")}{" "}
            <HelpIcon fieldKey="inscripciones_anotaciones" />
            <textarea
              rows={2}
              value={value.inscripcionesAnotaciones}
              onChange={(e) => onChange({ ...value, inscripcionesAnotaciones: e.target.value })}
            />
          </label>
        )}

        <label>
          {t("obraDetail.notasEjemplarLabel")}
          <textarea rows={2} value={value.notas} onChange={(e) => onChange({ ...value, notas: e.target.value })} />
        </label>

        <div className="obra-form-saved-actions">
          <button type="button" onClick={onStopEdit}>
            {t("common.close")}
          </button>
        </div>
      </fieldset>
    );
  }

  const resumen = resumenEdicion(value);
  return (
    <div className="ejemplar-row">
      <strong>
        {numero}
        {esPruebaArtista && <HelpIcon fieldKey="prueba_artista_info" />}
      </strong>
      {(esObraGrafica || esEscultura) && value.clasificacionPruebaEspecial && (
        <span>
          {t(`fields.obraGrafica.clasificacionPruebaEspecial${value.clasificacionPruebaEspecial}` as TranslationKey)}
        </span>
      )}
      {resumen.length > 0 ? (
        resumen.map((parte, i) => <span key={i}>{parte}</span>)
      ) : (
        <span>{t("obraForm.sinDatosCargados")}</span>
      )}
      <div className="obra-form-saved-actions">
        <button type="button" onClick={onStartEdit}>
          {t("common.edit")}
        </button>
      </div>
    </div>
  );
}

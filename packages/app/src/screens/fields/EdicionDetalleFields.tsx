import { HelpIcon } from "../../components/HelpIcon.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

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
}) {
  const { t } = useLanguage();

  if (editing) {
    return (
      <fieldset className="obra-form-detalle-edicion">
        <legend>
          {numero}
          {esPruebaArtista && <HelpIcon fieldKey="prueba_artista_info" />}
        </legend>

        <label>
          {t("obraDetail.fechaImpresion")}
          <input
            type="date"
            value={value.fechaImpresion}
            onChange={(e) => onChange({ ...value, fechaImpresion: e.target.value })}
          />
        </label>

        {esFotografiaDigital && (
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

        {esFotografiaDigitalOSintografia && (
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

        {esFotografiaDigital && (
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
          </>
        )}

        {esFotografia && (
          <>
            <label>
              {t("obraDetail.ubicacionFirmaLabel")} <HelpIcon fieldKey="ubicacion_firma" />
              <input
                type="text"
                value={value.ubicacionFirma}
                onChange={(e) => onChange({ ...value, ubicacionFirma: e.target.value })}
              />
            </label>
            <label>
              {t("obraDetail.selloSecoHologramaLabel")} <HelpIcon fieldKey="sello_seco_holograma" />
              <input
                type="text"
                value={value.selloSecoHolograma}
                onChange={(e) => onChange({ ...value, selloSecoHolograma: e.target.value })}
              />
            </label>
          </>
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
          </>
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

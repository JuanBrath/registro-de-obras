import { useRef } from "react";
import type {
  SubtipoFotografia,
  ClasificacionPositivado,
  PiezaUnicaOMatriz,
  FlujoGenerativo,
  SoporteSalida,
} from "@registro/core";
import { HelpIcon } from "../../components/HelpIcon.js";
import { FilePathField } from "../../components/FilePathField.js";
import { CampoFecha, BotonCalendario, type CampoFechaHandle } from "../../components/CampoFecha.js";
import { useLanguage } from "../../i18n/LanguageContext.js";
import type { ArchivoMetadata } from "../../utils/readImageMetadata.js";

export interface FotografiaFieldsState {
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura: string;
  anioEdicion: string;
  softwareEdicion: string;
  dimensiones: string;
  tecnica: string;
  escalaPorTamanos: string;
  esSeriada: boolean | null;
  serieProyecto: string;
  // Solo Analogica Clasica
  clasificacionPositivado: ClasificacionPositivado | "";
  procesoQuimicoAnalogica: string;
  virajeConservacion: string;
  formatoNegativo: string;
  estadoNegativo: string;
  // Solo Digital Fine Art
  formatoArchivoMaestro: string;
  espacioColor: string;
  condicionesCustodiaArchivo: string;
  // Solo Procesos Historicos
  procesoQuimicoHistoricos: string;
  preparacionSoporte: string;
  metalesSales: string;
  piezaUnicaOMatriz: PiezaUnicaOMatriz | "";
  // Solo Fotolibros
  estructuraObjeto: string;
  contenedorEstuche: string;
  incluyeCopiaColeccionista: boolean;
  detalleCopiaColeccionista: string;
  creditosEditoriales: string;
  isbn: string;
  colofon: string;
  // Datos de captura (no aplican a Sintografia)
  camara: string;
  iso: string;
  velocidadObturador: string;
  diafragma: string;
  distanciaFocal: string;
  // Solo Sintografia
  motorIa: string;
  promptParametros: string;
  flujoGenerativo: FlujoGenerativo | "";
  intervencionPostproduccion: string;
  soporteSalida: SoporteSalida | "";
  declaracionDerechosIa: string;
}

export const initialFotografiaFieldsState: FotografiaFieldsState = {
  subtipoFotografia: "DigitalFineArt",
  fechaCaptura: "",
  anioEdicion: "",
  softwareEdicion: "",
  dimensiones: "",
  tecnica: "",
  escalaPorTamanos: "",
  esSeriada: null,
  serieProyecto: "",
  clasificacionPositivado: "",
  procesoQuimicoAnalogica: "",
  virajeConservacion: "",
  formatoNegativo: "",
  estadoNegativo: "",
  formatoArchivoMaestro: "",
  espacioColor: "",
  condicionesCustodiaArchivo: "",
  procesoQuimicoHistoricos: "",
  preparacionSoporte: "",
  metalesSales: "",
  piezaUnicaOMatriz: "",
  estructuraObjeto: "",
  contenedorEstuche: "",
  incluyeCopiaColeccionista: false,
  detalleCopiaColeccionista: "",
  creditosEditoriales: "",
  isbn: "",
  colofon: "",
  camara: "",
  iso: "",
  velocidadObturador: "",
  diafragma: "",
  distanciaFocal: "",
  motorIa: "",
  promptParametros: "",
  flujoGenerativo: "",
  intervencionPostproduccion: "",
  soporteSalida: "",
  declaracionDerechosIa: "",
};

export function FotografiaFields({
  value,
  onChange,
  mostrarSoftwareEdicion = true,
  mostrarEsSeriada = true,
  ubicacion,
  onUbicacionChange,
  onUbicacionMetadata,
  mostrarUbicacion = false,
}: {
  value: FotografiaFieldsState;
  onChange: (next: FotografiaFieldsState) => void;
  mostrarSoftwareEdicion?: boolean;
  mostrarEsSeriada?: boolean;
  ubicacion?: string;
  onUbicacionChange?: (next: string) => void;
  /** Metadatos (EXIF) leidos del archivo cuando se indica su ubicacion. */
  onUbicacionMetadata?: (metadata: ArchivoMetadata | null) => void;
  mostrarUbicacion?: boolean;
}) {
  const { t } = useLanguage();
  const fechaCapturaRef = useRef<CampoFechaHandle>(null);

  return (
    <fieldset>
      <legend>{t("fields.fotografia.legend")}</legend>

      <label>
        {t("field.subtipo")} <HelpIcon fieldKey="subtipo_fotografia" />
        <select
          value={value.subtipoFotografia}
          onChange={(e) => onChange({ ...value, subtipoFotografia: e.target.value as SubtipoFotografia })}
        >
          <option value="AnalogicaClasica">{t("fields.fotografia.subtipoAnalogicaClasica")}</option>
          <option value="DigitalFineArt">{t("fields.fotografia.subtipoDigitalFineArt")}</option>
          <option value="ProcesosHistoricos">{t("fields.fotografia.subtipoProcesosHistoricos")}</option>
          <option value="Fotolibros">{t("fields.fotografia.subtipoFotolibros")}</option>
          <option value="Sintografia">{t("fields.fotografia.subtipoSintografia")}</option>
        </select>
      </label>

      <label>
        {t("fields.fotografia.serieProyectoLabel")} <HelpIcon fieldKey="serie_proyecto" />
        <input
          type="text"
          value={value.serieProyecto}
          onChange={(e) => onChange({ ...value, serieProyecto: e.target.value })}
        />
      </label>

      {mostrarUbicacion &&
        (value.subtipoFotografia === "DigitalFineArt" || value.subtipoFotografia === "Sintografia" ? (
          <label>
            {t("obraForm.ubicacionArchivoLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
            <FilePathField
              value={ubicacion ?? ""}
              onChange={(next) => onUbicacionChange?.(next)}
              onMetadata={onUbicacionMetadata}
            />
          </label>
        ) : (
          <label>
            {t("obraForm.ubicacionNegativoLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
            <input type="text" value={ubicacion ?? ""} onChange={(e) => onUbicacionChange?.(e.target.value)} />
          </label>
        ))}

      <label>
        {value.subtipoFotografia === "Sintografia" ? t("field.fechaCreacion") : t("fields.fotografia.fechaCaptura")}{" "}
        <BotonCalendario onClick={() => fechaCapturaRef.current?.abrirCalendario()} />
        <CampoFecha
          ref={fechaCapturaRef}
          valorIso={value.fechaCaptura}
          onChangeIso={(iso) => onChange({ ...value, fechaCaptura: iso })}
        />
      </label>

      <label>
        {t("fields.fotografia.anioEdicion")}
        <input
          type="text"
          inputMode="numeric"
          placeholder="AAAA"
          maxLength={4}
          value={value.anioEdicion}
          onChange={(e) => onChange({ ...value, anioEdicion: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        />
      </label>

      {value.subtipoFotografia !== "Sintografia" && (
        <fieldset>
          <legend>{t("fields.fotografia.datosCapturaLegend")} <HelpIcon fieldKey="datos_captura" /></legend>
          <label>
            {t("fields.fotografia.camaraLabel")}
            <input type="text" value={value.camara} onChange={(e) => onChange({ ...value, camara: e.target.value })} />
          </label>
          <div className="venta-form-row-2">
            <label>
              {t("fields.fotografia.isoLabel")}
              <input type="text" value={value.iso} onChange={(e) => onChange({ ...value, iso: e.target.value })} />
            </label>
            <label>
              {t("fields.fotografia.velocidadObturadorLabel")}
              <input
                type="text"
                value={value.velocidadObturador}
                onChange={(e) => onChange({ ...value, velocidadObturador: e.target.value })}
              />
            </label>
          </div>
          <div className="venta-form-row-2">
            <label>
              {t("fields.fotografia.diafragmaLabel")}
              <input
                type="text"
                value={value.diafragma}
                onChange={(e) => onChange({ ...value, diafragma: e.target.value })}
              />
            </label>
            <label>
              {t("fields.fotografia.distanciaFocalLabel")}
              <input
                type="text"
                value={value.distanciaFocal}
                onChange={(e) => onChange({ ...value, distanciaFocal: e.target.value })}
              />
            </label>
          </div>
        </fieldset>
      )}

      <label>
        {t("fields.fotografia.dimensiones")} <HelpIcon fieldKey="dimensiones_fotografia" />
        <input
          type="text"
          required={value.escalaPorTamanos === "No"}
          value={value.dimensiones}
          onChange={(e) => onChange({ ...value, dimensiones: e.target.value })}
        />
      </label>

      <label>
        {t("fields.fotografia.escalaPorTamanosLabel")} <HelpIcon fieldKey="escala_por_tamanos" />
        <select
          value={value.escalaPorTamanos}
          onChange={(e) => onChange({ ...value, escalaPorTamanos: e.target.value })}
        >
          <option value="">—</option>
          <option value="Si">{t("common.yes")}</option>
          <option value="No">{t("common.no")}</option>
        </select>
      </label>

      <label>
        {t("field.tecnica")} <HelpIcon fieldKey="tecnica_fotografia" />
        <textarea
          rows={2}
          value={value.tecnica}
          onChange={(e) => onChange({ ...value, tecnica: e.target.value })}
        />
      </label>

      {value.subtipoFotografia === "AnalogicaClasica" && (
        <fieldset>
          <legend>{t("fields.fotografia.rigurosaAnalogicaLegend")}</legend>

          <label>
            {t("fields.fotografia.clasificacionPositivadoLabel")}{" "}
            <HelpIcon fieldKey="clasificacion_positivado" />
            <select
              value={value.clasificacionPositivado}
              onChange={(e) =>
                onChange({ ...value, clasificacionPositivado: e.target.value as ClasificacionPositivado | "" })
              }
            >
              <option value="">—</option>
              <option value="Vintage">{t("fields.fotografia.clasificacionPositivadoVintage")}</option>
              <option value="Modern">{t("fields.fotografia.clasificacionPositivadoModern")}</option>
              <option value="Estate">{t("fields.fotografia.clasificacionPositivadoEstate")}</option>
            </select>
          </label>

          <label>
            {t("fields.fotografia.procesoQuimicoLabel")} <HelpIcon fieldKey="proceso_quimico_analogica" />
            <textarea
              rows={2}
              value={value.procesoQuimicoAnalogica}
              onChange={(e) => onChange({ ...value, procesoQuimicoAnalogica: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.virajeConservacionLabel")} <HelpIcon fieldKey="viraje_conservacion" />
            <input
              type="text"
              value={value.virajeConservacion}
              onChange={(e) => onChange({ ...value, virajeConservacion: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.formatoNegativoLabel")} <HelpIcon fieldKey="formato_negativo" />
            <input
              type="text"
              value={value.formatoNegativo}
              onChange={(e) => onChange({ ...value, formatoNegativo: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.estadoNegativoLabel")} <HelpIcon fieldKey="estado_negativo" />
            <input
              type="text"
              value={value.estadoNegativo}
              onChange={(e) => onChange({ ...value, estadoNegativo: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {value.subtipoFotografia === "DigitalFineArt" && (
        <fieldset>
          <legend>{t("fields.fotografia.rigurosaDigitalLegend")}</legend>

          <label>
            {t("fields.fotografia.formatoArchivoMaestroLabel")} <HelpIcon fieldKey="formato_archivo_maestro" />
            <input
              type="text"
              value={value.formatoArchivoMaestro}
              onChange={(e) => onChange({ ...value, formatoArchivoMaestro: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.espacioColorLabel")} <HelpIcon fieldKey="espacio_color" />
            <input
              type="text"
              value={value.espacioColor}
              onChange={(e) => onChange({ ...value, espacioColor: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.condicionesCustodiaArchivoLabel")}{" "}
            <HelpIcon fieldKey="condiciones_custodia_archivo" />
            <textarea
              rows={2}
              value={value.condicionesCustodiaArchivo}
              onChange={(e) => onChange({ ...value, condicionesCustodiaArchivo: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {value.subtipoFotografia === "ProcesosHistoricos" && (
        <fieldset>
          <legend>{t("fields.fotografia.rigurosaHistoricosLegend")}</legend>

          <label>
            {t("fields.fotografia.procesoQuimicoLabel")} <HelpIcon fieldKey="proceso_quimico_historicos" />
            <textarea
              rows={2}
              value={value.procesoQuimicoHistoricos}
              onChange={(e) => onChange({ ...value, procesoQuimicoHistoricos: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.preparacionSoporteLabel")} <HelpIcon fieldKey="preparacion_soporte" />
            <textarea
              rows={2}
              value={value.preparacionSoporte}
              onChange={(e) => onChange({ ...value, preparacionSoporte: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.metalesSalesLabel")} <HelpIcon fieldKey="metales_sales" />
            <input
              type="text"
              value={value.metalesSales}
              onChange={(e) => onChange({ ...value, metalesSales: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.piezaUnicaOMatrizLabel")} <HelpIcon fieldKey="pieza_unica_o_matriz" />
            <select
              value={value.piezaUnicaOMatriz}
              onChange={(e) => onChange({ ...value, piezaUnicaOMatriz: e.target.value as PiezaUnicaOMatriz | "" })}
            >
              <option value="">—</option>
              <option value="PiezaUnica">{t("fields.fotografia.piezaUnicaOMatrizUnica")}</option>
              <option value="DesdeInternegativo">
                {t("fields.fotografia.piezaUnicaOMatrizInternegativo")}
              </option>
            </select>
          </label>
        </fieldset>
      )}

      {value.subtipoFotografia === "Fotolibros" && (
        <fieldset>
          <legend>{t("fields.fotografia.rigurosaFotolibrosLegend")}</legend>

          <label>
            {t("fields.fotografia.estructuraObjetoLabel")} <HelpIcon fieldKey="estructura_objeto" />
            <textarea
              rows={2}
              value={value.estructuraObjeto}
              onChange={(e) => onChange({ ...value, estructuraObjeto: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.contenedorEstucheLabel")} <HelpIcon fieldKey="contenedor_estuche" />
            <input
              type="text"
              value={value.contenedorEstuche}
              onChange={(e) => onChange({ ...value, contenedorEstuche: e.target.value })}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={value.incluyeCopiaColeccionista}
              onChange={(e) => onChange({ ...value, incluyeCopiaColeccionista: e.target.checked })}
            />
            {t("fields.fotografia.incluyeCopiaColeccionistaLabel")}
          </label>

          {value.incluyeCopiaColeccionista && (
            <label>
              {t("fields.fotografia.detalleCopiaColeccionistaLabel")}{" "}
              <HelpIcon fieldKey="detalle_copia_coleccionista" />
              <textarea
                rows={2}
                value={value.detalleCopiaColeccionista}
                onChange={(e) => onChange({ ...value, detalleCopiaColeccionista: e.target.value })}
              />
            </label>
          )}

          <label>
            {t("fields.fotografia.creditosEditorialesLabel")} <HelpIcon fieldKey="creditos_editoriales" />
            <textarea
              rows={2}
              value={value.creditosEditoriales}
              onChange={(e) => onChange({ ...value, creditosEditoriales: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.isbnLabel")} <HelpIcon fieldKey="isbn" />
            <input type="text" value={value.isbn} onChange={(e) => onChange({ ...value, isbn: e.target.value })} />
          </label>

          <label>
            {t("fields.fotografia.colofonLabel")} <HelpIcon fieldKey="colofon" />
            <textarea
              rows={3}
              value={value.colofon}
              onChange={(e) => onChange({ ...value, colofon: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {value.subtipoFotografia === "Sintografia" && (
        <fieldset>
          <legend>{t("fields.fotografia.rigurosaSintografiaLegend")}</legend>

          <label>
            {t("fields.fotografia.motorIaLabel")} <HelpIcon fieldKey="motor_ia" />
            <input
              type="text"
              value={value.motorIa}
              onChange={(e) => onChange({ ...value, motorIa: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.promptParametrosLabel")} <HelpIcon fieldKey="prompt_parametros" />
            <textarea
              rows={3}
              value={value.promptParametros}
              onChange={(e) => onChange({ ...value, promptParametros: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.flujoGenerativoLabel")} <HelpIcon fieldKey="flujo_generativo" />
            <select
              value={value.flujoGenerativo}
              onChange={(e) => onChange({ ...value, flujoGenerativo: e.target.value as FlujoGenerativo | "" })}
            >
              <option value="">—</option>
              <option value="TextToImage">{t("fields.fotografia.flujoGenerativoTextToImage")}</option>
              <option value="ImageToImage">{t("fields.fotografia.flujoGenerativoImageToImage")}</option>
              <option value="ControlNet">{t("fields.fotografia.flujoGenerativoControlNet")}</option>
            </select>
          </label>

          <label>
            {t("fields.fotografia.intervencionPostproduccionLabel")}{" "}
            <HelpIcon fieldKey="intervencion_postproduccion" />
            <textarea
              rows={2}
              value={value.intervencionPostproduccion}
              onChange={(e) => onChange({ ...value, intervencionPostproduccion: e.target.value })}
            />
          </label>

          <label>
            {t("fields.fotografia.soporteSalidaLabel")} <HelpIcon fieldKey="soporte_salida" />
            <select
              value={value.soporteSalida}
              onChange={(e) => onChange({ ...value, soporteSalida: e.target.value as SoporteSalida | "" })}
            >
              <option value="">—</option>
              <option value="EstampaFisica">{t("fields.fotografia.soporteSalidaEstampaFisica")}</option>
              <option value="ActivoDigitalNativo">
                {t("fields.fotografia.soporteSalidaActivoDigitalNativo")}
              </option>
            </select>
          </label>

          <label>
            {t("fields.fotografia.declaracionDerechosIaLabel")} <HelpIcon fieldKey="declaracion_derechos_ia" />
            <textarea
              rows={2}
              value={value.declaracionDerechosIa}
              onChange={(e) => onChange({ ...value, declaracionDerechosIa: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {mostrarSoftwareEdicion &&
        (value.subtipoFotografia === "DigitalFineArt" || value.subtipoFotografia === "Sintografia") && (
        <label>
          {t("fields.fotografia.softwareEdicion")}
          <input
            type="text"
            value={value.softwareEdicion}
            onChange={(e) => onChange({ ...value, softwareEdicion: e.target.value })}
          />
        </label>
      )}

      {value.subtipoFotografia === "Sintografia" && (
        <p className="field-note">{t("fields.fotografia.notaSintografia")}</p>
      )}

      {mostrarEsSeriada && (
        <label>
          <input
            type="checkbox"
            checked={value.esSeriada === true}
            onChange={(e) => onChange({ ...value, esSeriada: e.target.checked })}
          />
          {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
        </label>
      )}
    </fieldset>
  );
}

import type { SubtipoFotografia } from "@registro/core";
import { HelpIcon } from "../../components/HelpIcon.js";
import { FilePathField } from "../../components/FilePathField.js";
import { todayISO } from "../../utils/today.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

export interface FotografiaFieldsState {
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura: string;
  fechaEdicion: string;
  softwareEdicion: string;
  dimensiones: string;
  tecnica: string;
  escalaPorTamanos: string;
  esSeriada: boolean;
}

export const initialFotografiaFieldsState: FotografiaFieldsState = {
  subtipoFotografia: "DigitalFineArt",
  fechaCaptura: todayISO(),
  fechaEdicion: todayISO(),
  softwareEdicion: "",
  dimensiones: "",
  tecnica: "",
  escalaPorTamanos: "",
  esSeriada: false,
};

export function FotografiaFields({
  value,
  onChange,
  mostrarSoftwareEdicion = true,
  mostrarEsSeriada = true,
  ubicacion,
  onUbicacionChange,
  mostrarUbicacion = false,
}: {
  value: FotografiaFieldsState;
  onChange: (next: FotografiaFieldsState) => void;
  mostrarSoftwareEdicion?: boolean;
  mostrarEsSeriada?: boolean;
  ubicacion?: string;
  onUbicacionChange?: (next: string) => void;
  mostrarUbicacion?: boolean;
}) {
  const { t } = useLanguage();

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

      {mostrarUbicacion &&
        (value.subtipoFotografia === "DigitalFineArt" || value.subtipoFotografia === "Sintografia" ? (
          <label>
            {t("obraForm.ubicacionArchivoLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
            <FilePathField value={ubicacion ?? ""} onChange={(next) => onUbicacionChange?.(next)} />
          </label>
        ) : (
          <label>
            {t("obraForm.ubicacionNegativoLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
            <input type="text" value={ubicacion ?? ""} onChange={(e) => onUbicacionChange?.(e.target.value)} />
          </label>
        ))}

      <label>
        {value.subtipoFotografia === "Sintografia" ? t("field.fechaCreacion") : t("fields.fotografia.fechaCaptura")}
        <input
          type="date"
          value={value.fechaCaptura}
          onChange={(e) => onChange({ ...value, fechaCaptura: e.target.value })}
        />
      </label>

      <label>
        {t("fields.fotografia.fechaEdicion")}
        <input
          type="date"
          value={value.fechaEdicion}
          onChange={(e) => onChange({ ...value, fechaEdicion: e.target.value })}
        />
      </label>

      <label>
        {t("fields.fotografia.dimensiones")} <HelpIcon fieldKey="dimensiones_fotografia" />
        <input
          type="text"
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

      {mostrarSoftwareEdicion && value.subtipoFotografia === "DigitalFineArt" && (
        <p className="field-note">
          {t("fields.fotografia.exifNotaPre")} <HelpIcon fieldKey="datos_exif" /> {t("fields.fotografia.exifNotaPost")}
        </p>
      )}

      {value.subtipoFotografia === "Sintografia" && (
        <p className="field-note">{t("fields.fotografia.notaSintografia")}</p>
      )}

      {mostrarEsSeriada && (
        <label>
          <input
            type="checkbox"
            checked={value.esSeriada}
            onChange={(e) => onChange({ ...value, esSeriada: e.target.checked })}
          />
          {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
        </label>
      )}
    </fieldset>
  );
}

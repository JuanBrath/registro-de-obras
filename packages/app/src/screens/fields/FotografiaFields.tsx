import type { SubtipoFotografia } from "@registro/core";
import { HelpIcon } from "../../components/HelpIcon.js";
import { todayISO } from "../../utils/today.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

export interface FotografiaFieldsState {
  subtipoFotografia: SubtipoFotografia;
  fechaCaptura: string;
  fechaEdicion: string;
  softwareEdicion: string;
  dimensiones: string;
  tecnica: string;
  esSeriada: boolean;
}

export const initialFotografiaFieldsState: FotografiaFieldsState = {
  subtipoFotografia: "Digital",
  fechaCaptura: todayISO(),
  fechaEdicion: todayISO(),
  softwareEdicion: "",
  dimensiones: "",
  tecnica: "",
  esSeriada: false,
};

export function FotografiaFields({
  value,
  onChange,
  mostrarSoftwareEdicion = true,
}: {
  value: FotografiaFieldsState;
  onChange: (next: FotografiaFieldsState) => void;
  mostrarSoftwareEdicion?: boolean;
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
          <option value="Analogica">{t("fields.fotografia.subtipoAnalogica")}</option>
          <option value="Digital">{t("fields.fotografia.subtipoDigital")}</option>
          <option value="Sintografia">{t("fields.fotografia.subtipoSintografia")}</option>
        </select>
      </label>

      <label>
        {t("fields.fotografia.fechaCaptura")}
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
        {t("field.tecnica")} <HelpIcon fieldKey="tecnica_fotografia" />
        <input
          type="text"
          value={value.tecnica}
          onChange={(e) => onChange({ ...value, tecnica: e.target.value })}
        />
      </label>

      {mostrarSoftwareEdicion && (
        <label>
          {t("fields.fotografia.softwareEdicion")}
          <input
            type="text"
            value={value.softwareEdicion}
            onChange={(e) => onChange({ ...value, softwareEdicion: e.target.value })}
          />
        </label>
      )}

      {mostrarSoftwareEdicion && value.subtipoFotografia === "Digital" && (
        <p className="field-note">
          {t("fields.fotografia.exifNotaPre")} <HelpIcon fieldKey="datos_exif" /> {t("fields.fotografia.exifNotaPost")}
        </p>
      )}

      {value.subtipoFotografia === "Sintografia" && (
        <p className="field-note">{t("fields.fotografia.notaSintografia")}</p>
      )}

      <label>
        <input
          type="checkbox"
          checked={value.esSeriada}
          onChange={(e) => onChange({ ...value, esSeriada: e.target.checked })}
        />
        {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
      </label>
    </fieldset>
  );
}

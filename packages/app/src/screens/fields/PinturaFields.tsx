import { derivarEsSeriadaPintura, type SubtipoPintura } from "@registro/core";
import { HelpIcon } from "../../components/HelpIcon.js";
import { todayISO } from "../../utils/today.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

export interface PinturaFieldsState {
  subtipoPintura: SubtipoPintura;
  tecnica: string;
  dimensiones: string;
  peso: string;
  fechaCreacion: string;
}

export const initialPinturaFieldsState: PinturaFieldsState = {
  subtipoPintura: "Original",
  tecnica: "",
  dimensiones: "",
  peso: "",
  fechaCreacion: todayISO(),
};

export function PinturaFields({
  value,
  onChange,
}: {
  value: PinturaFieldsState;
  onChange: (next: PinturaFieldsState) => void;
}) {
  const { t } = useLanguage();
  const esSeriada = derivarEsSeriadaPintura(value.subtipoPintura);

  return (
    <fieldset>
      <legend>{t("fields.pintura.legend")}</legend>

      <label>
        {t("field.subtipo")} <HelpIcon fieldKey="subtipo_pintura" />
        <select
          value={value.subtipoPintura}
          onChange={(e) => onChange({ ...value, subtipoPintura: e.target.value as SubtipoPintura })}
        >
          <option value="Original">{t("fields.pintura.subtipoOriginal")}</option>
          <option value="Serigrafia">{t("fields.pintura.subtipoSerigrafia")}</option>
          <option value="Litografia">{t("fields.pintura.subtipoLitografia")}</option>
          <option value="Grabado">{t("fields.pintura.subtipoGrabado")}</option>
        </select>
      </label>

      <label>
        {t("field.tecnica")} <HelpIcon fieldKey="tecnica" />
        <input type="text" value={value.tecnica} onChange={(e) => onChange({ ...value, tecnica: e.target.value })} />
      </label>

      <label>
        {t("field.dimensiones")}
        <input
          type="text"
          value={value.dimensiones}
          onChange={(e) => onChange({ ...value, dimensiones: e.target.value })}
        />
      </label>

      <label>
        {t("field.peso")}
        <input type="text" value={value.peso} onChange={(e) => onChange({ ...value, peso: e.target.value })} />
      </label>

      <label>
        {t("field.fechaCreacion")}
        <input
          type="date"
          value={value.fechaCreacion}
          onChange={(e) => onChange({ ...value, fechaCreacion: e.target.value })}
        />
      </label>

      <p className="field-note">
        {t("fields.pintura.esSeriadaPrefix")} <strong>{esSeriada ? t("common.yes") : t("common.no")}</strong>{" "}
        {t("fields.pintura.esSeriadaSuffix")} <HelpIcon fieldKey="es_seriada" />
      </p>
    </fieldset>
  );
}

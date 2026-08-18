import { HelpIcon } from "../../components/HelpIcon.js";
import { todayISO } from "../../utils/today.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

export interface EsculturaFieldsState {
  tecnica: string;
  dimensiones: string;
  peso: string;
  fechaCreacion: string;
  esSeriada: boolean;
}

export const initialEsculturaFieldsState: EsculturaFieldsState = {
  tecnica: "",
  dimensiones: "",
  peso: "",
  fechaCreacion: todayISO(),
  esSeriada: false,
};

export function EsculturaFields({
  value,
  onChange,
}: {
  value: EsculturaFieldsState;
  onChange: (next: EsculturaFieldsState) => void;
}) {
  const { t } = useLanguage();

  return (
    <fieldset>
      <legend>{t("fields.escultura.legend")}</legend>

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

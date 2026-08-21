import { useLanguage } from "../i18n/LanguageContext.js";
import { openExternalUrl } from "../utils/openExternalUrl.js";

export function LinkField({
  value,
  onChange,
  buildUrl,
  type = "text",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  buildUrl: (value: string) => string;
  type?: "text" | "email";
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const trimmed = value.trim();

  return (
    <div className="link-field-row">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {trimmed && (
        <button
          type="button"
          className="link-icon-button"
          onClick={() => openExternalUrl(buildUrl(trimmed))}
          aria-label={t("common.abrirEnlace")}
          title={t("common.abrirEnlace")}
        >
          🔗
        </button>
      )}
    </div>
  );
}

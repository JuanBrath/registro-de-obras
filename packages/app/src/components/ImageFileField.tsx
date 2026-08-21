import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { limitImageResolution } from "../utils/limitImageResolution.js";

// <input type="file"> renders a native OS/browser button ("Choose File" /
// "Elegir archivo") whose text follows the system locale, not the language
// picked in Configuracion. This hides that native control and drives it
// through our own translated button instead.
export function ImageFileField({
  value,
  onChange,
  disabled = false,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (value === null && inputRef.current) inputRef.current.value = "";
  }, [value]);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null;
    if (!raw) {
      onChange(null);
      return;
    }
    setProcesando(true);
    try {
      onChange(await limitImageResolution(raw));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="image-file-field">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="image-file-field-input"
        onChange={handleChange}
      />
      <span className="image-file-field-name">
        {procesando ? t("common.loading") : value ? value.name : t("imageFileField.ningunoSeleccionado")}
      </span>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={procesando || disabled}>
        {t("imageFileField.elegirImagen")}
      </button>
    </div>
  );
}

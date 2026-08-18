import { useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";

export function HelpIcon({ fieldKey }: { fieldKey: string }) {
  const { helpTexts } = useWorkspace();
  const { idioma, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const text = helpTexts[fieldKey];

  if (!text) return null;
  const shown = idioma === "en" ? text.en ?? text.es : text.es;
  const lineas = shown.split("\n").filter((linea) => linea.trim().length > 0);
  const esMultilinea = lineas.length > 1;

  return (
    <span className="help-icon-wrapper">
      <button
        type="button"
        className="help-icon"
        aria-label={t("helpIcon.ayuda")}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open && (
        <span className={`help-icon-tooltip${esMultilinea ? " help-icon-tooltip-wide" : ""}`}>
          {esMultilinea
            ? lineas.map((linea, i) => {
                const separador = linea.indexOf(": ");
                return (
                  <span key={i} className="help-icon-linea">
                    {separador === -1 ? (
                      linea
                    ) : (
                      <>
                        <strong>{linea.slice(0, separador + 1)}</strong>
                        {linea.slice(separador + 1)}
                      </>
                    )}
                  </span>
                );
              })
            : shown}
        </span>
      )}
    </span>
  );
}

import type { ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";

export function Modal({
  children,
  onClose,
  wide,
  className,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-content${wide ? " modal-content-wide" : ""}${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

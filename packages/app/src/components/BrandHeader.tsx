import type { EdicionId } from "@registro/core";
import gsMonograma from "../assets/brand/gs-monograma.png";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";

const SUFFIX_KEY: Record<EdicionId, TranslationKey> = {
  personal: "brand.suffixStudio",
  galeria: "brand.suffixSpace",
  personal_galeria: "brand.suffixSuite",
};

export function BrandHeader({
  size = "navbar",
  className,
}: {
  size?: "navbar" | "splash";
  className?: string;
}) {
  const { close } = useWorkspace();
  const { edicion } = useEdicion();
  const { t } = useLanguage();

  // El logo siempre vuelve a la selección de módulo (Personal/Galería), no
  // solo al home del módulo actual: cerrar el workspace es un no-op seguro
  // si ya estamos en el picker (sin workspace abierto).
  return (
    <button
      type="button"
      className={`brand-header brand-header-${size}${className ? ` ${className}` : ""}`}
      onClick={() => void close()}
      aria-label={t("brand.irAInicio")}
    >
      <img src={gsMonograma} alt="" className="brand-header-icon" />
      <span className="brand-header-text">
        Galeris
        {edicion && <span className="brand-header-suffix">{t(SUFFIX_KEY[edicion])}</span>}
      </span>
    </button>
  );
}

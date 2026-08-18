import type { EdicionId } from "@registro/core";
import gsMonograma from "../assets/brand/gs-monograma.png";
import { useNavigation } from "../state/NavigationContext.js";
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
  const { goHome } = useNavigation();
  const { edicion } = useEdicion();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      className={`brand-header brand-header-${size}${className ? ` ${className}` : ""}`}
      onClick={goHome}
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

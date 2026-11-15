import { Modal } from "./Modal.js";
import { useLanguage } from "../i18n/LanguageContext.js";

/** Explica el significado del nombre Recer (se abre al tocar el nombre en la pantalla de inicio). */
export function PorQueRecerModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <Modal onClose={onClose}>
      <h2>{t("porQueRecer.titulo")}</h2>
      {/* El texto viene de i18n (contenido propio, con <i> solo para las palabras en catalan). */}
      <p className="por-que-recer-texto" dangerouslySetInnerHTML={{ __html: t("porQueRecer.texto") }} />
    </Modal>
  );
}

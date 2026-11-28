import { useLanguage } from "../i18n/LanguageContext.js";
import { abrirEnPhotoshop } from "../utils/photoshop.js";
import { pedirAbrirEnLightroom } from "../lightroom/lightroom.js";
import type { ObraRow } from "./ObraVista.js";

export interface EditoresActivos {
  lightroom: boolean;
  photoshop: boolean;
}

/**
 * Accesos directos sobre la miniatura (aparecen al pasar el cursor): "LrC" en el ángulo izquierdo y "Ps" en el derecho,
 * según los botones habilitados en Obras. Va dentro de un contenedor con la clase "con-accesos". Las obras sin archivo
 * original cargado no los muestran, porque no hay nada que abrir.
 */
export function AccesosEditores({ obra, activos, onError }: { obra: ObraRow; activos: EditoresActivos; onError: (mensaje: string) => void }) {
  const { t } = useLanguage();
  const ruta = obra.ubicacion_fisica_actual;
  if (!ruta || (!activos.lightroom && !activos.photoshop)) return null;

  const boton = (clase: string, texto: string, nombre: string, abrir: () => Promise<unknown>, mensajeError: string) => (
    <button
      type="button"
      className={`link-icon-button ${clase}`}
      aria-label={`${nombre}: ${obra.titulo}`}
      title={nombre}
      onClick={(e) => {
        // El clic no debe además abrir la ficha ni ampliar la foto.
        e.stopPropagation();
        abrir().catch(() => onError(mensajeError));
      }}
    >
      {texto}
    </button>
  );

  return (
    <span className="accesos-editores">
      {activos.lightroom &&
        boton(
          "link-icon-button-lightroom acceso-izquierdo",
          "LrC",
          t("obraDetail.abrirEnLightroom"),
          () => pedirAbrirEnLightroom(ruta),
          t("filePathField.errorNoSePudoAbrir"),
        )}
      {activos.photoshop &&
        boton(
          "link-icon-button-photoshop acceso-derecho",
          "Ps",
          t("obraDetail.abrirEnPhotoshop"),
          () => abrirEnPhotoshop(ruta),
          t("obraDetail.errorAbrirPhotoshop"),
        )}
    </span>
  );
}

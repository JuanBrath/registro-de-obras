import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { EVENTO_MODAL_ABIERTO } from "../utils/modalAbiertoEvent.js";

export interface PasoRecorrido {
  /** Selector CSS del boton a senalar (p.ej. '[data-recorrido="obras"]'). Si es null, el paso se
   * muestra centrado, sin senalar nada — para la bienvenida y el cierre. */
  targetSelector: string | null;
  titulo: string;
  texto: string;
}

const MARGEN_RECUADRO_PX = 8;
const SEPARACION_TARJETA_PX = 16;
const MARGEN_BORDE_VENTANA_PX = 16;
const ANCHO_TARJETA_PX = 320;
const ALTO_TARJETA_ESTIMADO_PX = 180;

/**
 * Recorrido guiado de bienvenida: una tarjeta de texto que va senalando, paso a paso, los
 * botones mas importantes de la pantalla de inicio (ver WorkspaceHome.tsx). El boton senalado se
 * recorta de un fondo oscuro con el truco de box-shadow (ver .recorrido-recuadro en App.css): no
 * hace falta una capa de fondo aparte. Se cierra con "Saltar", "Entendido" al final, o Escape —
 * las tres formas avisan por igual a `onCerrar` (quien decide si guardar "ya visto").
 */
export function RecorridoInicial({ pasos, onCerrar }: { pasos: PasoRecorrido[]; onCerrar: () => void }) {
  const { t } = useLanguage();
  const [indice, setIndice] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEscapeToDismiss(true, onCerrar);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event(EVENTO_MODAL_ABIERTO));
  }, []);

  const paso = pasos[indice];

  // Se recalcula solo al cambiar de paso: esta pantalla no tiene contenido que se mueva solo
  // mientras el recorrido esta abierto.
  useLayoutEffect(() => {
    if (!paso?.targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(paso.targetSelector);
    // Si el elemento quedó fuera de la ventana (p. ej. una obra más abajo), se lo trae a la vista antes de medirlo.
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    setRect(el ? el.getBoundingClientRect() : null);
  }, [paso]);

  if (!paso) return null;

  const esUltimo = indice === pasos.length - 1;

  let estiloTarjeta: CSSProperties;
  if (rect) {
    const entraAbajo =
      rect.bottom + SEPARACION_TARJETA_PX + ALTO_TARJETA_ESTIMADO_PX <= window.innerHeight - MARGEN_BORDE_VENTANA_PX;
    const top = entraAbajo
      ? rect.bottom + SEPARACION_TARJETA_PX
      : Math.max(MARGEN_BORDE_VENTANA_PX, rect.top - SEPARACION_TARJETA_PX - ALTO_TARJETA_ESTIMADO_PX);
    const left = Math.min(
      Math.max(MARGEN_BORDE_VENTANA_PX, rect.left),
      window.innerWidth - MARGEN_BORDE_VENTANA_PX - ANCHO_TARJETA_PX,
    );
    estiloTarjeta = { top, left, width: ANCHO_TARJETA_PX };
  } else {
    estiloTarjeta = { top: "50%", left: "50%", width: ANCHO_TARJETA_PX, transform: "translate(-50%, -50%)" };
  }

  return createPortal(
    <div className="recorrido-fondo">
      {rect ? (
        <div
          className="recorrido-recuadro"
          style={{
            top: rect.top - MARGEN_RECUADRO_PX,
            left: rect.left - MARGEN_RECUADRO_PX,
            width: rect.width + MARGEN_RECUADRO_PX * 2,
            height: rect.height + MARGEN_RECUADRO_PX * 2,
          }}
        />
      ) : (
        // Pasos centrados (bienvenida/cierre): no hay ningun boton que
        // recortar del truco de box-shadow de .recorrido-recuadro, asi que
        // el fondo oscuro lo pone este div comun, sin recorte.
        <div className="recorrido-fondo-completo" />
      )}
      <div className="recorrido-tarjeta" style={estiloTarjeta}>
        <p className="recorrido-contador">{t("recorridoInicial.pasoContador", { n: indice + 1, total: pasos.length })}</p>
        <h2>{paso.titulo}</h2>
        <p>{paso.texto}</p>
        <div className="recorrido-acciones">
          <button type="button" className="recorrido-saltar" onClick={onCerrar}>
            {t("recorridoInicial.saltar")}
          </button>
          <div className="recorrido-acciones-navegacion">
            {indice > 0 && (
              <button type="button" onClick={() => setIndice((i) => i - 1)}>
                {t("recorridoInicial.atras")}
              </button>
            )}
            <button type="button" onClick={() => (esUltimo ? onCerrar() : setIndice((i) => i + 1))}>
              {esUltimo ? t("recorridoInicial.entendido") : t("recorridoInicial.siguiente")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

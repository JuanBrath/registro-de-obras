import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
  const tarjetaRef = useRef<HTMLDivElement | null>(null);
  const [altoTarjeta, setAltoTarjeta] = useState(ALTO_TARJETA_ESTIMADO_PX);

  // Mientras el recorrido está abierto no se puede desplazar la pantalla de fondo: si se moviera, el recuadro
  // y la tarjeta quedarían en una posición que ya no corresponde con lo que explican.
  useEffect(() => {
    const frenar = (e: Event) => e.preventDefault();
    const frenarTeclas = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    // Sin barra de scroll (que se pudiera arrastrar): el desplazamiento lo hace solo el recorrido. La reserva de
    // espacio de la barra evita que el contenido "salte" de ancho al ocultarla.
    const html = document.documentElement;
    const previo = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    window.addEventListener("wheel", frenar, { passive: false });
    window.addEventListener("touchmove", frenar, { passive: false });
    window.addEventListener("keydown", frenarTeclas);
    return () => {
      window.removeEventListener("wheel", frenar);
      window.removeEventListener("touchmove", frenar);
      window.removeEventListener("keydown", frenarTeclas);
      html.style.overflow = previo.overflow;
      html.style.scrollbarGutter = previo.gutter;
    };
  }, []);

  useLayoutEffect(() => {
    window.dispatchEvent(new Event(EVENTO_MODAL_ABIERTO));
  }, []);

  const paso = pasos[indice];

  // Al cambiar de paso la pantalla se desplaza sola (hacia arriba o hacia abajo) para dejar a la vista, y centrado,
  // lo que se está explicando. Mientras dura ese desplazamiento el recuadro y la tarjeta acompañan al elemento.
  useLayoutEffect(() => {
    if (!paso?.targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(paso.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });

    const medir = () => setRect(el.getBoundingClientRect());
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    // Respaldo: sigue midiendo un rato por si el desplazamiento no dispara eventos de scroll.
    let cuadro = 0;
    const inicio = performance.now();
    const seguir = () => {
      medir();
      if (performance.now() - inicio < 900) cuadro = requestAnimationFrame(seguir);
    };
    cuadro = requestAnimationFrame(seguir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
      cancelAnimationFrame(cuadro);
    };
  }, [paso]);

  // Alto real de la tarjeta (varía con el largo del texto) para ubicarla sin salirse de la pantalla.
  useLayoutEffect(() => {
    if (tarjetaRef.current) setAltoTarjeta(tarjetaRef.current.offsetHeight);
  }, [paso, rect]);

  if (!paso) return null;

  const esUltimo = indice === pasos.length - 1;

  let estiloTarjeta: CSSProperties;
  if (rect) {
    // clientWidth/clientHeight excluyen la barra de desplazamiento (innerWidth la cuenta y la tarjeta quedaba tapada).
    const ancho = document.documentElement.clientWidth;
    const alto = document.documentElement.clientHeight;
    const m = MARGEN_BORDE_VENTANA_PX;
    const sep = SEPARACION_TARJETA_PX;
    const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
    const leftAlineado = limitar(rect.left, m, ancho - m - ANCHO_TARJETA_PX);
    const topAlineado = limitar(rect.top, m, alto - m - altoTarjeta);
    // Se prueba, en orden, abajo, arriba, a la derecha y a la izquierda del elemento señalado; la primera que
    // entre entera en la pantalla (sin tapar lo que se explica) es la que se usa.
    const candidatas = [
      { top: rect.bottom + sep, left: leftAlineado, entra: rect.bottom + sep + altoTarjeta <= alto - m },
      { top: rect.top - sep - altoTarjeta, left: leftAlineado, entra: rect.top - sep - altoTarjeta >= m },
      { top: topAlineado, left: rect.right + sep, entra: rect.right + sep + ANCHO_TARJETA_PX <= ancho - m },
      { top: topAlineado, left: rect.left - sep - ANCHO_TARJETA_PX, entra: rect.left - sep - ANCHO_TARJETA_PX >= m },
    ];
    const elegida = candidatas.find((c) => c.entra);
    if (elegida) {
      estiloTarjeta = { top: elegida.top, left: elegida.left, width: ANCHO_TARJETA_PX };
    } else {
      // Elemento muy grande (ocupa casi toda la pantalla): la tarjeta se acomoda en la mitad opuesta a su centro,
      // para tapar lo menos posible de lo que se explica.
      const centroY = rect.top + rect.height / 2;
      const top = centroY < alto / 2 ? alto - m - altoTarjeta : m;
      estiloTarjeta = { top, left: leftAlineado, width: ANCHO_TARJETA_PX };
    }
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
      <div className="recorrido-tarjeta" ref={tarjetaRef} style={estiloTarjeta}>
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

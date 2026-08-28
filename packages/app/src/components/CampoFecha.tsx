import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";

function fechaIsoATexto(fechaIso: string): string {
  const m = fechaIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function textoAFechaIso(texto: string): string {
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function enmascararFecha(bruto: string): string {
  const digitos = bruto.replace(/\D/g, "").slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean).join("/");
}

export interface CampoFechaHandle {
  /** Abre el selector de fecha nativo para elegirla con el calendario, en vez de escribirla. */
  abrirCalendario: () => void;
}

/**
 * Boton de calendario para ubicar junto al titulo del campo (no junto al
 * input, que puede estar en otra fila): llama a `abrirCalendario` del
 * `CampoFecha` correspondiente via su ref.
 */
export function BotonCalendario({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className="campo-fecha-calendario"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("campoFecha.abrirCalendario")}
      title={t("campoFecha.abrirCalendario")}
    >
      📅
    </button>
  );
}

/**
 * Input de fecha en formato DD/MM/AAAA (el que usa el resto de la app), en
 * vez de un input type="date" nativo: en Safari/WKWebView (la app de
 * escritorio en Mac) un input type="date" vacio muestra la fecha de hoy en
 * gris como si fuera un valor real, lo cual confunde. Con un input de texto
 * simple, vacio se ve realmente vacio (solo el formato de ejemplo).
 *
 * Para elegir la fecha con el calendario (boton expuesto via `abrirCalendario`
 * por ref) se mantiene, SIEMPRE MONTADO pero visualmente oculto, un segundo
 * input type="date" real: `abrirCalendario` le hace foco y llama a
 * `showPicker()` de forma sincronica, dentro del click del boton, sin pasar
 * por un cambio de estado ni un useEffect posterior. Esto importa: en la app
 * de escritorio, invocar showPicker() fuera del gesto directo del usuario
 * (por ejemplo, un useEffect que corre despues de un setState) puede fallar
 * de forma rara y terminaba, en la practica, sacando al usuario de la
 * pantalla en la que estaba trabajando. El mismo criterio (input siempre
 * presente + accion directa en el click) ya se usa en ImageFileField para
 * el input type="file".
 */
export const CampoFecha = forwardRef<
  CampoFechaHandle,
  { valorIso: string; onChangeIso: (iso: string) => void; disabled?: boolean; required?: boolean }
>(function CampoFecha({ valorIso, onChangeIso, disabled, required }, ref) {
  const [texto, setTexto] = useState(() => fechaIsoATexto(valorIso));
  const nativoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTexto(fechaIsoATexto(valorIso));
  }, [valorIso]);

  useImperativeHandle(ref, () => ({
    abrirCalendario: () => {
      const input = nativoRef.current;
      if (!input) return;
      input.focus();
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
        } catch {
          // Algunos navegadores exigen un click directo sobre el input; ya
          // quedo enfocado para poder abrirlo asi si showPicker() no alcanza.
        }
      }
    },
  }));

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        value={texto}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          const enmascarado = enmascararFecha(e.target.value);
          setTexto(enmascarado);
          onChangeIso(textoAFechaIso(enmascarado));
        }}
      />
      <input
        ref={nativoRef}
        type="date"
        className="campo-fecha-nativo-oculto"
        tabIndex={-1}
        aria-hidden="true"
        value={valorIso}
        disabled={disabled}
        onChange={(e) => onChangeIso(e.target.value)}
      />
    </>
  );
});

import { useEffect, useRef, useState } from "react";
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

/**
 * Boton de calendario para ubicar junto al titulo del campo (no junto al
 * input, que puede estar en otra fila). Lleva su propio input type="date"
 * (siempre montado, invisible, superpuesto exactamente sobre el boton): al
 * hacer click le hace foco y llama a showPicker() de forma sincronica,
 * dentro del mismo gesto del usuario (fuera de un gesto directo, showPicker
 * puede fallar de forma rara en la app de escritorio). Como el input oculto
 * vive pegado al icono -y no al campo de texto, que puede ocupar toda la
 * fila del formulario-, el navegador despliega el calendario nativo junto
 * al icono en vez de lejos, del otro lado del campo.
 */
export function BotonCalendario({
  valorIso,
  onChangeIso,
  disabled,
}: {
  valorIso: string;
  onChangeIso: (iso: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const nativoRef = useRef<HTMLInputElement>(null);

  function abrirCalendario() {
    const input = nativoRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // El input ya quedo enfocado para abrirlo con un click si showPicker() no alcanza.
      }
    }
  }

  return (
    <span className="campo-fecha-calendario">
      <button
        type="button"
        onClick={abrirCalendario}
        disabled={disabled}
        aria-label={t("campoFecha.abrirCalendario")}
        title={t("campoFecha.abrirCalendario")}
      >
        📅
      </button>
      <input
        ref={nativoRef}
        type="date"
        className="campo-fecha-nativo-oculto"
        tabIndex={-1}
        aria-hidden="true"
        value={valorIso}
        disabled={disabled}
        onChange={(e) => onChangeIso(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            // Cancelar sin aplicar ningun cambio: se restaura el valor
            // controlado (por si el selector nativo llego a tocar el value
            // al navegar sin confirmar) y se le saca el foco para cerrarlo.
            e.currentTarget.value = valorIso;
            e.currentTarget.blur();
          }
        }}
      />
    </span>
  );
}

/**
 * Input de fecha en formato DD/MM/AAAA (el que usa el resto de la app), en
 * vez de un input type="date" nativo: en Safari/WKWebView (la app de
 * escritorio en Mac) un input type="date" vacio muestra la fecha de hoy en
 * gris como si fuera un valor real, lo cual confunde. Con un input de texto
 * simple, vacio se ve realmente vacio (solo el formato de ejemplo). Elegir
 * la fecha con el calendario nativo se resuelve aparte, en `BotonCalendario`.
 */
export function CampoFecha({
  valorIso,
  onChangeIso,
  disabled,
  required,
}: {
  valorIso: string;
  onChangeIso: (iso: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [texto, setTexto] = useState(() => fechaIsoATexto(valorIso));

  useEffect(() => {
    setTexto(fechaIsoATexto(valorIso));
  }, [valorIso]);

  return (
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
  );
}

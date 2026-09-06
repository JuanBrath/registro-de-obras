import { useEffect, useRef, useState } from "react";
import { parseTags } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

export function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [allTags, setAllTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const containerRef = useRef<HTMLDivElement>(null);
  // Siempre sincronizado con la prop "value" mas reciente, para que
  // addTag/removeTag jamas calculen el arreglo nuevo a partir de una
  // version vieja aunque se disparen varias veces seguido.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Se combina el registro de etiquetas (tabla "etiqueta", donde queda cada
  // una que se guardo alguna vez en alguna obra) con las etiquetas que ya
  // estan cargadas en alguna obra: asi, una etiqueta que entro por otro
  // camino (por ejemplo, una palabra clave traida automaticamente de los
  // metadatos EXIF de una foto) tambien aparece como sugerencia, en vez de
  // quedar fuera de la lista solo porque nunca se tipeo a mano aca. Solo se
  // lee una vez al abrir la obra: agregar una etiqueta nueva durante esta
  // misma edicion no hace falta que aparezca de inmediato como sugerencia
  // de si misma.
  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    (async () => {
      const [etiquetaRows, obraRows] = await Promise.all([
        context.db.query<{ nombre: string }>("SELECT nombre FROM etiqueta"),
        context.db.query<{ tags: string | null }>("SELECT tags FROM obra WHERE tags IS NOT NULL"),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      for (const row of etiquetaRows) set.add(row.nombre);
      for (const row of obraRows) for (const tag of parseTags(row.tags)) set.add(tag);
      setAllTags(Array.from(set).sort((a, b) => a.localeCompare(b)));
    })().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Cierra las sugerencias al hacer click afuera del componente.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Agregar/quitar una etiqueta es puramente local (solo actualiza el
  // arreglo en memoria vía onChange) — no escribe nada en la base de datos
  // mientras se esta editando. El alta en el registro global de etiquetas
  // (tabla "etiqueta", para que aparezca como sugerencia en otras obras) se
  // hace recien al guardar la obra, junto con el resto de sus datos (ver
  // handleSubmit en ObraForm.tsx / handleSaveObra en ObraDetail.tsx). Antes
  // esa escritura pasaba ACA, en cada tecla, en paralelo a cualquier otra
  // cosa que estuviera pasando en el formulario — sacarla de esta pantalla
  // elimina esa fuente de carreras por completo.
  function addTag(nombreRaw: string) {
    const nombre = nombreRaw.trim();
    setInput("");
    setMostrarSugerencias(false);
    const actual = valueRef.current;
    if (!nombre || actual.includes(nombre)) return;
    const siguiente = [...actual, nombre];
    valueRef.current = siguiente;
    onChange(siguiente);
  }

  function removeTag(tag: string) {
    const siguiente = valueRef.current.filter((t) => t !== tag);
    valueRef.current = siguiente;
    onChange(siguiente);
  }

  const sugerencias = allTags.filter(
    (tag) => !value.includes(tag) && (input === "" || tag.toLowerCase().includes(input.toLowerCase())),
  );

  return (
    <div className="tag-picker" ref={containerRef}>
      {value.length > 0 && (
        <div className="tags-list">
          {value.map((tag) => (
            <span key={tag} className="tag-chip tag-chip-removable">
              {tag}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => removeTag(tag)}
                aria-label={t("tagPicker.quitarEtiqueta", { tag })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="tag-picker-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setMostrarSugerencias(true)}
          onClick={() => setMostrarSugerencias(true)}
          placeholder={t("tagPicker.placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              addTag(input);
            }
            if (e.key === "Escape" && mostrarSugerencias) {
              e.preventDefault();
              e.stopPropagation();
              setMostrarSugerencias(false);
            }
          }}
        />
        <button type="button" onClick={() => addTag(input)} disabled={!input.trim()}>
          {t("common.add")}
        </button>
      </div>

      {mostrarSugerencias && sugerencias.length > 0 && (
        <ul className="tag-picker-sugerencias">
          {sugerencias.map((tag) => (
            <li key={tag}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(tag)}>
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

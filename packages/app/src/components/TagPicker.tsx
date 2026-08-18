import { useEffect, useId, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

export function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const datalistId = useId();
  const [allTags, setAllTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  async function reload() {
    if (!context) return;
    const rows = await context.db.query<{ nombre: string }>("SELECT nombre FROM etiqueta ORDER BY nombre");
    setAllTags(rows.map((r) => r.nombre));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function addTag(nombreRaw: string) {
    const nombre = nombreRaw.trim();
    if (!nombre || !context || value.includes(nombre)) {
      setInput("");
      return;
    }
    setError(null);
    try {
      if (!allTags.includes(nombre)) {
        await context.db.execute("INSERT OR IGNORE INTO etiqueta (nombre) VALUES (?)", [nombre]);
        await reload();
      }
      onChange([...value, nombre]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleInputChange(nuevoValor: string) {
    setInput(nuevoValor);
    // Elegir una etiqueta del desplegable deja el input con el texto exacto
    // de esa opción — eso alcanza para detectar la selección y asignarla sola.
    if (allTags.includes(nuevoValor) && !value.includes(nuevoValor)) {
      addTag(nuevoValor);
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="tag-picker">
      {value.length > 0 && (
        <div className="tags-list">
          {value.map((tag) => (
            <span key={tag} className="tag-chip tag-chip-removable">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={t("tagPicker.quitarEtiqueta", { tag })}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="tag-picker-input-row">
        <input
          type="text"
          list={datalistId}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={t("tagPicker.placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
        />
        <datalist id={datalistId}>
          {allTags
            .filter((tag) => !value.includes(tag))
            .map((tag) => (
              <option key={tag} value={tag} />
            ))}
        </datalist>
        <button type="button" onClick={() => addTag(input)} disabled={!input.trim()}>
          {t("common.add")}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

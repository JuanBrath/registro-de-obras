import { useEffect, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { createArtista } from "../data/createArtista.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

interface ArtistaOption {
  id: number;
  numero_artista: string | null;
  nombre_completo: string;
}

export function ArtistaSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (artistaId: number) => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [artistas, setArtistas] = useState<ArtistaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  useEscapeToDismiss(lastCreated, setLastCreated);
  const [nextNumero, setNextNumero] = useState<string | null>(null);

  async function reload() {
    if (!context) return;
    setLoading(true);
    try {
      const rows = await context.db.query<ArtistaOption>(
        "SELECT id, numero_artista, nombre_completo FROM artista ORDER BY numero_artista",
      );
      setArtistas(rows);
    } finally {
      setLoading(false);
    }
  }

  async function reloadNextNumero() {
    if (!context) return;
    const rows = await context.db.query<{ siguiente_numero: number }>(
      "SELECT siguiente_numero FROM artista_contador WHERE id = 1",
    );
    setNextNumero(rows.length > 0 ? String(rows[0].siguiente_numero) : null);
  }

  useEffect(() => {
    reload();
    reloadNextNumero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function handleAddArtista() {
    if (!context || !nuevoNombre) return;
    setSubmitting(true);
    setError(null);
    try {
      const { id, numeroArtista } = await createArtista(context.db, { nombreCompleto: nuevoNombre });
      setNuevoNombre("");
      setAddingNew(false);
      setLastCreated(numeroArtista);
      await reload();
      await reloadNextNumero();
      onChange(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="artista-selector-row">
        <select
          required
          value={value ?? ""}
          disabled={loading}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="" disabled>
            {loading ? t("common.loading") : t("artistaSelector.elegir")}
          </option>
          {artistas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero_artista ? `${a.numero_artista} — ${a.nombre_completo}` : a.nombre_completo}
            </option>
          ))}
        </select>

        {!addingNew && (
          <button type="button" onClick={() => setAddingNew(true)}>
            {t("artistaSelector.nuevoArtista")}
          </button>
        )}
      </div>

      {addingNew && (
        <div className="artista-selector-new">
          <label>
            {t("artistaSelector.numeroAsignado")}
            <input type="text" value={nextNumero ?? "…"} disabled readOnly />
          </label>
          <label>
            {t("artistaSelector.nombreCompleto")}
            <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          </label>
          <div className="obra-form-saved-actions">
            <button type="button" onClick={handleAddArtista} disabled={!nuevoNombre || submitting}>
              {submitting ? t("common.adding") : t("common.add")}
            </button>
            <button type="button" onClick={() => setAddingNew(false)} disabled={submitting}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {lastCreated && (
        <p className="success" role="status">
          ✅ {t("artistaSelector.artistaAgregado", { numero: lastCreated })}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

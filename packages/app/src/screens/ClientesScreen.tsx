import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { LinkField } from "../components/LinkField.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { buildMailtoUrl } from "../utils/socialLinks.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";

interface ClienteRow {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cuit: string | null;
  notas: string | null;
}

export interface ClienteFields {
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  notas: string;
}

export function ClientesScreen({ onBack }: { onBack: () => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cuit, setCuit] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEscapeToDismiss(formError, setFormError);
  const [mostrandoAlta, setMostrandoAlta] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setCuit("");
    setNotas("");
    setFormError(null);
  }

  async function reload() {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await context.db.query<ClienteRow>(
        "SELECT id, nombre, email, telefono, cuit, notas FROM cliente ORDER BY nombre",
      );
      setClientes(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await context!.db.execute(`INSERT INTO cliente (nombre, email, telefono, cuit, notas) VALUES (?, ?, ?, ?, ?)`, [
        nombre,
        email || null,
        telefono || null,
        cuit || null,
        notas || null,
      ]);
      resetForm();
      setMostrandoAlta(false);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelarAlta() {
    resetForm();
    setMostrandoAlta(false);
  }

  function handleVolver() {
    if (mostrandoAlta) {
      handleCancelarAlta();
      return;
    }
    if (editingId !== null) {
      setEditingId(null);
      return;
    }
    onBack();
  }

  async function handleDeleteCliente(id: number) {
    if (!context) return;
    await context.db.execute("DELETE FROM cliente WHERE id = ?", [id]);
    await reload();
  }

  async function handleUpdateCliente(id: number, fields: ClienteFields) {
    if (!context) return;
    await context.db.execute(`UPDATE cliente SET nombre = ?, email = ?, telefono = ?, cuit = ?, notas = ? WHERE id = ?`, [
      fields.nombre,
      fields.email || null,
      fields.telefono || null,
      fields.cuit || null,
      fields.notas || null,
      id,
    ]);
    setEditingId(null);
    await reload();
  }

  const filteredClientes = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase();
    if (!busquedaNorm) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(busquedaNorm));
  }, [clientes, busqueda]);

  if (!context) return null;

  return (
    <div>
      <div className="obras-list-header">
        <h1>{t("clientes.title")}</h1>
        <div className="header-actions">
          {!mostrandoAlta && (
            <button type="button" onClick={() => setMostrandoAlta(true)}>
              {t("clientes.nuevoCliente")}
            </button>
          )}
          <button type="button" onClick={handleVolver}>
            {t("common.back")}
          </button>
        </div>
      </div>

      {mostrandoAlta && (
        <form className="obra-form" onSubmit={handleSubmit} onKeyDown={focusNextOnEnter}>
          <h2>{t("clientes.nuevoClienteTitulo")}</h2>

          <label>
            <span className="field-label">{t("clientes.nombreLabel")}</span>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("profile.mail")}</span>
            <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
          </label>

          <label>
            <span className="field-label">{t("artistas.telefono")}</span>
            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("common.cuit")}</span>
            <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("artistas.notas")}</span>
            <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </label>

          <div className="obra-form-saved-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? t("common.saving") : t("clientes.agregarCliente")}
            </button>
            <button type="button" onClick={handleCancelarAlta} disabled={submitting}>
              {t("common.cancel")}
            </button>
          </div>

          {formError && (
            <p className="error" role="alert">
              ⚠️ {t("obraForm.errorNoSePudoGuardar", { error: formError })}
            </p>
          )}
        </form>
      )}

      {!mostrandoAlta && (
        <div className="obras-list">
          <h2>{t("clientes.clientesRegistrados")}</h2>
          {loading && <p>{t("common.loading")}</p>}
          {error && (
            <p className="error" role="alert">
              ⚠️ {error}
            </p>
          )}
          {!loading && clientes.length === 0 && <p>{t("clientes.sinClientes")}</p>}

          {clientes.length > 0 && editingId === null && (
            <input
              type="search"
              className="obras-list-buscador"
              placeholder={t("clientes.buscarPlaceholder")}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          )}

          {!loading && clientes.length > 0 && filteredClientes.length === 0 && <p>{t("artistas.sinResultados")}</p>}

          <div className="artistas-list">
            {filteredClientes
              .filter((c) => editingId === null || c.id === editingId)
              .map((c) => (
                <ClienteRowView
                  key={c.id}
                  cliente={c}
                  editing={editingId === c.id}
                  onStartEdit={() => setEditingId(c.id)}
                  onStopEdit={() => setEditingId(null)}
                  onDelete={() => handleDeleteCliente(c.id)}
                  onSave={(fields) => handleUpdateCliente(c.id, fields)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteRowView({
  cliente,
  editing,
  onStartEdit,
  onStopEdit,
  onDelete,
  onSave,
}: {
  cliente: ClienteRow;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => Promise<void>;
  onSave: (fields: ClienteFields) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [nombre, setNombre] = useState(cliente.nombre);
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [cuit, setCuit] = useState(cliente.cuit ?? "");
  const [notas, setNotas] = useState(cliente.notas ?? "");

  async function handleGuardar() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nombre, email, telefono, cuit, notas });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="ejemplar-row ejemplar-row-editing" onKeyDown={focusNextOnEnter}>
        <label>
          <span className="field-label">{t("clientes.nombreLabel")}</span>
          <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("profile.mail")}</span>
          <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
        </label>
        <label>
          <span className="field-label">{t("artistas.telefono")}</span>
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("common.cuit")}</span>
          <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.notas")}</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        <div className="obra-form-saved-actions">
          <button type="button" onClick={handleGuardar} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
          <button type="button" onClick={onStopEdit} disabled={saving}>
            {t("common.cancel")}
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

  return (
    <div className="ejemplar-row">
      <strong>{cliente.nombre}</strong>
      {cliente.email && (
        <span>
          <a href={`mailto:${cliente.email}`}>{cliente.email}</a>
        </span>
      )}
      {cliente.telefono && (
        <span>
          <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>
        </span>
      )}
      {cliente.cuit && <span>{t("common.cuit")}: {cliente.cuit}</span>}
      {cliente.notas && <span>{cliente.notas}</span>}
      <div className="obra-form-saved-actions">
        <button type="button" onClick={onStartEdit}>
          {t("common.edit")}
        </button>
        <button type="button" onClick={() => setConfirming(true)}>
          {t("common.delete")}
        </button>
      </div>
      {confirming && (
        <div className="confirm-box">
          <p>{t("clientes.confirmarEliminar")}</p>
          <div className="obra-form-saved-actions">
            <button type="button" onClick={handleEliminar} disabled={deleting}>
              {deleting ? t("common.deleting") : t("common.siEliminar")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
              {t("common.no")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

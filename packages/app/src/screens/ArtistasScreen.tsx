import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { artistaFotoPath } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { createArtista } from "../data/createArtista.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { LinkField } from "../components/LinkField.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";
import { drawPdfHeader, writeWrappedText } from "../utils/pdfBranding.js";
import { buildWebUrl, buildInstagramUrl, buildFacebookUrl, buildXUrl, buildMailtoUrl } from "../utils/socialLinks.js";

interface ArtistaRow {
  id: number;
  numero_artista: string | null;
  nombre_completo: string;
  fecha_nacimiento: string | null;
  bio: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  direccion: string | null;
  x: string | null;
  facebook: string | null;
  notas: string | null;
  foto_path: string | null;
}

export interface ArtistaFields {
  nombreCompleto: string;
  fechaNacimiento: string;
  bio: string;
  telefono: string;
  email: string;
  web: string;
  instagram: string;
  direccion: string;
  x: string;
  facebook: string;
  notas: string;
}

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface FichaArtistaFields {
  nombreCompleto: string;
  numeroArtista?: string | null;
  fechaNacimiento: string;
  bio: string;
  telefono: string;
  email: string;
  web: string;
  instagram: string;
  facebook: string;
  x: string;
  direccion: string;
}

// Genera el PDF con la ficha del artista (usado tanto desde el alta como
// desde la edicion de un artista existente, para no duplicar el layout).
async function generarFichaArtistaPdfBytes(t: TFn, fields: FichaArtistaFields, imgBytes: Uint8Array | null) {
  // jsPDF es pesado: se carga recien al generar el PDF (mismo criterio que
  // en PersonalProfileForm/ObraDetail/VentasReport).
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  const startY = await drawPdfHeader(doc, fields.nombreCompleto || t("artistas.title"), { marginLeft });
  const imageBoxSize = 60;
  let textX = marginLeft;

  if (imgBytes) {
    const formato = detectImageFormat(imgBytes);
    if (formato) {
      const blob = new Blob([imgBytes as BlobPart]);
      const bitmap = await createImageBitmap(blob);
      let displayW = imageBoxSize;
      let displayH = imageBoxSize / (bitmap.width / bitmap.height);
      if (displayH > imageBoxSize) {
        displayH = imageBoxSize;
        displayW = imageBoxSize * (bitmap.width / bitmap.height);
      }
      bitmap.close();
      doc.addImage(imgBytes, formato, marginLeft, startY, displayW, displayH);
      textX = marginLeft + imageBoxSize + 8;
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - textX - marginLeft;
  let textY = startY + 5;

  const lineas: string[] = [];
  if (fields.numeroArtista) lineas.push(`${t("artistaSelector.numeroAsignado")}: ${fields.numeroArtista}`);
  if (fields.fechaNacimiento) {
    lineas.push(`${t("artistas.fechaNacimiento")}: ${formatFechaDDMMYYYY(fields.fechaNacimiento)}`);
  }
  if (fields.email) lineas.push(`${t("artistas.email")}: ${fields.email}`);
  if (fields.telefono) lineas.push(`${t("artistas.telefono")}: ${fields.telefono}`);
  if (fields.direccion) lineas.push(`${t("artistas.direccion")}: ${fields.direccion}`);
  if (fields.web) lineas.push(`${t("artistas.web")}: ${fields.web}`);
  if (fields.instagram) lineas.push(`${t("artistas.instagram")}: ${fields.instagram}`);
  if (fields.facebook) lineas.push(`${t("artistas.facebook")}: ${fields.facebook}`);
  if (fields.x) lineas.push(`${t("artistas.x")}: ${fields.x}`);
  for (const linea of lineas) {
    textY = writeWrappedText(doc, linea, textX, textY, textWidth);
  }

  if (fields.bio) {
    textY += 3;
    doc.setFontSize(11);
    textY = writeWrappedText(doc, t("artistas.bio"), textX, textY, textWidth, { lineHeight: 6 });
    doc.setFontSize(10);
    writeWrappedText(doc, fields.bio, textX, textY, textWidth);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export function ArtistasScreen({ onBack }: { onBack: () => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [artistas, setArtistas] = useState<ArtistaRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const objectUrlsRef = useRef<string[]>([]);

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [bio, setBio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [instagram, setInstagram] = useState("");
  const [direccion, setDireccion] = useState("");
  const [x, setX] = useState("");
  const [facebook, setFacebook] = useState("");
  const [notas, setNotas] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEscapeToDismiss(formError, setFormError);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  useEscapeToDismiss(lastCreated, setLastCreated);
  const [nextNumero, setNextNumero] = useState<string | null>(null);
  // Al entrar a Artistas se ve directamente la lista (editar/ver los que ya
  // existen); el formulario de alta es una opcion explicita, no el estado
  // por defecto.
  const [mostrandoAlta, setMostrandoAlta] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(pdfMensaje, setPdfMensaje);
  // Mientras se edita un artista, los demas no se muestran debajo (se ve
  // solo el que esta en edicion, no toda la lista mezclada con el formulario).
  const [editingId, setEditingId] = useState<number | null>(null);
  // Nombre duplicado: bloquea el guardado (con confirmacion explicita para
  // seguir igual) en vez de solo avisar, para que Enter no dispare un
  // guardado silencioso que crea el duplicado y borra lo que se tipeo.
  const [duplicadoBloqueado, setDuplicadoBloqueado] = useState<string | null>(null);
  useEscapeToDismiss(duplicadoBloqueado, setDuplicadoBloqueado);
  const [duplicadoConfirmado, setDuplicadoConfirmado] = useState(false);

  function resetForm() {
    setNombreCompleto("");
    setFechaNacimiento("");
    setBio("");
    setTelefono("");
    setEmail("");
    setWeb("");
    setInstagram("");
    setDireccion("");
    setX("");
    setFacebook("");
    setNotas("");
    setFotoFile(null);
    setFormError(null);
    setPdfMensaje(null);
    setDuplicadoBloqueado(null);
    setDuplicadoConfirmado(false);
  }

  async function reload() {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await context.db.query<ArtistaRow>(
        "SELECT id, numero_artista, nombre_completo, fecha_nacimiento, bio, telefono, email, web, instagram, direccion, x, facebook, notas, foto_path FROM artista ORDER BY numero_artista",
      );
      setArtistas(rows);

      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
      const urls: Record<number, string> = {};
      for (const a of rows) {
        if (!a.foto_path) continue;
        try {
          const bytes = await context.fs.readFile(a.foto_path);
          const url = bytesToObjectUrl(bytes);
          objectUrlsRef.current.push(url);
          urls[a.id] = url;
        } catch {
          // Sin foto disponible; se omite sin romper la lista.
        }
      }
      setThumbnails(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
    return () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function writeFoto(id: number, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = artistaFotoPath(id, ext);
    await context!.fs.writeFile(path, bytes);
    await context!.db.execute(`UPDATE artista SET foto_path = ? WHERE id = ?`, [path, id]);
  }

  async function guardarArtista() {
    setSubmitting(true);
    setFormError(null);
    setLastCreated(null);
    try {
      const { id, numeroArtista } = await createArtista(context!.db, {
        nombreCompleto,
        fechaNacimiento: fechaNacimiento || null,
        bio: bio || null,
        telefono: telefono || null,
        email: email || null,
        web: web || null,
        instagram: instagram || null,
        direccion: direccion || null,
        x: x || null,
        facebook: facebook || null,
        notas: notas || null,
      });

      if (fotoFile) await writeFoto(id, fotoFile);

      resetForm();
      setDuplicadoConfirmado(false);
      setDuplicadoBloqueado(null);
      setLastCreated(numeroArtista);
      await reload();
      await reloadNextNumero();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (nombreDuplicado && !duplicadoConfirmado) {
      setDuplicadoBloqueado(t("artistas.nombreDuplicado"));
      return;
    }
    void guardarArtista();
  }

  function handleConfirmarDuplicado() {
    setDuplicadoConfirmado(true);
    setDuplicadoBloqueado(null);
    void guardarArtista();
  }

  function handleCancelarAlta() {
    resetForm();
    setLastCreated(null);
    setMostrandoAlta(false);
  }

  // "Volver" siempre retrocede un solo paso: si hay un formulario de alta o
  // una edicion abiertos, los cierra primero (vuelve a la lista de
  // Artistas); recien si no hay nada abierto sale de la pantalla.
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

  async function handleGenerarPdf() {
    setGenerandoPdf(true);
    setFormError(null);
    setPdfMensaje(null);
    try {
      const imgBytes = fotoFile ? new Uint8Array(await fotoFile.arrayBuffer()) : null;
      const bytes = await generarFichaArtistaPdfBytes(
        t,
        {
          nombreCompleto,
          numeroArtista: nextNumero,
          fechaNacimiento,
          bio,
          telefono,
          email,
          web,
          instagram,
          facebook,
          x,
          direccion,
        },
        imgBytes,
      );
      const fileName = `artista_${(nombreCompleto || "sin_nombre").trim().replace(/\s+/g, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, fileName);
      if (guardado) setPdfMensaje(t("artistas.pdfGenerado"));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function handleDeleteArtista(id: number, fotoPath: string | null) {
    if (!context) return;
    const count = await context.db.query<{ n: number }>("SELECT COUNT(*) as n FROM obra WHERE artista_id = ?", [id]);
    if (count[0].n > 0) {
      throw new Error(t("artistas.errorTieneObras", { n: count[0].n }));
    }
    await context.db.execute("DELETE FROM artista WHERE id = ?", [id]);
    if (fotoPath) await context.fs.remove(fotoPath).catch(() => {});
    await reload();
  }

  async function handleUpdateArtista(id: number, fields: ArtistaFields, newFoto: File | null) {
    if (!context) return;
    await context.db.execute(
      `UPDATE artista SET nombre_completo = ?, fecha_nacimiento = ?, bio = ?, telefono = ?, email = ?, web = ?, instagram = ?, direccion = ?, x = ?, facebook = ?, notas = ? WHERE id = ?`,
      [
        fields.nombreCompleto,
        fields.fechaNacimiento || null,
        fields.bio || null,
        fields.telefono || null,
        fields.email || null,
        fields.web || null,
        fields.instagram || null,
        fields.direccion || null,
        fields.x || null,
        fields.facebook || null,
        fields.notas || null,
        id,
      ],
    );
    if (newFoto) await writeFoto(id, newFoto);
    await reload();
  }

  const filteredArtistas = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase();
    if (!busquedaNorm) return artistas;
    return artistas.filter((a) => a.nombre_completo.toLowerCase().includes(busquedaNorm));
  }, [artistas, busqueda]);

  const nombreDuplicado = useMemo(() => {
    const nombreNorm = nombreCompleto.trim().toLowerCase();
    if (!nombreNorm) return false;
    return artistas.some((a) => a.nombre_completo.trim().toLowerCase() === nombreNorm);
  }, [artistas, nombreCompleto]);

  if (!context) return null;

  return (
    <div>
      <div className="obras-list-header">
        <h1>{t("artistas.title")}</h1>
        <div className="header-actions">
          {!mostrandoAlta && (
            <button type="button" onClick={() => setMostrandoAlta(true)}>
              {t("artistas.nuevoArtista")}
            </button>
          )}
          <button type="button" onClick={handleVolver}>
            {t("common.back")}
          </button>
        </div>
      </div>

      {mostrandoAlta && (
      <form className="obra-form" onSubmit={handleSubmit} onKeyDown={focusNextOnEnter}>
        <h2>{t("artistas.nuevoArtistaTitulo")}</h2>
        <p className="field-note">{t("artistas.notaNumeroAuto")}</p>

        <label>
          <span className="field-label">{t("artistaSelector.numeroAsignado")}</span>
          <input type="text" value={nextNumero ?? "…"} disabled readOnly />
        </label>

        <label>
          <span className="field-label">{t("artistas.foto")}</span>
          <ImageFileField value={fotoFile} onChange={setFotoFile} />
        </label>

        <label>
          <span className="field-label">{t("artistaSelector.nombreCompleto")}</span>
          <input
            type="text"
            required
            value={nombreCompleto}
            onChange={(e) => {
              setNombreCompleto(e.target.value);
              setDuplicadoConfirmado(false);
            }}
          />
        </label>

        <label>
          <span className="field-label">{t("artistas.fechaNacimiento")}</span>
          <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </label>

        <label>
          <span className="field-label">{t("artistas.bio")}</span>
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>

        <label>
          <span className="field-label">{t("artistas.notas")}</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>

        <label>
          <span className="field-label">{t("artistas.telefono")}</span>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>

        <label>
          <span className="field-label">{t("artistas.email")}</span>
          <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
        </label>

        <label>
          <span className="field-label">{t("artistas.direccion")}</span>
          <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </label>

        <label>
          <span className="field-label">{t("artistas.web")}</span>
          <LinkField value={web} onChange={setWeb} buildUrl={buildWebUrl} />
        </label>

        <label>
          <span className="field-label">{t("artistas.instagram")}</span>
          <LinkField value={instagram} onChange={setInstagram} buildUrl={buildInstagramUrl} />
        </label>

        <label>
          <span className="field-label">{t("artistas.facebook")}</span>
          <LinkField value={facebook} onChange={setFacebook} buildUrl={buildFacebookUrl} />
        </label>

        <label>
          <span className="field-label">{t("artistas.x")}</span>
          <LinkField value={x} onChange={setX} buildUrl={buildXUrl} />
        </label>

        <div className="obra-form-saved-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? t("common.saving") : t("artistas.agregarArtista")}
          </button>
          <button type="button" onClick={handleGenerarPdf} disabled={generandoPdf}>
            {generandoPdf ? t("common.saving") : t("artistas.generarPdf")}
          </button>
          <button type="button" onClick={handleCancelarAlta} disabled={submitting}>
            {t("common.cancel")}
          </button>
        </div>

        {duplicadoBloqueado && (
          <div className="confirm-box">
            <p className="error" role="alert">
              ⚠️ {duplicadoBloqueado}
            </p>
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleConfirmarDuplicado} disabled={submitting}>
                {t("artistas.agregarDeTodosModos")}
              </button>
              <button type="button" onClick={() => setDuplicadoBloqueado(null)} disabled={submitting}>
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
        {pdfMensaje && (
          <p className="success" role="status">
            ✅ {pdfMensaje}
          </p>
        )}
        {formError && (
          <p className="error" role="alert">
            ⚠️ {t("obraForm.errorNoSePudoGuardar", { error: formError })}
          </p>
        )}
      </form>
      )}

      {!mostrandoAlta && (
      <div className="obras-list">
        <h2>{t("artistas.artistasRegistrados")}</h2>
        {loading && <p>{t("common.loading")}</p>}
        {error && (
          <p className="error" role="alert">
            ⚠️ {error}
          </p>
        )}
        {!loading && artistas.length === 0 && <p>{t("artistas.sinArtistas")}</p>}

        {artistas.length > 0 && editingId === null && (
          <input
            type="search"
            className="obras-list-buscador"
            placeholder={t("artistas.buscarPlaceholder")}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        )}

        {!loading && artistas.length > 0 && filteredArtistas.length === 0 && (
          <p>{t("artistas.sinResultados")}</p>
        )}

        <div className="artistas-list">
          {filteredArtistas
            .filter((a) => editingId === null || a.id === editingId)
            .map((a) => (
              <ArtistaRowView
                key={a.id}
                artista={a}
                fotoUrl={thumbnails[a.id]}
                editing={editingId === a.id}
                onStartEdit={() => setEditingId(a.id)}
                onStopEdit={() => setEditingId(null)}
                onDelete={() => handleDeleteArtista(a.id, a.foto_path)}
                onSave={(fields, newFoto) => handleUpdateArtista(a.id, fields, newFoto)}
              />
            ))}
        </div>
      </div>
      )}
    </div>
  );
}

function ArtistaRowView({
  artista,
  fotoUrl,
  editing,
  onStartEdit,
  onStopEdit,
  onDelete,
  onSave,
}: {
  artista: ArtistaRow;
  fotoUrl: string | undefined;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => Promise<void>;
  onSave: (fields: ArtistaFields, newFoto: File | null) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [nombreCompleto, setNombreCompleto] = useState(artista.nombre_completo);
  const [fechaNacimiento, setFechaNacimiento] = useState(artista.fecha_nacimiento ?? "");
  const [bio, setBio] = useState(artista.bio ?? "");
  const [telefono, setTelefono] = useState(artista.telefono ?? "");
  const [email, setEmail] = useState(artista.email ?? "");
  const [web, setWeb] = useState(artista.web ?? "");
  const [instagram, setInstagram] = useState(artista.instagram ?? "");
  const [direccion, setDireccion] = useState(artista.direccion ?? "");
  const [x, setX] = useState(artista.x ?? "");
  const [facebook, setFacebook] = useState(artista.facebook ?? "");
  const [notas, setNotas] = useState(artista.notas ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(pdfMensaje, setPdfMensaje);

  async function handleGenerarPdf() {
    setGenerandoPdf(true);
    setError(null);
    setPdfMensaje(null);
    try {
      let imgBytes: Uint8Array | null = null;
      if (fotoFile) {
        imgBytes = new Uint8Array(await fotoFile.arrayBuffer());
      } else if (fotoUrl) {
        imgBytes = await fetch(fotoUrl)
          .then((r) => r.arrayBuffer())
          .then((b) => new Uint8Array(b));
      }
      const bytes = await generarFichaArtistaPdfBytes(
        t,
        {
          nombreCompleto,
          numeroArtista: artista.numero_artista,
          fechaNacimiento,
          bio,
          telefono,
          email,
          web,
          instagram,
          facebook,
          x,
          direccion,
        },
        imgBytes,
      );
      const fileName = `artista_${(nombreCompleto || "sin_nombre").trim().replace(/\s+/g, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, fileName);
      if (guardado) setPdfMensaje(t("artistas.pdfGenerado"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      onStopEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(
        { nombreCompleto, fechaNacimiento, bio, telefono, email, web, instagram, direccion, x, facebook, notas },
        fotoFile,
      );
      onStopEdit();
      setFotoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="ejemplar-row ejemplar-row-editing">
        <label>
          <span className="field-label">{t("artistas.foto")}</span>
          <ImageFileField value={fotoFile} onChange={setFotoFile} />
        </label>
        <label>
          <span className="field-label">{t("artistaSelector.nombreCompleto")}</span>
          <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.fechaNacimiento")}</span>
          <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.bio")}</span>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.notas")}</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.telefono")}</span>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.email")}</span>
          <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
        </label>
        <label>
          <span className="field-label">{t("artistas.direccion")}</span>
          <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{t("artistas.web")}</span>
          <LinkField value={web} onChange={setWeb} buildUrl={buildWebUrl} />
        </label>
        <label>
          <span className="field-label">{t("artistas.instagram")}</span>
          <LinkField value={instagram} onChange={setInstagram} buildUrl={buildInstagramUrl} />
        </label>
        <label>
          <span className="field-label">{t("artistas.facebook")}</span>
          <LinkField value={facebook} onChange={setFacebook} buildUrl={buildFacebookUrl} />
        </label>
        <label>
          <span className="field-label">{t("artistas.x")}</span>
          <LinkField value={x} onChange={setX} buildUrl={buildXUrl} />
        </label>
        <div className="obra-form-saved-actions">
          <button type="button" onClick={handleSaveEdit} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
          <button type="button" onClick={handleGenerarPdf} disabled={generandoPdf}>
            {generandoPdf ? t("common.saving") : t("artistas.generarPdf")}
          </button>
          <button type="button" onClick={onStopEdit} disabled={saving}>
            {t("common.cancel")}
          </button>
          {!confirming && (
            <button type="button" onClick={() => setConfirming(true)} disabled={saving}>
              {t("common.delete")}
            </button>
          )}
        </div>

        {pdfMensaje && (
          <p className="success" role="status">
            ✅ {pdfMensaje}
          </p>
        )}

        {confirming && (
          <div className="confirm-box">
            <p>{t("artistas.eliminarConfirm")}</p>
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? t("common.deleting") : t("common.siEliminar")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
                {t("common.cancel")}
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

  return (
    <div className="ejemplar-row">
      {fotoUrl && <img src={fotoUrl} alt={artista.nombre_completo} className="artista-foto-thumb" />}
      <strong>{artista.numero_artista || "—"}</strong>
      <span>{artista.nombre_completo}</span>
      {artista.telefono && <span>{t("artistas.telPrefix", { telefono: artista.telefono })}</span>}
      {artista.email && <span>{artista.email}</span>}
      {artista.web && <span>{artista.web}</span>}

      <button type="button" onClick={onStartEdit}>
        {t("common.edit")}
      </button>
      {!confirming && (
        <button type="button" onClick={() => setConfirming(true)}>
          {t("common.delete")}
        </button>
      )}

      {confirming && (
        <div className="confirm-box">
          <p>{t("artistas.eliminarConfirm")}</p>
          <div className="obra-form-saved-actions">
            <button type="button" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? t("common.deleting") : t("common.siEliminar")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
              {t("common.cancel")}
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

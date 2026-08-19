import { useEffect, useRef, useState, type FormEvent } from "react";
import { artistaFotoPath, artistaLogoPath } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { LinkField } from "../components/LinkField.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { buildWebUrl, buildInstagramUrl, buildFacebookUrl, buildXUrl, buildMailtoUrl } from "../utils/socialLinks.js";
import { drawPdfHeader, writeWrappedText } from "../utils/pdfBranding.js";

export function PersonalProfileForm({ onExit, onCancel }: { onExit: () => void; onCancel?: () => void }) {
  const { context, personalArtista: existing, reloadPersonalArtista } = useWorkspace();
  const { t } = useLanguage();

  const [nombreCompleto, setNombreCompleto] = useState(existing?.nombreCompleto ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(existing?.fechaNacimiento ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [telefono, setTelefono] = useState(existing?.telefono ?? "");
  const [web, setWeb] = useState(existing?.web ?? "");
  const [instagram, setInstagram] = useState(existing?.instagram ?? "");
  const [direccion, setDireccion] = useState(existing?.direccion ?? "");
  const [x, setX] = useState(existing?.x ?? "");
  const [facebook, setFacebook] = useState(existing?.facebook ?? "");
  const [notas, setNotas] = useState(existing?.notas ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(pdfMensaje, setPdfMensaje);
  const [guardadoMensaje, setGuardadoMensaje] = useState<string | null>(null);
  useEscapeToDismiss(guardadoMensaje, setGuardadoMensaje);
  const [salirBloqueadoMensaje, setSalirBloqueadoMensaje] = useState<string | null>(null);
  useEscapeToDismiss(salirBloqueadoMensaje, setSalirBloqueadoMensaje);

  // Hay cambios sin guardar si algun campo difiere de los ultimos datos
  // persistidos (o, si todavia no hay perfil guardado, de los valores
  // vacios iniciales). Determina si el boton "Salir" puede navegar o si
  // tiene que bloquear la salida y sugerir "Cancelar".
  const isDirty =
    nombreCompleto !== (existing?.nombreCompleto ?? "") ||
    fechaNacimiento !== (existing?.fechaNacimiento ?? "") ||
    bio !== (existing?.bio ?? "") ||
    notas !== (existing?.notas ?? "") ||
    email !== (existing?.email ?? "") ||
    telefono !== (existing?.telefono ?? "") ||
    web !== (existing?.web ?? "") ||
    instagram !== (existing?.instagram ?? "") ||
    direccion !== (existing?.direccion ?? "") ||
    x !== (existing?.x ?? "") ||
    facebook !== (existing?.facebook ?? "") ||
    fotoFile !== null ||
    logoFile !== null;

  useEffect(() => {
    if (!context || !existing?.fotoPath) return;
    context.fs
      .readFile(existing.fotoPath)
      .then((bytes) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = bytesToObjectUrl(bytes);
        objectUrlRef.current = url;
        setFotoPreviewUrl(url);
      })
      .catch(() => {});
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, existing?.fotoPath]);

  useEffect(() => {
    if (!context || !existing?.logoPath) return;
    context.fs
      .readFile(existing.logoPath)
      .then((bytes) => {
        if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
        const url = bytesToObjectUrl(bytes);
        logoObjectUrlRef.current = url;
        setLogoPreviewUrl(url);
      })
      .catch(() => {});
    return () => {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, existing?.logoPath]);

  if (!context) return null;

  function handleFotoChange(file: File | null) {
    setFotoFile(file);
    if (file) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setFotoPreviewUrl(url);
    }
  }

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    if (file) {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      const url = URL.createObjectURL(file);
      logoObjectUrlRef.current = url;
      setLogoPreviewUrl(url);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setGuardadoMensaje(null);
    setSalirBloqueadoMensaje(null);
    try {
      const { db, fs } = context!;
      let artistaId: number;
      if (existing) {
        artistaId = existing.id;
        await db.execute(
          `UPDATE artista SET nombre_completo = ?, fecha_nacimiento = ?, bio = ?, email = ?, telefono = ?, web = ?, instagram = ?, direccion = ?, x = ?, facebook = ?, notas = ? WHERE id = ?`,
          [
            nombreCompleto,
            fechaNacimiento || null,
            bio || null,
            email || null,
            telefono || null,
            web || null,
            instagram || null,
            direccion || null,
            x || null,
            facebook || null,
            notas || null,
            existing.id,
          ],
        );
      } else {
        const result = await db.execute(
          `INSERT INTO artista (nombre_completo, es_propio, fecha_nacimiento, bio, email, telefono, web, instagram, direccion, x, facebook, notas) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nombreCompleto,
            fechaNacimiento || null,
            bio || null,
            email || null,
            telefono || null,
            web || null,
            instagram || null,
            direccion || null,
            x || null,
            facebook || null,
            notas || null,
          ],
        );
        if (!result.lastInsertId) throw new Error(t("profile.errorCrearTitular"));
        artistaId = result.lastInsertId;
      }

      if (fotoFile) {
        const ext = fotoFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await fotoFile.arrayBuffer());
        const path = artistaFotoPath(artistaId, ext);
        await fs.writeFile(path, bytes);
        await db.execute(`UPDATE artista SET foto_path = ? WHERE id = ?`, [path, artistaId]);
      }

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await logoFile.arrayBuffer());
        const path = artistaLogoPath(artistaId, ext);
        await fs.writeFile(path, bytes);
        await db.execute(`UPDATE artista SET logo_path = ? WHERE id = ?`, [path, artistaId]);
      }

      setFotoFile(null);
      setLogoFile(null);
      await reloadPersonalArtista();
      setGuardadoMensaje(t("profile.datosGuardados"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSalir() {
    if (isDirty) {
      setSalirBloqueadoMensaje(t("profile.salirBloqueado"));
      return;
    }
    onExit();
  }

  async function handleGenerarPdf() {
    if (!context) return;
    setGenerandoPdf(true);
    setError(null);
    setPdfMensaje(null);
    try {
      // jsPDF es pesado: se carga recien al generar el PDF, no en el bundle
      // principal de la app (mismo criterio que en ObraDetail/VentasReport).
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 14;
      const startY = await drawPdfHeader(doc, nombreCompleto || t("profile.tituloMisDatos"), { marginLeft });
      const imageBoxSize = 60;
      let textX = marginLeft;

      let imgBytes: Uint8Array | null = null;
      try {
        if (fotoFile) {
          imgBytes = new Uint8Array(await fotoFile.arrayBuffer());
        } else if (existing?.fotoPath) {
          imgBytes = await context.fs.readFile(existing.fotoPath);
        }
      } catch {
        imgBytes = null;
      }

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
      if (fechaNacimiento) lineas.push(`${t("artistas.fechaNacimiento")}: ${formatFechaDDMMYYYY(fechaNacimiento)}`);
      if (email) lineas.push(`${t("profile.mail")}: ${email}`);
      if (telefono) lineas.push(`${t("artistas.telefono")}: ${telefono}`);
      if (web) lineas.push(`${t("profile.paginaWeb")}: ${web}`);
      if (instagram) lineas.push(`${t("artistas.instagram")}: ${instagram}`);
      if (facebook) lineas.push(`${t("artistas.facebook")}: ${facebook}`);
      if (x) lineas.push(`${t("artistas.x")}: ${x}`);
      if (direccion) lineas.push(`${t("artistas.direccion")}: ${direccion}`);
      for (const linea of lineas) {
        textY = writeWrappedText(doc, linea, textX, textY, textWidth);
      }

      if (bio) {
        textY += 3;
        doc.setFontSize(11);
        textY = writeWrappedText(doc, t("artistas.bio"), textX, textY, textWidth, { lineHeight: 6 });
        doc.setFontSize(10);
        writeWrappedText(doc, bio, textX, textY, textWidth);
      }

      const bytes = new Uint8Array(doc.output("arraybuffer"));
      const fileName = `perfil_${(nombreCompleto || "titular").trim().replace(/\s+/g, "_")}.pdf`;
      const guardado = await savePdfWithDialog(bytes, fileName);
      if (guardado) setPdfMensaje(t("profile.pdfGenerado"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPdf(false);
    }
  }

  return (
    <form className="obra-form profile-form" onSubmit={handleSubmit}>
      <h2>
        {t("profile.tituloMisDatos")} <HelpIcon fieldKey="perfil_personal_nota" />
      </h2>

      {fotoPreviewUrl && <img src={fotoPreviewUrl} alt={t("profile.fotoAlt")} className="artista-foto-preview" />}

      <label>
        {t("artistas.foto")}
        <ImageFileField value={fotoFile} onChange={handleFotoChange} />
      </label>

      {logoPreviewUrl && <img src={logoPreviewUrl} alt={t("profile.logoAlt")} className="artista-foto-preview" />}

      <label>
        {t("profile.logo")}
        <ImageFileField value={logoFile} onChange={handleLogoChange} />
      </label>

      <label>
        {t("artistaSelector.nombreCompleto")}
        <input type="text" required value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />
      </label>

      <label>
        {t("artistas.fechaNacimiento")}
        <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </label>

      <label>
        {t("artistas.bio")}
        <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>

      <label>
        {t("artistas.notas")}
        <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </label>

      <fieldset>
        <legend>{t("profile.contactoLegend")}</legend>
        <label>
          {t("profile.mail")}
          <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
        </label>
        <label>
          {t("artistas.telefono")}
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label>
          {t("artistas.direccion")}
          <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </label>
        <label>
          {t("profile.paginaWeb")}
          <LinkField value={web} onChange={setWeb} buildUrl={buildWebUrl} />
        </label>
        <label>
          {t("artistas.instagram")}
          <LinkField value={instagram} onChange={setInstagram} buildUrl={buildInstagramUrl} />
        </label>
        <label>
          {t("artistas.facebook")}
          <LinkField value={facebook} onChange={setFacebook} buildUrl={buildFacebookUrl} />
        </label>
        <label>
          {t("artistas.x")}
          <LinkField value={x} onChange={setX} buildUrl={buildXUrl} />
        </label>
      </fieldset>

      <div className="obra-form-saved-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? t("common.saving") : t("profile.guardarMisDatos")}
        </button>
        <button type="button" onClick={handleGenerarPdf} disabled={generandoPdf}>
          {generandoPdf ? t("common.saving") : t("profile.generarPdf")}
        </button>
        {!existing && (
          <button type="button" onClick={handleSalir} disabled={submitting}>
            {t("profile.salir")}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            {t("common.cancel")}
          </button>
        )}
      </div>

      {guardadoMensaje && (
        <p className="success" role="status">
          ✅ {guardadoMensaje}
        </p>
      )}

      {pdfMensaje && (
        <p className="success" role="status">
          ✅ {pdfMensaje}
        </p>
      )}

      {salirBloqueadoMensaje && (
        <p className="error" role="alert">
          ⚠️ {salirBloqueadoMensaje}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          ⚠️ {t("obraForm.errorNoSePudoGuardar", { error })}
        </p>
      )}
    </form>
  );
}

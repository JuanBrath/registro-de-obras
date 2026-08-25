import { useEffect, useRef, useState, type FormEvent } from "react";
import { galeriaFirmaPath, galeriaLogoPath } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { LinkField } from "../components/LinkField.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { buildWebUrl, buildInstagramUrl, buildFacebookUrl, buildXUrl, buildMailtoUrl } from "../utils/socialLinks.js";
import { drawPdfHeader, writeWrappedText } from "../utils/pdfBranding.js";

interface GaleriaPerfilRow {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  facebook: string | null;
  x: string | null;
  notas: string | null;
  logo_path: string | null;
  firma_path: string | null;
  cuit: string | null;
}

export function GaleriaProfileForm({ onBack }: { onBack: () => void }) {
  const { context, reloadGaleriaPerfil } = useWorkspace();
  const { t } = useLanguage();

  const [existing, setExisting] = useState<GaleriaPerfilRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [x, setX] = useState("");
  const [notas, setNotas] = useState("");
  const [cuit, setCuit] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);
  const [firmaFile, setFirmaFile] = useState<File | null>(null);
  const [firmaPreviewUrl, setFirmaPreviewUrl] = useState<string | null>(null);
  const firmaObjectUrlRef = useRef<string | null>(null);

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

  const isDirty =
    nombre !== (existing?.nombre ?? "") ||
    direccion !== (existing?.direccion ?? "") ||
    telefono !== (existing?.telefono ?? "") ||
    email !== (existing?.email ?? "") ||
    web !== (existing?.web ?? "") ||
    instagram !== (existing?.instagram ?? "") ||
    facebook !== (existing?.facebook ?? "") ||
    x !== (existing?.x ?? "") ||
    notas !== (existing?.notas ?? "") ||
    cuit !== (existing?.cuit ?? "") ||
    logoFile !== null ||
    firmaFile !== null;

  useEffect(() => {
    if (!context) return;
    setLoading(true);
    context.db
      .query<GaleriaPerfilRow>(
        `SELECT nombre, direccion, telefono, email, web, instagram, facebook, x, notas, logo_path, firma_path, cuit FROM galeria_perfil WHERE id = 1`,
      )
      .then((rows) => {
        const row = rows[0] ?? null;
        setExisting(row);
        setNombre(row?.nombre ?? "");
        setDireccion(row?.direccion ?? "");
        setTelefono(row?.telefono ?? "");
        setEmail(row?.email ?? "");
        setWeb(row?.web ?? "");
        setInstagram(row?.instagram ?? "");
        setFacebook(row?.facebook ?? "");
        setX(row?.x ?? "");
        setNotas(row?.notas ?? "");
        setCuit(row?.cuit ?? "");
        if (row?.logo_path) {
          context.fs
            .readFile(row.logo_path)
            .then((bytes) => {
              if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
              const url = bytesToObjectUrl(bytes);
              logoObjectUrlRef.current = url;
              setLogoPreviewUrl(url);
            })
            .catch(() => {});
        }
        if (row?.firma_path) {
          context.fs
            .readFile(row.firma_path)
            .then((bytes) => {
              if (firmaObjectUrlRef.current) URL.revokeObjectURL(firmaObjectUrlRef.current);
              const url = bytesToObjectUrl(bytes);
              firmaObjectUrlRef.current = url;
              setFirmaPreviewUrl(url);
            })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
    return () => {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      if (firmaObjectUrlRef.current) URL.revokeObjectURL(firmaObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  if (!context || loading) return null;

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    if (file) {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      const url = URL.createObjectURL(file);
      logoObjectUrlRef.current = url;
      setLogoPreviewUrl(url);
    }
  }

  function handleFirmaChange(file: File | null) {
    setFirmaFile(file);
    if (file) {
      if (firmaObjectUrlRef.current) URL.revokeObjectURL(firmaObjectUrlRef.current);
      const url = URL.createObjectURL(file);
      firmaObjectUrlRef.current = url;
      setFirmaPreviewUrl(url);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setGuardadoMensaje(null);
    setSalirBloqueadoMensaje(null);
    try {
      await context!.db.execute(
        `UPDATE galeria_perfil SET nombre = ?, direccion = ?, telefono = ?, email = ?, web = ?, instagram = ?, facebook = ?, x = ?, notas = ?, cuit = ? WHERE id = 1`,
        [
          nombre,
          direccion || null,
          telefono || null,
          email || null,
          web || null,
          instagram || null,
          facebook || null,
          x || null,
          notas || null,
          cuit || null,
        ],
      );

      let logoPath = existing?.logo_path ?? null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await logoFile.arrayBuffer());
        logoPath = galeriaLogoPath(ext);
        await context!.fs.writeFile(logoPath, bytes);
        await context!.db.execute(`UPDATE galeria_perfil SET logo_path = ? WHERE id = 1`, [logoPath]);
      }

      let firmaPath = existing?.firma_path ?? null;
      if (firmaFile) {
        const ext = firmaFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await firmaFile.arrayBuffer());
        firmaPath = galeriaFirmaPath(ext);
        await context!.fs.writeFile(firmaPath, bytes);
        await context!.db.execute(`UPDATE galeria_perfil SET firma_path = ? WHERE id = 1`, [firmaPath]);
      }

      setExisting({
        nombre,
        direccion,
        telefono,
        email,
        web,
        instagram,
        facebook,
        x,
        notas,
        logo_path: logoPath,
        firma_path: firmaPath,
        cuit,
      });
      setLogoFile(null);
      setFirmaFile(null);
      await reloadGaleriaPerfil();
      setGuardadoMensaje(t("galeriaProfile.datosGuardados"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleVolver() {
    if (isDirty) {
      setSalirBloqueadoMensaje(t("galeriaProfile.salirBloqueado"));
      return;
    }
    onBack();
  }

  async function handleGenerarPdf() {
    setGenerandoPdf(true);
    setError(null);
    setPdfMensaje(null);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 14;
      const startY = await drawPdfHeader(doc, nombre || t("galeriaProfile.titulo"), { marginLeft });
      const pageWidth = doc.internal.pageSize.getWidth();
      const textWidth = pageWidth - marginLeft * 2;

      const lineas: string[] = [];
      if (direccion) lineas.push(`${t("artistas.direccion")}: ${direccion}`);
      if (cuit) lineas.push(`${t("common.cuit")}: ${cuit}`);
      if (email) lineas.push(`${t("profile.mail")}: ${email}`);
      if (telefono) lineas.push(`${t("artistas.telefono")}: ${telefono}`);
      if (web) lineas.push(`${t("profile.paginaWeb")}: ${web}`);
      if (instagram) lineas.push(`${t("artistas.instagram")}: ${instagram}`);
      if (facebook) lineas.push(`${t("artistas.facebook")}: ${facebook}`);
      if (x) lineas.push(`${t("artistas.x")}: ${x}`);

      let textY = startY + 5;
      for (const linea of lineas) {
        textY = writeWrappedText(doc, linea, marginLeft, textY, textWidth);
      }

      if (notas) {
        textY += 3;
        doc.setFontSize(11);
        textY = writeWrappedText(doc, t("artistas.notas"), marginLeft, textY, textWidth, { lineHeight: 6 });
        doc.setFontSize(10);
        writeWrappedText(doc, notas, marginLeft, textY, textWidth);
      }

      const bytes = new Uint8Array(doc.output("arraybuffer"));
      const fileName = `galeria_${(nombre || "datos").trim().replace(/\s+/g, "_")}.pdf`;
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
      <h2>{t("galeriaProfile.titulo")}</h2>

      <div className="imagen-campo">
        <span className="field-label">{t("galeriaProfile.logo")}</span>
        {logoPreviewUrl && <img src={logoPreviewUrl} alt={t("galeriaProfile.logoAlt")} className="perfil-imagen-preview" />}
        <ImageFileField value={logoFile} onChange={handleLogoChange} hasImage={Boolean(existing?.logo_path)} />
      </div>

      <div className="imagen-campo">
        <span className="field-label">
          {t("galeriaProfile.firmaDigital")} <HelpIcon fieldKey="firma_digital" />
        </span>
        {firmaPreviewUrl && <img src={firmaPreviewUrl} alt={t("galeriaProfile.firmaAlt")} className="perfil-imagen-preview" />}
        <ImageFileField value={firmaFile} onChange={handleFirmaChange} hasImage={Boolean(existing?.firma_path)} />
      </div>

      <label>
        {t("galeriaProfile.nombreLabel")}
        <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
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
          {t("common.cuit")}
          <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} />
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
          {submitting ? t("common.saving") : t("galeriaProfile.guardar")}
        </button>
        <button type="button" onClick={handleGenerarPdf} disabled={generandoPdf}>
          {generandoPdf ? t("common.saving") : t("profile.generarPdf")}
        </button>
        <button type="button" onClick={handleVolver} disabled={submitting}>
          {t("galeriaProfile.volver")}
        </button>
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

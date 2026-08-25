import { useEffect, useRef, useState, type FormEvent } from "react";
import { artistaFirmaPath, artistaFotoPath, artistaLogoPath } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { LinkField } from "../components/LinkField.js";
import { Modal } from "../components/Modal.js";
import { InformesModal } from "../components/InformesModal.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { buildWebUrl, buildInstagramUrl, buildFacebookUrl, buildXUrl, buildMailtoUrl } from "../utils/socialLinks.js";
import type { FirmaEleccion } from "../utils/pdfBranding.js";
import { type InformeIdioma } from "../reports/informeIdioma.js";
import { resolveFirmaBytes, resolveMembreteLogoBytes } from "../reports/reportBranding.js";
import { buildPersonalBiografiaPdfBytes, buildPersonalFichaCompletaPdfBytes } from "../reports/personalReports.js";

export function PersonalProfileForm({ onExit }: { onExit: () => void }) {
  const { context, personalArtista: existing, reloadPersonalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();

  const [nombreCompleto, setNombreCompleto] = useState(existing?.nombreCompleto ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(existing?.fechaNacimiento ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [bioEn, setBioEn] = useState(existing?.bioEn ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [telefono, setTelefono] = useState(existing?.telefono ?? "");
  const [web, setWeb] = useState(existing?.web ?? "");
  const [instagram, setInstagram] = useState(existing?.instagram ?? "");
  const [direccion, setDireccion] = useState(existing?.direccion ?? "");
  const [x, setX] = useState(existing?.x ?? "");
  const [facebook, setFacebook] = useState(existing?.facebook ?? "");
  const [cuit, setCuit] = useState(existing?.cuit ?? "");
  const [notas, setNotas] = useState(existing?.notas ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
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
  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  const [informeSeleccionId, setInformeSeleccionId] = useState("completa");
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>("es");
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; alt: string } | null>(null);
  useEscapeToDismiss(imagenAmpliada, setImagenAmpliada);
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
    bioEn !== (existing?.bioEn ?? "") ||
    notas !== (existing?.notas ?? "") ||
    email !== (existing?.email ?? "") ||
    telefono !== (existing?.telefono ?? "") ||
    web !== (existing?.web ?? "") ||
    instagram !== (existing?.instagram ?? "") ||
    direccion !== (existing?.direccion ?? "") ||
    x !== (existing?.x ?? "") ||
    facebook !== (existing?.facebook ?? "") ||
    cuit !== (existing?.cuit ?? "") ||
    fotoFile !== null ||
    logoFile !== null ||
    firmaFile !== null;

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

  useEffect(() => {
    if (!context || !existing?.firmaPath) return;
    context.fs
      .readFile(existing.firmaPath)
      .then((bytes) => {
        if (firmaObjectUrlRef.current) URL.revokeObjectURL(firmaObjectUrlRef.current);
        const url = bytesToObjectUrl(bytes);
        firmaObjectUrlRef.current = url;
        setFirmaPreviewUrl(url);
      })
      .catch(() => {});
    return () => {
      if (firmaObjectUrlRef.current) URL.revokeObjectURL(firmaObjectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, existing?.firmaPath]);

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
      const { db, fs } = context!;
      let artistaId: number;
      if (existing) {
        artistaId = existing.id;
        await db.execute(
          `UPDATE artista SET nombre_completo = ?, fecha_nacimiento = ?, bio = ?, bio_en = ?, email = ?, telefono = ?, web = ?, instagram = ?, direccion = ?, x = ?, facebook = ?, cuit = ?, notas = ? WHERE id = ?`,
          [
            nombreCompleto,
            fechaNacimiento || null,
            bio || null,
            bioEn || null,
            email || null,
            telefono || null,
            web || null,
            instagram || null,
            direccion || null,
            x || null,
            facebook || null,
            cuit || null,
            notas || null,
            existing.id,
          ],
        );
      } else {
        const result = await db.execute(
          `INSERT INTO artista (nombre_completo, es_propio, fecha_nacimiento, bio, bio_en, email, telefono, web, instagram, direccion, x, facebook, cuit, notas) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nombreCompleto,
            fechaNacimiento || null,
            bio || null,
            bioEn || null,
            email || null,
            telefono || null,
            web || null,
            instagram || null,
            direccion || null,
            x || null,
            facebook || null,
            cuit || null,
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

      if (firmaFile) {
        const ext = firmaFile.name.split(".").pop() || "jpg";
        const bytes = new Uint8Array(await firmaFile.arrayBuffer());
        const path = artistaFirmaPath(artistaId, ext);
        await fs.writeFile(path, bytes);
        await db.execute(`UPDATE artista SET firma_path = ? WHERE id = ?`, [path, artistaId]);
      }

      setFotoFile(null);
      setLogoFile(null);
      setFirmaFile(null);
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

  async function handleAbrirInformesMenu() {
    setInformeSeleccionId("completa");
    setInformeIdioma(idioma);
    setInformeFirma("ninguna");
    setPdfMensaje(null);
    setFirmaBytesDisponibles(context ? await resolveFirmaBytes(context, existing, galeriaPerfil) : null);
    setInformesMenuAbierto(true);
  }

  async function handleGenerarInforme() {
    if (!context) return;
    setGenerandoPdf(true);
    setError(null);
    setPdfMensaje(null);
    try {
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

      const logoBytes = await resolveMembreteLogoBytes(context, existing, galeriaPerfil);
      const brandOpts = { idioma: informeIdioma, logoBytes, firma: informeFirma, firmaBytes: firmaBytesDisponibles };
      const datos = {
        nombreCompleto,
        fechaNacimiento,
        bio,
        bioEn,
        notas,
        email,
        telefono,
        web,
        instagram,
        direccion,
        x,
        facebook,
        cuit,
      };

      const bytes =
        informeSeleccionId === "biografia"
          ? await buildPersonalBiografiaPdfBytes(datos, imgBytes, brandOpts)
          : await buildPersonalFichaCompletaPdfBytes(datos, imgBytes, brandOpts);

      const sufijo = informeSeleccionId === "biografia" ? "_biografia" : "";
      const fileName = `perfil_${(nombreCompleto || "titular").trim().replace(/\s+/g, "_")}${sufijo}.pdf`;
      const guardado = await savePdfWithDialog(bytes, fileName);
      if (guardado) {
        setInformesMenuAbierto(false);
        setPdfMensaje(t("profile.pdfGenerado"));
      }
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

      <div className="imagen-campo">
        <span className="field-label">{t("artistas.foto")}</span>
        {fotoPreviewUrl && (
          <button
            type="button"
            className="imagen-preview-button"
            onClick={() => setImagenAmpliada({ url: fotoPreviewUrl, alt: t("profile.fotoAlt") })}
          >
            <img src={fotoPreviewUrl} alt={t("profile.fotoAlt")} className="artista-foto-preview" />
          </button>
        )}
        <ImageFileField
          value={fotoFile}
          onChange={handleFotoChange}
          hasImage={Boolean(existing?.fotoPath)}
          showFileName={false}
        />
      </div>

      <div className="imagen-campo">
        <span className="field-label">{t("profile.logo")}</span>
        {logoPreviewUrl && (
          <button
            type="button"
            className="imagen-preview-button"
            onClick={() => setImagenAmpliada({ url: logoPreviewUrl, alt: t("profile.logoAlt") })}
          >
            <img src={logoPreviewUrl} alt={t("profile.logoAlt")} className="perfil-imagen-preview" />
          </button>
        )}
        <ImageFileField value={logoFile} onChange={handleLogoChange} hasImage={Boolean(existing?.logoPath)} />
      </div>

      <div className="imagen-campo">
        <span className="field-label">
          {t("profile.firmaDigital")} <HelpIcon fieldKey="firma_digital" />
        </span>
        {firmaPreviewUrl && (
          <button
            type="button"
            className="imagen-preview-button"
            onClick={() => setImagenAmpliada({ url: firmaPreviewUrl, alt: t("profile.firmaAlt") })}
          >
            <img src={firmaPreviewUrl} alt={t("profile.firmaAlt")} className="perfil-imagen-preview" />
          </button>
        )}
        <ImageFileField value={firmaFile} onChange={handleFirmaChange} hasImage={Boolean(existing?.firmaPath)} />
      </div>

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
        {t("artistas.bioEnLabel")} <HelpIcon fieldKey="bio_en" />
        <textarea rows={4} value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
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
          {submitting ? t("common.saving") : t("profile.guardarMisDatos")}
        </button>
        <button type="button" onClick={handleAbrirInformesMenu} disabled={generandoPdf}>
          {generandoPdf ? t("common.saving") : t("common.generarInforme")}
        </button>
        <button type="button" onClick={handleSalir} disabled={submitting}>
          {t("common.back")}
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

      {informesMenuAbierto && (
        <InformesModal
          titulo={t("informes.tituloDe", { nombre: nombreCompleto || t("profile.tituloMisDatos") })}
          opciones={[
            { id: "completa", label: t("profile.informeOpcionCompleta") },
            { id: "biografia", label: t("profile.informeOpcionBiografia") },
          ]}
          selectedId={informeSeleccionId}
          onSelectId={setInformeSeleccionId}
          idioma={informeIdioma}
          onIdiomaChange={setInformeIdioma}
          firma={informeFirma}
          onFirmaChange={setInformeFirma}
          firmaDigitalDisponible={firmaBytesDisponibles !== null}
          onGenerar={handleGenerarInforme}
          generando={generandoPdf}
          onClose={() => setInformesMenuAbierto(false)}
        />
      )}

      {imagenAmpliada && (
        <Modal onClose={() => setImagenAmpliada(null)} wide className="modal-content-image">
          <img src={imagenAmpliada.url} alt={imagenAmpliada.alt} className="obra-full-image" />
        </Modal>
      )}
    </form>
  );
}

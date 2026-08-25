import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { artistaFotoPath } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { createArtista } from "../data/createArtista.js";
import { bytesToObjectUrl } from "../utils/imageObjectUrl.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { LinkField } from "../components/LinkField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";
import {
  drawPdfHeader,
  drawSignatureBlock,
  writeBilingualParagraph,
  writeWrappedText,
  type FirmaEleccion,
} from "../utils/pdfBranding.js";
import { InformesModal } from "../components/InformesModal.js";
import { tInforme, type InformeIdioma } from "../reports/informeIdioma.js";
import { resolveFirmaBytes, resolveMembreteLogoBytes } from "../reports/reportBranding.js";
import { formatNumeroArtista } from "../utils/formatNumeroArtista.js";
import {
  buildWebUrl,
  buildInstagramUrl,
  buildFacebookUrl,
  buildXUrl,
  buildMailtoUrl,
  buildLinkedinUrl,
} from "../utils/socialLinks.js";

interface ArtistaRow {
  id: number;
  numero_artista: string | null;
  nombre_completo: string;
  fecha_nacimiento: string | null;
  bio: string | null;
  bio_en: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  direccion: string | null;
  x: string | null;
  facebook: string | null;
  linkedin: string | null;
  notas: string | null;
  foto_path: string | null;
  nombre_artistico: string | null;
  lugar_nacimiento: string | null;
  lugar_fallecimiento: string | null;
  nacionalidad: string | null;
  fecha_fallecimiento: string | null;
  lugar_residencia_trabajo: string | null;
  declaracion_artista: string | null;
  formacion_academica: string | null;
  exposiciones_individuales: string | null;
  exposiciones_colectivas: string | null;
  premios_becas_reconocimientos: string | null;
  colecciones: string | null;
  publicaciones_prensa: string | null;
}

export interface ArtistaFields {
  nombreCompleto: string;
  fechaNacimiento: string;
  bio: string;
  bioEn: string;
  telefono: string;
  email: string;
  web: string;
  instagram: string;
  direccion: string;
  x: string;
  facebook: string;
  linkedin: string;
  notas: string;
  nombreArtistico: string;
  lugarNacimiento: string;
  lugarFallecimiento: string;
  nacionalidad: string;
  fechaFallecimiento: string;
  lugarResidenciaTrabajo: string;
  declaracionArtista: string;
  formacionAcademica: string;
  exposicionesIndividuales: string;
  exposicionesColectivas: string;
  premiosBecasReconocimientos: string;
  colecciones: string;
  publicacionesPrensa: string;
}

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface FichaArtistaFields {
  nombreCompleto: string;
  numeroArtista?: string | null;
  fechaNacimiento: string;
  bio: string;
  bioEn: string;
  notas: string;
  telefono: string;
  email: string;
  web: string;
  instagram: string;
  facebook: string;
  x: string;
  linkedin: string;
  direccion: string;
  nombreArtistico: string;
  lugarNacimiento: string;
  lugarFallecimiento: string;
  nacionalidad: string;
  fechaFallecimiento: string;
  lugarResidenciaTrabajo: string;
  declaracionArtista: string;
  formacionAcademica: string;
  exposicionesIndividuales: string;
  exposicionesColectivas: string;
  premiosBecasReconocimientos: string;
  colecciones: string;
  publicacionesPrensa: string;
}

// Genera el PDF con la ficha del artista (usado tanto desde el alta como
// desde la edicion de un artista existente, para no duplicar el layout).
async function generarFichaArtistaPdfBytes(
  t: TFn,
  fields: FichaArtistaFields,
  imgBytes: Uint8Array | null,
  firmaOpts: { idioma: InformeIdioma; logoBytes: Uint8Array | null; firma: FirmaEleccion; firmaBytes: Uint8Array | null },
) {
  // jsPDF es pesado: se carga recien al generar el PDF (mismo criterio que
  // en PersonalProfileForm/ObraDetail/VentasReport).
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginLeft = 14;
  const startY = await drawPdfHeader(doc, fields.nombreCompleto || t("artistas.title"), {
    marginLeft,
    logoBytes: firmaOpts.logoBytes,
  });
  const imageBoxSize = 60;
  let textX = marginLeft;
  let imageBottom = startY;

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
      imageBottom = startY + displayH;
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - textX - marginLeft;
  let textY = startY + 5;

  const lineas: string[] = [];
  if (fields.numeroArtista) lineas.push(`${t("artistaSelector.numeroAsignado")}: ${fields.numeroArtista}`);
  if (fields.nombreArtistico) lineas.push(`${t("artistas.nombreArtisticoLabel")}: ${fields.nombreArtistico}`);
  if (fields.nacionalidad) lineas.push(`${t("artistas.nacionalidadLabel")}: ${fields.nacionalidad}`);
  if (fields.fechaNacimiento) {
    lineas.push(`${t("artistas.fechaNacimiento")}: ${formatFechaDDMMYYYY(fields.fechaNacimiento)}`);
  }
  if (fields.lugarNacimiento) lineas.push(`${t("artistas.lugarNacimientoLabel")}: ${fields.lugarNacimiento}`);
  if (fields.fechaFallecimiento) {
    lineas.push(`${t("artistas.fechaFallecimientoLabel")}: ${formatFechaDDMMYYYY(fields.fechaFallecimiento)}`);
  }
  if (fields.lugarFallecimiento) {
    lineas.push(`${t("artistas.lugarFallecimientoLabel")}: ${fields.lugarFallecimiento}`);
  }
  if (fields.lugarResidenciaTrabajo) {
    lineas.push(`${t("artistas.lugarResidenciaTrabajoLabel")}: ${fields.lugarResidenciaTrabajo}`);
  }
  if (fields.email) lineas.push(`${t("artistas.email")}: ${fields.email}`);
  if (fields.telefono) lineas.push(`${t("artistas.telefono")}: ${fields.telefono}`);
  if (fields.direccion) lineas.push(`${t("artistas.direccion")}: ${fields.direccion}`);
  if (fields.web) lineas.push(`${t("artistas.web")}: ${fields.web}`);
  if (fields.instagram) lineas.push(`${t("artistas.instagram")}: ${fields.instagram}`);
  if (fields.facebook) lineas.push(`${t("artistas.facebook")}: ${fields.facebook}`);
  if (fields.x) lineas.push(`${t("artistas.x")}: ${fields.x}`);
  if (fields.linkedin) lineas.push(`${t("artistas.linkedinLabel")}: ${fields.linkedin}`);
  for (const linea of lineas) {
    textY = writeWrappedText(doc, linea, textX, textY, textWidth);
  }

  // La biografia (y todo lo que viene despues: declaracion, formacion,
  // exposiciones, etc.) arranca debajo de la foto y de los datos personales,
  // no al costado, y usa todo el ancho de la hoja.
  const bodyX = marginLeft;
  const bodyWidth = pageWidth - marginLeft * 2;
  let bodyY = Math.max(imageBottom, textY) + 8;

  function agregarParrafo(titulo: string, texto: string) {
    if (!texto) return;
    bodyY += 3;
    doc.setFontSize(11);
    bodyY = writeWrappedText(doc, titulo, bodyX, bodyY, bodyWidth, { lineHeight: 6 });
    doc.setFontSize(10);
    bodyY = writeWrappedText(doc, texto, bodyX, bodyY, bodyWidth);
  }

  bodyY = writeBilingualParagraph(doc, firmaOpts.idioma, "artistas.bio", fields.bio, fields.bioEn, bodyX, bodyY, bodyWidth);
  bodyY = writeBilingualParagraph(doc, firmaOpts.idioma, "artistas.notas", fields.notas, "", bodyX, bodyY, bodyWidth);
  agregarParrafo(t("artistas.declaracionArtistaLabel"), fields.declaracionArtista);
  agregarParrafo(t("artistas.formacionAcademicaLabel"), fields.formacionAcademica);
  agregarParrafo(t("artistas.exposicionesIndividualesLabel"), fields.exposicionesIndividuales);
  agregarParrafo(t("artistas.exposicionesColectivasLabel"), fields.exposicionesColectivas);
  agregarParrafo(t("artistas.premiosBecasReconocimientosLabel"), fields.premiosBecasReconocimientos);
  agregarParrafo(t("artistas.coleccionesLabel"), fields.colecciones);
  agregarParrafo(t("artistas.publicacionesPrensaLabel"), fields.publicacionesPrensa);

  await drawSignatureBlock(doc, bodyY + 10, {
    idioma: firmaOpts.idioma,
    firma: firmaOpts.firma,
    firmaBytes: firmaOpts.firmaBytes,
    marginLeft,
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

export function ArtistasScreen({ onBack }: { onBack: () => void }) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
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
  const [bioEn, setBioEn] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [instagram, setInstagram] = useState("");
  const [direccion, setDireccion] = useState("");
  const [x, setX] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [notas, setNotas] = useState("");
  const [nombreArtistico, setNombreArtistico] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [lugarNacimiento, setLugarNacimiento] = useState("");
  const [lugarFallecimiento, setLugarFallecimiento] = useState("");
  const [fechaFallecimiento, setFechaFallecimiento] = useState("");
  const [lugarResidenciaTrabajo, setLugarResidenciaTrabajo] = useState("");
  const [declaracionArtista, setDeclaracionArtista] = useState("");
  const [formacionAcademica, setFormacionAcademica] = useState("");
  const [exposicionesIndividuales, setExposicionesIndividuales] = useState("");
  const [exposicionesColectivas, setExposicionesColectivas] = useState("");
  const [premiosBecasReconocimientos, setPremiosBecasReconocimientos] = useState("");
  const [colecciones, setColecciones] = useState("");
  const [publicacionesPrensa, setPublicacionesPrensa] = useState("");
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
  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>("es");
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);
  // Mientras se consulta/edita un artista, los demas no se muestran debajo
  // (se ve solo el que esta abierto, no toda la lista mezclada con la ficha).
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [fichaModo, setFichaModo] = useState<"consultar" | "editar">("consultar");
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
    setBioEn("");
    setTelefono("");
    setEmail("");
    setWeb("");
    setInstagram("");
    setDireccion("");
    setX("");
    setFacebook("");
    setLinkedin("");
    setNotas("");
    setNombreArtistico("");
    setNacionalidad("");
    setLugarNacimiento("");
    setLugarFallecimiento("");
    setFechaFallecimiento("");
    setLugarResidenciaTrabajo("");
    setDeclaracionArtista("");
    setFormacionAcademica("");
    setExposicionesIndividuales("");
    setExposicionesColectivas("");
    setPremiosBecasReconocimientos("");
    setColecciones("");
    setPublicacionesPrensa("");
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
        `SELECT id, numero_artista, nombre_completo, fecha_nacimiento, bio, bio_en, telefono, email, web, instagram,
                direccion, x, facebook, linkedin, notas, foto_path, nombre_artistico, lugar_nacimiento,
                lugar_fallecimiento, nacionalidad, fecha_fallecimiento, lugar_residencia_trabajo,
                declaracion_artista, formacion_academica, exposiciones_individuales, exposiciones_colectivas,
                premios_becas_reconocimientos, colecciones, publicaciones_prensa
         FROM artista ORDER BY numero_artista`,
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
    setNextNumero(rows.length > 0 ? formatNumeroArtista(rows[0].siguiente_numero) : null);
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
        bioEn: bioEn || null,
        telefono: telefono || null,
        email: email || null,
        web: web || null,
        instagram: instagram || null,
        direccion: direccion || null,
        x: x || null,
        facebook: facebook || null,
        linkedin: linkedin || null,
        notas: notas || null,
        nombreArtistico: nombreArtistico || null,
        nacionalidad: nacionalidad || null,
        lugarNacimiento: lugarNacimiento || null,
        lugarFallecimiento: lugarFallecimiento || null,
        fechaFallecimiento: fechaFallecimiento || null,
        lugarResidenciaTrabajo: lugarResidenciaTrabajo || null,
        declaracionArtista: declaracionArtista || null,
        formacionAcademica: formacionAcademica || null,
        exposicionesIndividuales: exposicionesIndividuales || null,
        exposicionesColectivas: exposicionesColectivas || null,
        premiosBecasReconocimientos: premiosBecasReconocimientos || null,
        colecciones: colecciones || null,
        publicacionesPrensa: publicacionesPrensa || null,
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
    if (fichaId !== null) {
      setFichaId(null);
      return;
    }
    onBack();
  }

  async function handleAbrirInformesMenu() {
    setInformeIdioma(idioma);
    setInformeFirma("ninguna");
    setFirmaBytesDisponibles(context ? await resolveFirmaBytes(context, personalArtista, galeriaPerfil) : null);
    setInformesMenuAbierto(true);
  }

  async function handleGenerarPdf() {
    setInformesMenuAbierto(false);
    setGenerandoPdf(true);
    setFormError(null);
    setPdfMensaje(null);
    try {
      const imgBytes = fotoFile ? new Uint8Array(await fotoFile.arrayBuffer()) : null;
      const logoBytes = context ? await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil) : null;
      const bytes = await generarFichaArtistaPdfBytes(
        (key, vars) => tInforme(informeIdioma, key, vars),
        {
          nombreCompleto,
          numeroArtista: nextNumero,
          fechaNacimiento,
          bio,
          bioEn,
          notas,
          telefono,
          email,
          web,
          instagram,
          facebook,
          x,
          linkedin,
          direccion,
          nombreArtistico,
          nacionalidad,
          lugarNacimiento,
          lugarFallecimiento,
          fechaFallecimiento,
          lugarResidenciaTrabajo,
          declaracionArtista,
          formacionAcademica,
          exposicionesIndividuales,
          exposicionesColectivas,
          premiosBecasReconocimientos,
          colecciones,
          publicacionesPrensa,
        },
        imgBytes,
        { idioma: informeIdioma, logoBytes, firma: informeFirma, firmaBytes: firmaBytesDisponibles },
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
      `UPDATE artista SET
         nombre_completo = ?, fecha_nacimiento = ?, bio = ?, bio_en = ?, telefono = ?, email = ?, web = ?, instagram = ?,
         direccion = ?, x = ?, facebook = ?, linkedin = ?, notas = ?, nombre_artistico = ?, nacionalidad = ?,
         lugar_nacimiento = ?, lugar_fallecimiento = ?, fecha_fallecimiento = ?, lugar_residencia_trabajo = ?,
         declaracion_artista = ?, formacion_academica = ?, exposiciones_individuales = ?,
         exposiciones_colectivas = ?, premios_becas_reconocimientos = ?, colecciones = ?, publicaciones_prensa = ?
       WHERE id = ?`,
      [
        fields.nombreCompleto,
        fields.fechaNacimiento || null,
        fields.bio || null,
        fields.bioEn || null,
        fields.telefono || null,
        fields.email || null,
        fields.web || null,
        fields.instagram || null,
        fields.direccion || null,
        fields.x || null,
        fields.facebook || null,
        fields.linkedin || null,
        fields.notas || null,
        fields.nombreArtistico || null,
        fields.nacionalidad || null,
        fields.lugarNacimiento || null,
        fields.lugarFallecimiento || null,
        fields.fechaFallecimiento || null,
        fields.lugarResidenciaTrabajo || null,
        fields.declaracionArtista || null,
        fields.formacionAcademica || null,
        fields.exposicionesIndividuales || null,
        fields.exposicionesColectivas || null,
        fields.premiosBecasReconocimientos || null,
        fields.colecciones || null,
        fields.publicacionesPrensa || null,
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

        <label>
          <span className="field-label">
            {t("artistaSelector.numeroAsignado")} <HelpIcon fieldKey="numero_artista_auto" />
          </span>
          <input type="text" value={nextNumero ?? "…"} disabled readOnly />
        </label>

        <label>
          <span className="field-label">{t("artistas.foto")}</span>
          <ImageFileField value={fotoFile} onChange={setFotoFile} />
        </label>

        <fieldset>
          <legend>{t("artistas.seccionIdentificacion")}</legend>

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
            <span className="field-label">{t("artistas.nombreArtisticoLabel")}</span>
            <input type="text" value={nombreArtistico} onChange={(e) => setNombreArtistico(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("artistas.nacionalidadLabel")}</span>
            <input type="text" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.fechaNacimiento")}</span>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
            </label>

            <label>
              <span className="field-label">{t("artistas.fechaFallecimientoLabel")}</span>
              <input
                type="date"
                value={fechaFallecimiento}
                onChange={(e) => setFechaFallecimiento(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.lugarNacimientoLabel")}</span>
              <input type="text" value={lugarNacimiento} onChange={(e) => setLugarNacimiento(e.target.value)} />
            </label>

            <label>
              <span className="field-label">{t("artistas.lugarFallecimientoLabel")}</span>
              <input
                type="text"
                value={lugarFallecimiento}
                onChange={(e) => setLugarFallecimiento(e.target.value)}
              />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.lugarResidenciaTrabajoLabel")}</span>
            <input
              type="text"
              value={lugarResidenciaTrabajo}
              onChange={(e) => setLugarResidenciaTrabajo(e.target.value)}
            />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.telefono")}</span>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>

            <label>
              <span className="field-label">{t("artistas.email")}</span>
              <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.direccion")}</span>
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.web")}</span>
              <LinkField value={web} onChange={setWeb} buildUrl={buildWebUrl} />
            </label>

            <label>
              <span className="field-label">{t("artistas.instagram")}</span>
              <LinkField value={instagram} onChange={setInstagram} buildUrl={buildInstagramUrl} />
            </label>
          </div>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.facebook")}</span>
              <LinkField value={facebook} onChange={setFacebook} buildUrl={buildFacebookUrl} />
            </label>

            <label>
              <span className="field-label">{t("artistas.x")}</span>
              <LinkField value={x} onChange={setX} buildUrl={buildXUrl} />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.linkedinLabel")}</span>
            <LinkField value={linkedin} onChange={setLinkedin} buildUrl={buildLinkedinUrl} />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("artistas.seccionBiografia")}</legend>

          <label>
            <span className="field-label">
              {t("artistas.bio")} <HelpIcon fieldKey="artista_bio_corta" />
            </span>
            <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.bioEnLabel")} <HelpIcon fieldKey="bio_en" />
            </span>
            <textarea rows={4} value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.declaracionArtistaLabel")} <HelpIcon fieldKey="artista_declaracion" />
            </span>
            <textarea
              rows={4}
              value={declaracionArtista}
              onChange={(e) => setDeclaracionArtista(e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("artistas.seccionCv")}</legend>

          <label>
            <span className="field-label">
              {t("artistas.formacionAcademicaLabel")} <HelpIcon fieldKey="artista_formacion_academica" />
            </span>
            <textarea
              rows={3}
              value={formacionAcademica}
              onChange={(e) => setFormacionAcademica(e.target.value)}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.exposicionesIndividualesLabel")}{" "}
              <HelpIcon fieldKey="artista_exposiciones_individuales" />
            </span>
            <textarea
              rows={3}
              value={exposicionesIndividuales}
              onChange={(e) => setExposicionesIndividuales(e.target.value)}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.exposicionesColectivasLabel")}{" "}
              <HelpIcon fieldKey="artista_exposiciones_colectivas" />
            </span>
            <textarea
              rows={3}
              value={exposicionesColectivas}
              onChange={(e) => setExposicionesColectivas(e.target.value)}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.premiosBecasReconocimientosLabel")} <HelpIcon fieldKey="artista_premios_becas" />
            </span>
            <textarea
              rows={3}
              value={premiosBecasReconocimientos}
              onChange={(e) => setPremiosBecasReconocimientos(e.target.value)}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.coleccionesLabel")} <HelpIcon fieldKey="artista_colecciones" />
            </span>
            <textarea rows={3} value={colecciones} onChange={(e) => setColecciones(e.target.value)} />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.publicacionesPrensaLabel")} <HelpIcon fieldKey="artista_publicaciones_prensa" />
            </span>
            <textarea
              rows={3}
              value={publicacionesPrensa}
              onChange={(e) => setPublicacionesPrensa(e.target.value)}
            />
          </label>
        </fieldset>

        <label>
          <span className="field-label">{t("artistas.notas")}</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>

        <div className="obra-form-saved-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? t("common.saving") : t("artistas.agregarArtista")}
          </button>
          <button type="button" onClick={handleAbrirInformesMenu} disabled={generandoPdf}>
            {generandoPdf ? t("common.saving") : t("common.generarInforme")}
          </button>
          <button type="button" onClick={handleCancelarAlta} disabled={submitting}>
            {t("common.cancel")}
          </button>
        </div>

        {informesMenuAbierto && (
          <InformesModal
            titulo={t("informes.tituloDe", { nombre: nombreCompleto || t("artistas.title") })}
            opciones={[{ id: "ficha", label: t("artistas.informeOpcionFichaPdf") }]}
            selectedId="ficha"
            onSelectId={() => {}}
            idioma={informeIdioma}
            onIdiomaChange={setInformeIdioma}
            firma={informeFirma}
            onFirmaChange={setInformeFirma}
            firmaDigitalDisponible={firmaBytesDisponibles !== null}
            onGenerar={handleGenerarPdf}
            generando={generandoPdf}
            onClose={() => setInformesMenuAbierto(false)}
          />
        )}

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
        {fichaId === null && <h2>{t("artistas.artistasRegistrados")}</h2>}
        {loading && <p>{t("common.loading")}</p>}
        {error && (
          <p className="error" role="alert">
            ⚠️ {error}
          </p>
        )}
        {!loading && artistas.length === 0 && <p>{t("artistas.sinArtistas")}</p>}

        {artistas.length > 0 && fichaId === null && (
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
            .filter((a) => fichaId === null || a.id === fichaId)
            .map((a) => (
              <ArtistaRowView
                key={a.id}
                artista={a}
                fotoUrl={thumbnails[a.id]}
                modo={fichaId === a.id ? fichaModo : "compacto"}
                onConsultar={() => {
                  setFichaId(a.id);
                  setFichaModo("consultar");
                }}
                onEditar={() => {
                  setFichaId(a.id);
                  setFichaModo("editar");
                }}
                onCerrarFicha={() => setFichaId(null)}
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
  modo,
  onConsultar,
  onEditar,
  onCerrarFicha,
  onDelete,
  onSave,
}: {
  artista: ArtistaRow;
  fotoUrl: string | undefined;
  modo: "compacto" | "consultar" | "editar";
  onConsultar: () => void;
  onEditar: () => void;
  onCerrarFicha: () => void;
  onDelete: () => Promise<void>;
  onSave: (fields: ArtistaFields, newFoto: File | null) => Promise<void>;
}) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [nombreCompleto, setNombreCompleto] = useState(artista.nombre_completo);
  const [fechaNacimiento, setFechaNacimiento] = useState(artista.fecha_nacimiento ?? "");
  const [bio, setBio] = useState(artista.bio ?? "");
  const [bioEn, setBioEn] = useState(artista.bio_en ?? "");
  const [telefono, setTelefono] = useState(artista.telefono ?? "");
  const [email, setEmail] = useState(artista.email ?? "");
  const [web, setWeb] = useState(artista.web ?? "");
  const [instagram, setInstagram] = useState(artista.instagram ?? "");
  const [direccion, setDireccion] = useState(artista.direccion ?? "");
  const [x, setX] = useState(artista.x ?? "");
  const [facebook, setFacebook] = useState(artista.facebook ?? "");
  const [linkedin, setLinkedin] = useState(artista.linkedin ?? "");
  const [notas, setNotas] = useState(artista.notas ?? "");
  const [nombreArtistico, setNombreArtistico] = useState(artista.nombre_artistico ?? "");
  const [nacionalidad, setNacionalidad] = useState(artista.nacionalidad ?? "");
  const [lugarNacimiento, setLugarNacimiento] = useState(artista.lugar_nacimiento ?? "");
  const [lugarFallecimiento, setLugarFallecimiento] = useState(artista.lugar_fallecimiento ?? "");
  const [fechaFallecimiento, setFechaFallecimiento] = useState(artista.fecha_fallecimiento ?? "");
  const [lugarResidenciaTrabajo, setLugarResidenciaTrabajo] = useState(
    artista.lugar_residencia_trabajo ?? "",
  );
  const [declaracionArtista, setDeclaracionArtista] = useState(artista.declaracion_artista ?? "");
  const [formacionAcademica, setFormacionAcademica] = useState(artista.formacion_academica ?? "");
  const [exposicionesIndividuales, setExposicionesIndividuales] = useState(
    artista.exposiciones_individuales ?? "",
  );
  const [exposicionesColectivas, setExposicionesColectivas] = useState(
    artista.exposiciones_colectivas ?? "",
  );
  const [premiosBecasReconocimientos, setPremiosBecasReconocimientos] = useState(
    artista.premios_becas_reconocimientos ?? "",
  );
  const [colecciones, setColecciones] = useState(artista.colecciones ?? "");
  const [publicacionesPrensa, setPublicacionesPrensa] = useState(artista.publicaciones_prensa ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(pdfMensaje, setPdfMensaje);
  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>("es");
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);

  async function handleAbrirInformesMenu() {
    setInformeIdioma(idioma);
    setInformeFirma("ninguna");
    setFirmaBytesDisponibles(context ? await resolveFirmaBytes(context, personalArtista, galeriaPerfil) : null);
    setInformesMenuAbierto(true);
  }

  async function handleGenerarPdf() {
    setInformesMenuAbierto(false);
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
      const logoBytes = context ? await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil) : null;
      const bytes = await generarFichaArtistaPdfBytes(
        (key, vars) => tInforme(informeIdioma, key, vars),
        {
          nombreCompleto,
          numeroArtista: artista.numero_artista,
          fechaNacimiento,
          bio,
          bioEn,
          notas,
          telefono,
          email,
          web,
          instagram,
          facebook,
          x,
          linkedin,
          direccion,
          nombreArtistico,
          nacionalidad,
          lugarNacimiento,
          lugarFallecimiento,
          fechaFallecimiento,
          lugarResidenciaTrabajo,
          declaracionArtista,
          formacionAcademica,
          exposicionesIndividuales,
          exposicionesColectivas,
          premiosBecasReconocimientos,
          colecciones,
          publicacionesPrensa,
        },
        imgBytes,
        { idioma: informeIdioma, logoBytes, firma: informeFirma, firmaBytes: firmaBytesDisponibles },
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
      onCerrarFicha();
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
        {
          nombreCompleto,
          fechaNacimiento,
          bio,
          bioEn,
          telefono,
          email,
          web,
          instagram,
          direccion,
          x,
          facebook,
          linkedin,
          notas,
          nombreArtistico,
          nacionalidad,
          lugarNacimiento,
          lugarFallecimiento,
          fechaFallecimiento,
          lugarResidenciaTrabajo,
          declaracionArtista,
          formacionAcademica,
          exposicionesIndividuales,
          exposicionesColectivas,
          premiosBecasReconocimientos,
          colecciones,
          publicacionesPrensa,
        },
        fotoFile,
      );
      onCerrarFicha();
      setFotoFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (modo !== "compacto") {
    const soloLectura = modo === "consultar";
    return (
      <div className="ejemplar-row ejemplar-row-editing">
        <h2>{artista.nombre_completo}</h2>
        <label>
          <span className="field-label">{t("artistas.foto")}</span>
          <ImageFileField value={fotoFile} onChange={setFotoFile} disabled={soloLectura} />
        </label>
        <fieldset>
          <legend>{t("artistas.seccionIdentificacion")}</legend>

          <label>
            <span className="field-label">{t("artistaSelector.nombreCompleto")}</span>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">{t("artistas.nombreArtisticoLabel")}</span>
            <input
              type="text"
              value={nombreArtistico}
              onChange={(e) => setNombreArtistico(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">{t("artistas.nacionalidadLabel")}</span>
            <input
              type="text"
              value={nacionalidad}
              onChange={(e) => setNacionalidad(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.fechaNacimiento")}</span>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("artistas.fechaFallecimientoLabel")}</span>
              <input
                type="date"
                value={fechaFallecimiento}
                onChange={(e) => setFechaFallecimiento(e.target.value)}
                disabled={soloLectura}
              />
            </label>
          </div>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.lugarNacimientoLabel")}</span>
              <input
                type="text"
                value={lugarNacimiento}
                onChange={(e) => setLugarNacimiento(e.target.value)}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("artistas.lugarFallecimientoLabel")}</span>
              <input
                type="text"
                value={lugarFallecimiento}
                onChange={(e) => setLugarFallecimiento(e.target.value)}
                disabled={soloLectura}
              />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.lugarResidenciaTrabajoLabel")}</span>
            <input
              type="text"
              value={lugarResidenciaTrabajo}
              onChange={(e) => setLugarResidenciaTrabajo(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.telefono")}</span>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("artistas.email")}</span>
              <LinkField
                type="email"
                value={email}
                onChange={setEmail}
                buildUrl={buildMailtoUrl}
                disabled={soloLectura}
              />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.direccion")}</span>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.web")}</span>
              <LinkField value={web} onChange={setWeb} buildUrl={buildWebUrl} disabled={soloLectura} />
            </label>
            <label>
              <span className="field-label">{t("artistas.instagram")}</span>
              <LinkField
                value={instagram}
                onChange={setInstagram}
                buildUrl={buildInstagramUrl}
                disabled={soloLectura}
              />
            </label>
          </div>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("artistas.facebook")}</span>
              <LinkField
                value={facebook}
                onChange={setFacebook}
                buildUrl={buildFacebookUrl}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("artistas.x")}</span>
              <LinkField value={x} onChange={setX} buildUrl={buildXUrl} disabled={soloLectura} />
            </label>
          </div>

          <label>
            <span className="field-label">{t("artistas.linkedinLabel")}</span>
            <LinkField
              value={linkedin}
              onChange={setLinkedin}
              buildUrl={buildLinkedinUrl}
              disabled={soloLectura}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("artistas.seccionBiografia")}</legend>

          <label>
            <span className="field-label">
              {t("artistas.bio")} <HelpIcon fieldKey="artista_bio_corta" />
            </span>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} disabled={soloLectura} />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.bioEnLabel")} <HelpIcon fieldKey="bio_en" />
            </span>
            <textarea rows={3} value={bioEn} onChange={(e) => setBioEn(e.target.value)} disabled={soloLectura} />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.declaracionArtistaLabel")} <HelpIcon fieldKey="artista_declaracion" />
            </span>
            <textarea
              rows={3}
              value={declaracionArtista}
              onChange={(e) => setDeclaracionArtista(e.target.value)}
              disabled={soloLectura}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("artistas.seccionCv")}</legend>

          <label>
            <span className="field-label">
              {t("artistas.formacionAcademicaLabel")} <HelpIcon fieldKey="artista_formacion_academica" />
            </span>
            <textarea
              rows={3}
              value={formacionAcademica}
              onChange={(e) => setFormacionAcademica(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.exposicionesIndividualesLabel")}{" "}
              <HelpIcon fieldKey="artista_exposiciones_individuales" />
            </span>
            <textarea
              rows={3}
              value={exposicionesIndividuales}
              onChange={(e) => setExposicionesIndividuales(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.exposicionesColectivasLabel")}{" "}
              <HelpIcon fieldKey="artista_exposiciones_colectivas" />
            </span>
            <textarea
              rows={3}
              value={exposicionesColectivas}
              onChange={(e) => setExposicionesColectivas(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.premiosBecasReconocimientosLabel")} <HelpIcon fieldKey="artista_premios_becas" />
            </span>
            <textarea
              rows={3}
              value={premiosBecasReconocimientos}
              onChange={(e) => setPremiosBecasReconocimientos(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.coleccionesLabel")} <HelpIcon fieldKey="artista_colecciones" />
            </span>
            <textarea
              rows={3}
              value={colecciones}
              onChange={(e) => setColecciones(e.target.value)}
              disabled={soloLectura}
            />
          </label>

          <label>
            <span className="field-label">
              {t("artistas.publicacionesPrensaLabel")} <HelpIcon fieldKey="artista_publicaciones_prensa" />
            </span>
            <textarea
              rows={3}
              value={publicacionesPrensa}
              onChange={(e) => setPublicacionesPrensa(e.target.value)}
              disabled={soloLectura}
            />
          </label>
        </fieldset>

        <label>
          <span className="field-label">{t("artistas.notas")}</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} disabled={soloLectura} />
        </label>

        <div className="obra-form-saved-actions">
          {soloLectura ? (
            <>
              <button type="button" onClick={handleAbrirInformesMenu} disabled={generandoPdf}>
                {generandoPdf ? t("common.saving") : t("common.generarInforme")}
              </button>
              <button type="button" onClick={onCerrarFicha}>
                {t("common.close")}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleSaveEdit} disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </button>
              <button type="button" onClick={handleAbrirInformesMenu} disabled={generandoPdf}>
                {generandoPdf ? t("common.saving") : t("common.generarInforme")}
              </button>
              <button type="button" onClick={onCerrarFicha} disabled={saving}>
                {t("common.cancel")}
              </button>
            </>
          )}
        </div>

        {informesMenuAbierto && (
          <InformesModal
            titulo={t("informes.tituloDe", { nombre: artista.nombre_completo })}
            opciones={[{ id: "ficha", label: t("artistas.informeOpcionFichaPdf") }]}
            selectedId="ficha"
            onSelectId={() => {}}
            idioma={informeIdioma}
            onIdiomaChange={setInformeIdioma}
            firma={informeFirma}
            onFirmaChange={setInformeFirma}
            firmaDigitalDisponible={firmaBytesDisponibles !== null}
            onGenerar={handleGenerarPdf}
            generando={generandoPdf}
            onClose={() => setInformesMenuAbierto(false)}
          />
        )}

        {pdfMensaje && (
          <p className="success" role="status">
            ✅ {pdfMensaje}
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

  return (
    <div className="ejemplar-row">
      <strong>{artista.nombre_completo}</strong>
      {artista.telefono && <span>{t("artistas.telPrefix", { telefono: artista.telefono })}</span>}

      <div className="obra-form-saved-actions cliente-compacto-acciones">
        <button type="button" onClick={onConsultar}>
          {t("common.consultar")}
        </button>
        <button type="button" onClick={onEditar}>
          {t("common.edit")}
        </button>
        <button type="button" onClick={() => setConfirming(true)}>
          {t("common.delete")}
        </button>
      </div>

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

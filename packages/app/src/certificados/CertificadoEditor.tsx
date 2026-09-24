import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "../components/Modal.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { detectImageFormat } from "../utils/detectImageFormat.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import { certificadoVacio, type Certificado, type GuiasCorte, type Idioma, type Modelo, type TamanoHoja } from "./certificado.js";
import { valoresDeStudio, type DatosStudioCertificado, type FormatoCertificado } from "./datosStudio.js";
import { generarCertificado } from "./generar.js";
import { leerImagen } from "./imagen.js";

type CampoTexto = {
  [K in keyof Certificado]: Certificado[K] extends string ? K : never;
}[keyof Certificado];
type CampoImagen = "imagen" | "firmaArtista" | "logo" | "galeriaFirma";

/**
 * Pantalla para preparar un certificado de autenticidad: a la izquierda los
 * datos y a la derecha la vista previa en vivo. Los datos que Studio ya tiene
 * (de la obra, la copia, la venta y el perfil) salen en gris y no se pueden
 * cambiar acá: para eso están los botones "Editar en la obra", "Editar la
 * copia" y "Editar la venta". Solo quedan habilitados los datos que están
 * vacíos en Studio, que se completan para este certificado sin tocar el
 * registro.
 */
export function CertificadoEditor({
  datos,
  modelosDisponibles,
  idiomaInicial,
  nombreArchivo,
  onEditarObra,
  onEditarCopia,
  onEditarVenta,
  onClose,
}: {
  datos: DatosStudioCertificado;
  modelosDisponibles: FormatoCertificado[];
  idiomaInicial: Idioma;
  /** Nombre sugerido para el PDF, sin extension. */
  nombreArchivo: string;
  onEditarObra: () => void;
  onEditarCopia: () => void;
  onEditarVenta: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [formato, setFormato] = useState<FormatoCertificado>("clasico");
  const [tamanoHoja, setTamanoHoja] = useState<TamanoHoja>("a4");
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);
  const [guiasCorte, setGuiasCorte] = useState<GuiasCorte>("ninguna");
  const [incluirFirma, setIncluirFirma] = useState(false);
  const [incluirLogo, setIncluirLogo] = useState(true);
  // Lo que se completa a mano en los campos que estan vacios en Studio.
  const [manual, setManual] = useState<Partial<Certificado>>({});
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const urlAnterior = useRef<string | null>(null);

  const modelo: Modelo = formato === "fichaSinGaleria" ? "ficha" : formato;
  const sinFirmaGaleria = formato === "fichaSinGaleria";
  const esFicha = modelo === "ficha";
  const esClasico = modelo === "clasico";
  const deStudio = useMemo(() => valoresDeStudio(datos, modelo), [datos, modelo]);

  const cert = useMemo<Certificado>(() => {
    const c: Certificado = { ...certificadoVacio(idioma), ...manual, ...deStudio, modelo, sinFirmaGaleria, tamanoHoja, idioma, guiasCorte };
    if (!incluirFirma) {
      if (deStudio.firmaArtista) c.firmaArtista = null;
      if (deStudio.galeriaFirma) c.galeriaFirma = null;
    }
    if (!incluirLogo && deStudio.logo) c.logo = null;
    return c;
  }, [manual, deStudio, modelo, sinFirmaGaleria, tamanoHoja, idioma, guiasCorte, incluirFirma, incluirLogo]);

  // La vista previa se regenera medio segundo despues de dejar de tocar algo.
  useEffect(() => {
    let cancelado = false;
    const espera = setTimeout(async () => {
      try {
        const bytes = await generarCertificado(cert);
        if (cancelado) return;
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
        if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current);
        urlAnterior.current = url;
        setVistaPrevia(url);
        setMensaje((m) => (m?.tipo === "error" ? null : m));
      } catch (e) {
        if (!cancelado) setMensaje({ tipo: "error", texto: t("certificado.errorVistaPrevia", { error: String(e) }) });
      }
    }, 500);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert]);

  useEffect(
    () => () => {
      if (urlAnterior.current) URL.revokeObjectURL(urlAnterior.current);
    },
    [],
  );

  function completar<K extends keyof Certificado>(campo: K, valor: Certificado[K]) {
    setManual((m) => ({ ...m, [campo]: valor }));
  }

  async function guardar() {
    setMensaje(null);
    setGuardando(true);
    try {
      const bytes = await generarCertificado(cert);
      const guardado = await savePdfWithDialog(bytes, `${nombreArchivo}.pdf`);
      if (guardado) setMensaje({ tipo: "ok", texto: t("ventaForm.informeGenerado") });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setGuardando(false);
    }
  }

  function texto(
    campo: CampoTexto,
    etiqueta: TranslationKey,
    opciones: { renglones?: number; medio?: boolean; fecha?: boolean } = {},
  ) {
    // Gris si Studio tiene el dato; habilitado si esta vacio en Studio.
    const bloqueado = campo in deStudio;
    const propiedades = {
      value: cert[campo] as string,
      disabled: bloqueado,
      title: bloqueado ? t("certificado.campoDeRegistro") : undefined,
      onChange: (e: { target: { value: string } }) => completar(campo, e.target.value),
    };
    return (
      <label className={`certificado-campo${opciones.medio ? " certificado-campo-medio" : ""}`}>
        <span className="certificado-etiqueta">{t(etiqueta)}</span>
        {opciones.renglones ? (
          <textarea rows={opciones.renglones} {...propiedades} />
        ) : (
          <input type={opciones.fecha ? "date" : "text"} {...propiedades} />
        )}
      </label>
    );
  }

  function imagen(campo: CampoImagen, etiqueta: TranslationKey, tipo: "foto" | "grafico") {
    const deRegistro = deStudio[campo] as Uint8Array | null | undefined;
    const bytes = deRegistro ?? (manual[campo] as Uint8Array | null | undefined) ?? null;
    return (
      <div className="certificado-campo">
        <span className="certificado-etiqueta">{t(etiqueta)}</span>
        <div className="certificado-imagen-fila">
          {bytes && <MiniaturaBytes bytes={bytes} gris={Boolean(deRegistro)} />}
          {!deRegistro && (
            <>
              <label className="certificado-boton">
                {bytes ? t("certificado.cambiarImagen") : t("certificado.elegirImagen")}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (!archivo) return;
                    try {
                      completar(campo, await leerImagen(archivo, tipo));
                    } catch {
                      setMensaje({ tipo: "error", texto: t("certificado.errorImagen", { nombre: archivo.name }) });
                    }
                  }}
                />
              </label>
              {bytes && (
                <button type="button" className="certificado-link" onClick={() => completar(campo, null)}>
                  {t("certificado.quitar")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const hayFirmaDeRegistro = Boolean(deStudio.firmaArtista || (esFicha && !sinFirmaGaleria && deStudio.galeriaFirma));
  const hayLogoDeRegistro = Boolean(deStudio.logo);
  const modelos: { valor: FormatoCertificado; nombre: TranslationKey; detalle: TranslationKey }[] = [
    { valor: "clasico", nombre: "certificado.modeloClasico", detalle: "certificado.modeloClasicoDetalle" },
    { valor: "simple", nombre: "certificado.modeloSimple", detalle: "certificado.modeloSimpleDetalle" },
    { valor: "ficha", nombre: "certificado.modeloFicha", detalle: "certificado.modeloFichaDetalle" },
    { valor: "fichaSinGaleria", nombre: "certificado.modeloFichaSinGaleria", detalle: "certificado.modeloFichaSinGaleriaDetalle" },
  ];

  return (
    <Modal onClose={onClose} className="modal-content-certificado">
      <div className="certificado-editor">
        <section className="certificado-formulario">
          <h2>{t("certificado.titulo")}</h2>

          <Seccion titulo={t("certificado.seccionFormato")}>
            <Opciones etiqueta={t("certificado.modelo")}>
              {modelos
                .filter((m) => modelosDisponibles.includes(m.valor))
                .map((m) => (
                  <Opcion key={m.valor} activa={formato === m.valor} onClick={() => setFormato(m.valor)} titulo={t(m.nombre)} detalle={t(m.detalle)} />
                ))}
            </Opciones>
            <Opciones etiqueta={t("certificado.tamanoHoja")}>
              <Opcion activa={tamanoHoja === "a4"} onClick={() => setTamanoHoja("a4")} titulo="A4" detalle={t("certificado.hojaA4Detalle")} />
              <Opcion activa={tamanoHoja === "carta"} onClick={() => setTamanoHoja("carta")} titulo={t("certificado.hojaCarta")} detalle={t("certificado.hojaCartaDetalle")} />
              <Opcion activa={tamanoHoja === "a5"} onClick={() => setTamanoHoja("a5")} titulo="A5" detalle={t("certificado.hojaA5Detalle")} />
            </Opciones>
            <Opciones etiqueta={t("certificado.idiomaTitulos")} ayuda={t("certificado.idiomaAyuda")}>
              <Opcion activa={idioma === "es"} onClick={() => setIdioma("es")} titulo={t("informes.idiomaEspanol")} detalle="Autor, Año…" />
              <Opcion activa={idioma === "en"} onClick={() => setIdioma("en")} titulo={t("informes.idiomaIngles")} detalle="Artist, Year…" />
              <Opcion activa={idioma === "ambos"} onClick={() => setIdioma("ambos")} titulo={t("informes.idiomaAmbos")} detalle="Autor / Artist" />
            </Opciones>
            <Opciones etiqueta={t("certificado.guias")} ayuda={t("certificado.guiasAyuda")}>
              <Opcion activa={guiasCorte === "ninguna"} onClick={() => setGuiasCorte("ninguna")} titulo={t("certificado.guiasNinguna")} detalle={t("certificado.guiasNingunaDetalle")} />
              <Opcion activa={guiasCorte === "esquinas"} onClick={() => setGuiasCorte("esquinas")} titulo={t("certificado.guiasEsquinas")} detalle={t("certificado.guiasEsquinasDetalle")} />
              <Opcion activa={guiasCorte === "recuadro"} onClick={() => setGuiasCorte("recuadro")} titulo={t("certificado.guiasRecuadro")} detalle={t("certificado.guiasRecuadroDetalle")} />
            </Opciones>
          </Seccion>

          <Seccion titulo={t("certificado.seccionDatos")}>
            <p className="certificado-ayuda">{t("certificado.datosAyuda")}</p>
            <div className="certificado-acciones-registro">
              <button type="button" className="certificado-boton" onClick={onEditarObra}>
                {t("certificado.editarEnObra")}
              </button>
              <button type="button" className="certificado-boton" onClick={onEditarCopia}>
                {t("certificado.editarEnCopia")}
              </button>
              <button type="button" className="certificado-boton" onClick={onEditarVenta}>
                {t("certificado.editarEnVenta")}
              </button>
            </div>

            <Subseccion titulo={t("certificado.seccionObra")}>
              {imagen("imagen", "certificado.imagenObra", "foto")}
              {texto("titulo", "certificado.tituloObra")}
              {texto("serieProyecto", "certificado.serie")}
              {texto("artista", "certificado.artista")}
              {esFicha && texto("artistaReside", "certificado.artistaReside")}
              <div className="certificado-fila">
                {texto("anioToma", "certificado.anioToma", { medio: true })}
                {esClasico && texto("anioEdicion", "certificado.anioEdicion", { medio: true })}
              </div>
            </Subseccion>

            <Subseccion titulo={t("certificado.seccionCopia")}>
              <div className="certificado-fila">
                {texto("copia", "certificado.copia", { medio: true })}
                {texto("pruebasAutor", "certificado.pruebasAutor", { medio: true })}
              </div>
              {texto("medidas", "certificado.medidas")}
            </Subseccion>

            <Subseccion titulo={t("certificado.seccionDetalles")}>
              {texto("captura", esFicha ? "certificado.disciplina" : "certificado.captura")}
              {texto("impresion", esFicha ? "certificado.materiales" : "certificado.impresion", { renglones: 2 })}
              {esFicha && texto("ubicacionFirma", "certificado.ubicacionFirma")}
            </Subseccion>

            <Subseccion titulo={t("certificado.seccionFirma")}>
              {imagen("firmaArtista", "certificado.firmaArtista", "grafico")}
              {esFicha && !sinFirmaGaleria && imagen("galeriaFirma", "certificado.firmaGaleria", "grafico")}
              {hayFirmaDeRegistro ? (
                <label className="certificado-casilla">
                  <input type="checkbox" checked={incluirFirma} onChange={(e) => setIncluirFirma(e.target.checked)} />
                  {t("certificado.incluirFirma")}
                </label>
              ) : (
                <p className="certificado-ayuda">{t("certificado.sinFirmaAyuda")}</p>
              )}
            </Subseccion>

            {/* El modelo simple no lleva logo ni datos de galeria. */}
            {modelo !== "simple" && (
              <Subseccion titulo={esFicha ? t("certificado.seccionGaleria") : t("certificado.seccionLogo")}>
                {imagen("logo", "certificado.logo", "grafico")}
                {hayLogoDeRegistro && (
                  <label className="certificado-casilla">
                    <input type="checkbox" checked={incluirLogo} onChange={(e) => setIncluirLogo(e.target.checked)} />
                    {t("certificado.incluirLogo")}
                  </label>
                )}
                {esFicha && (
                  <>
                    {texto("galeriaNombre", "certificado.galeriaNombre")}
                    <div className="certificado-fila">
                      {texto("galeriaTelefono", "certificado.galeriaTelefono", { medio: true })}
                      {texto("galeriaEmail", "certificado.galeriaEmail", { medio: true })}
                    </div>
                  </>
                )}
              </Subseccion>
            )}
          </Seccion>

          <Seccion titulo={t("certificado.seccionEmision")}>
            <div className="certificado-fila">
              {texto("lugar", "certificado.lugar", { medio: true })}
              {texto("fecha", "certificado.fecha", { medio: true, fecha: true })}
            </div>
          </Seccion>
        </section>

        <section className="certificado-previa">
          {vistaPrevia ? (
            <iframe title={t("certificado.vistaPrevia")} src={`${vistaPrevia}#toolbar=0&view=Fit`} />
          ) : (
            <p className="certificado-ayuda">{t("certificado.armandoVistaPrevia")}</p>
          )}
          <div className="certificado-pie">
            {mensaje && (
              <p className={mensaje.tipo === "ok" ? "success" : "error"} role="status">
                {mensaje.tipo === "ok" ? "✅ " : ""}
                {mensaje.texto}
              </p>
            )}
            <button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? t("common.saving") : t("certificado.guardarPdf")}
            </button>
            <button type="button" onClick={onClose} disabled={guardando}>
              {t("common.back")}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="certificado-seccion">
      <legend>{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Subseccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="certificado-subseccion">
      <h3>{titulo}</h3>
      {children}
    </div>
  );
}

function Opciones({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="certificado-campo">
      <span className="certificado-etiqueta">{etiqueta}</span>
      <div className="certificado-opciones">{children}</div>
      {ayuda && <span className="certificado-ayuda">{ayuda}</span>}
    </div>
  );
}

function Opcion({ activa, onClick, titulo, detalle }: { activa: boolean; onClick: () => void; titulo: string; detalle: string }) {
  return (
    <button type="button" className={`certificado-opcion${activa ? " certificado-opcion-activa" : ""}`} onClick={onClick} aria-pressed={activa}>
      <strong>{titulo}</strong>
      <span>{detalle}</span>
    </button>
  );
}

/** Miniatura de una imagen ya cargada; en gris si viene del registro. */
function MiniaturaBytes({ bytes, gris }: { bytes: Uint8Array; gris: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const tipo = detectImageFormat(bytes) === "PNG" ? "image/png" : "image/jpeg";
    const nueva = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [bytes]);
  return url ? <img src={url} alt="" className={`certificado-miniatura${gris ? " certificado-miniatura-gris" : ""}`} /> : null;
}

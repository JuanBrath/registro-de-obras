import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  DESTINO_CORRECCION,
  camposConCambios,
  validarCorrecciones,
  type CampoCorregible,
  type CorreccionesRegistro,
  type ErrorCorreccion,
} from "@registro/core";
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
 *
 * "Corregir datos del registro" es la excepción: con un aviso previo, deja
 * cambiar en la misma pantalla los datos que corresponden a una sola columna
 * (título, medidas, fecha de la venta...), y al guardar los escribe en el
 * registro donde se cargaron (ver guardarCorrecciones en @registro/core).
 */

/** Nombre con que se muestra cada dato corregible en los avisos. */
const ETIQUETA_CORREGIBLE: Record<CampoCorregible, TranslationKey> = {
  titulo: "certificado.tituloObra",
  serieProyecto: "certificado.serie",
  anioPeriodo: "certificado.anioToma",
  anioCaptura: "certificado.anioToma",
  anioEdicion: "certificado.anioEdicion",
  medidas: "certificado.medidas",
  tipoImpresion: "obraDetail.tipoImpresionLabel",
  soporteImpresion: "obraDetail.soporteImpresion",
  ubicacionFirma: "certificado.ubicacionFirma",
  lugar: "certificado.lugar",
  fecha: "certificado.fecha",
};
const DESTINO_TEXTO = {
  obra: { guarda: "certificado.seGuardaEnObra", corto: "certificado.destinoObra" },
  copia: { guarda: "certificado.seGuardaEnCopia", corto: "certificado.destinoCopia" },
  venta: { guarda: "certificado.seGuardaEnVenta", corto: "certificado.destinoVenta" },
} as const satisfies Record<string, { guarda: TranslationKey; corto: TranslationKey }>;
/** Los datos del registro que se pueden corregir desde el certificado, por campo del certificado. */
const CLAVES_CORREGIBLES = Object.keys(DESTINO_CORRECCION) as CampoCorregible[];
export function CertificadoEditor({
  datos,
  modelosDisponibles,
  idiomaInicial,
  nombreArchivo,
  onEditarObra,
  onEditarCopia,
  onEditarVenta,
  guardarCorrecciones,
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
  /** Guarda las correcciones en el registro (obra, copia y venta) y recarga la pantalla de atras. */
  guardarCorrecciones: (correcciones: CorreccionesRegistro) => Promise<void>;
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

  // Datos del registro tal como estan guardados (cambian al guardar correcciones), y correcciones aun sin guardar.
  const [datosBase, setDatosBase] = useState(datos);
  const [correcciones, setCorrecciones] = useState<CorreccionesRegistro>({});
  const [modoRegistro, setModoRegistro] = useState<"cerrado" | "aviso" | "editando">("cerrado");
  const [guardandoRegistro, setGuardandoRegistro] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  const modelo: Modelo = formato === "fichaSinGaleria" ? "ficha" : formato;
  const sinFirmaGaleria = formato === "fichaSinGaleria";
  const esFicha = modelo === "ficha";
  const esClasico = modelo === "clasico";
  // Con las correcciones sin guardar la vista previa ya muestra el dato corregido; pero que un campo salga
  // en gris o habilitado depende de lo que esta guardado en el registro, no de lo que se este tipeando.
  const datosVigentes = useMemo(() => ({ ...datosBase, ...correcciones }), [datosBase, correcciones]);
  const deStudio = useMemo(() => valoresDeStudio(datosVigentes, modelo), [datosVigentes, modelo]);
  const deRegistro = useMemo(() => valoresDeStudio(datosBase, modelo), [datosBase, modelo]);

  // Solo lo que realmente cambio respecto de lo guardado (sin espacios de mas).
  const cambios = useMemo(() => {
    const c: CorreccionesRegistro = {};
    for (const clave of CLAVES_CORREGIBLES) {
      const nuevo = correcciones[clave]?.trim();
      if (nuevo !== undefined && nuevo !== datosBase[clave].trim()) c[clave] = nuevo;
    }
    return c;
  }, [correcciones, datosBase]);
  const clavesConCambios = camposConCambios(cambios);

  const cert = useMemo<Certificado>(() => {
    const c: Certificado = {
      ...certificadoVacio(idioma),
      ...manual,
      ...deStudio,
      modelo,
      sinFirmaGaleria,
      sinCopyright: datosBase.sintografia,
      tamanoHoja,
      idioma,
      guiasCorte,
    };
    if (!incluirFirma) {
      if (deStudio.firmaArtista) c.firmaArtista = null;
      if (deStudio.galeriaFirma) c.galeriaFirma = null;
    }
    if (!incluirLogo && deStudio.logo) c.logo = null;
    return c;
  }, [manual, deStudio, modelo, sinFirmaGaleria, datosBase.sintografia, tamanoHoja, idioma, guiasCorte, incluirFirma, incluirLogo]);

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

  /**
   * Al apretar Enter en un campo de texto, fecha o casilla, pasa al campo
   * siguiente en vez de no hacer nada. En un renglon de texto (textarea)
   * Enter sigue agregando un renglon, y en un boton hace su accion normal.
   */
  function alApretarEnterEnCampo(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter") return;
    const objetivo = e.target as HTMLElement;
    if (objetivo.tagName === "TEXTAREA" || objetivo.tagName === "BUTTON") return;
    const formulario = objetivo.closest(".certificado-formulario");
    if (!formulario) return;
    const campos = Array.from(formulario.querySelectorAll<HTMLElement>("input:not([type=file]), textarea, select")).filter(
      (el) => el.offsetParent !== null && !(el as HTMLInputElement).disabled,
    );
    const indice = campos.indexOf(objetivo);
    if (indice === -1 || indice === campos.length - 1) return;
    e.preventDefault();
    campos[indice + 1].focus();
  }

  function corregir(clave: CampoCorregible, valor: string) {
    setCorrecciones((c) => ({ ...c, [clave]: valor }));
    setErrorRegistro(null);
  }

  function descartarCorrecciones() {
    setCorrecciones({});
    setErrorRegistro(null);
    setModoRegistro("cerrado");
  }

  function textoDeError(e: ErrorCorreccion): string {
    const clave = e.motivo === "obligatorio" ? "certificado.errorObligatorio" : e.motivo === "anio" ? "certificado.errorAnio" : "certificado.errorFecha";
    return t(clave, { campo: t(ETIQUETA_CORREGIBLE[e.campo]) });
  }

  /** Escribe las correcciones en el registro. Devuelve true si se guardaron. */
  async function guardarRegistro(): Promise<boolean> {
    const errores = validarCorrecciones(cambios);
    if (errores.length > 0) {
      setErrorRegistro(textoDeError(errores[0]));
      return false;
    }
    setGuardandoRegistro(true);
    setErrorRegistro(null);
    try {
      await guardarCorrecciones(cambios);
      setDatosBase((d) => ({ ...d, ...cambios }));
      setCorrecciones({});
      setModoRegistro("cerrado");
      setMensaje({ tipo: "ok", texto: t("certificado.registroActualizado") });
      return true;
    } catch (e) {
      setErrorRegistro(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setGuardandoRegistro(false);
    }
  }

  /** Cierra la pantalla; si hay correcciones sin guardar, antes pregunta que hacer con ellas. */
  function salir() {
    if (clavesConCambios.length > 0) setConfirmandoSalida(true);
    else onClose();
  }

  /** A que dato del registro corresponde un campo del certificado (null si no se puede corregir desde aca). */
  function claveCorregible(campo: CampoTexto): CampoCorregible | null {
    switch (campo) {
      case "titulo":
      case "serieProyecto":
      case "anioEdicion":
      case "medidas":
      case "ubicacionFirma":
      case "lugar":
      case "fecha":
        return campo;
      // La ficha muestra el año de la obra si lo tiene; si no, el de la toma (igual que valoresDeStudio).
      case "anioToma":
        return esFicha && datosBase.anioPeriodo ? "anioPeriodo" : "anioCaptura";
      default:
        return null;
    }
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
    const bloqueado = campo in deRegistro;
    const clave = claveCorregible(campo);
    // En "Corregir datos del registro" los datos corregibles se habilitan y se marcan con donde se guardan.
    const corrigiendo = bloqueado && modoRegistro === "editando" && clave !== null;
    const propiedades = corrigiendo
      ? {
          value: correcciones[clave] ?? datosBase[clave],
          disabled: false,
          title: undefined,
          onChange: (e: { target: { value: string } }) => corregir(clave, e.target.value),
        }
      : {
          value: cert[campo] as string,
          disabled: bloqueado,
          title: bloqueado ? t(clave ? "certificado.campoCorregible" : "certificado.campoDeRegistro") : undefined,
          onChange: (e: { target: { value: string } }) => completar(campo, e.target.value),
        };
    return (
      <label className={`certificado-campo${opciones.medio ? " certificado-campo-medio" : ""}${corrigiendo ? " certificado-campo-registro" : ""}`}>
        <span className="certificado-etiqueta">{t(etiqueta)}</span>
        {opciones.renglones ? (
          <textarea rows={opciones.renglones} {...propiedades} />
        ) : (
          <input type={opciones.fecha ? "date" : "text"} {...propiedades} />
        )}
        {corrigiendo && <span className="certificado-destino">{t(DESTINO_TEXTO[DESTINO_CORRECCION[clave]].guarda)}</span>}
      </label>
    );
  }

  /** Al corregir el registro, la impresion se corrige en sus dos partes (tipo y soporte), cada una en su columna de la copia. */
  function impresionCorregible() {
    const partes: { clave: "tipoImpresion" | "soporteImpresion"; etiqueta: TranslationKey }[] = [
      { clave: "tipoImpresion", etiqueta: "obraDetail.tipoImpresionLabel" },
      { clave: "soporteImpresion", etiqueta: "obraDetail.soporteImpresion" },
    ];
    return partes.map(({ clave, etiqueta }) => (
      <label key={clave} className="certificado-campo certificado-campo-registro">
        <span className="certificado-etiqueta">{t(etiqueta)}</span>
        <input type="text" value={correcciones[clave] ?? datosBase[clave]} onChange={(e) => corregir(clave, e.target.value)} />
        <span className="certificado-destino">{t(DESTINO_TEXTO.copia.guarda)}</span>
      </label>
    ));
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
    <Modal onClose={salir} className="modal-content-certificado">
      <div className="certificado-editor">
        <section className="certificado-formulario" onKeyDown={alApretarEnterEnCampo}>
          <h2>{t("certificado.titulo")}</h2>

          <Seccion titulo={t("certificado.seccionFormato")}>
            {datosBase.sintografia && <p className="certificado-ayuda">{t("certificado.sinCopyrightAyuda")}</p>}
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
              {(
                [
                  ["certificado.editarEnObra", onEditarObra],
                  ["certificado.editarEnCopia", onEditarCopia],
                  ["certificado.editarEnVenta", onEditarVenta],
                ] as const
              ).map(([texto, accion]) => (
                <button
                  key={texto}
                  type="button"
                  className="certificado-boton"
                  onClick={accion}
                  disabled={modoRegistro === "editando"}
                  title={modoRegistro === "editando" ? t("certificado.botonesBloqueados") : undefined}
                >
                  {t(texto)}
                </button>
              ))}
              {modoRegistro === "cerrado" && (
                <button type="button" className="certificado-boton certificado-boton-corregir" onClick={() => setModoRegistro("aviso")}>
                  {t("certificado.corregirDatos")}
                </button>
              )}
            </div>

            {modoRegistro === "aviso" && (
              <div className="certificado-aviso" role="alert">
                <strong>{t("certificado.avisoTitulo")}</strong>
                <p>{t("certificado.avisoTexto")}</p>
                <div className="certificado-acciones-registro">
                  <button type="button" className="certificado-boton certificado-boton-corregir" onClick={() => setModoRegistro("editando")}>
                    {t("certificado.avisoConfirmar")}
                  </button>
                  <button type="button" className="certificado-boton" onClick={() => setModoRegistro("cerrado")}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}

            {modoRegistro === "editando" && (
              <div className="certificado-aviso certificado-aviso-editando" role="status">
                <strong>{t("certificado.editandoTitulo")}</strong>
                <p>{t("certificado.editandoTexto")}</p>
                <p>
                  {clavesConCambios.length === 0
                    ? t("certificado.sinCambios")
                    : t("certificado.cambiosPendientes", {
                        lista: clavesConCambios
                          .map((c) => `${t(ETIQUETA_CORREGIBLE[c])} (${t(DESTINO_TEXTO[DESTINO_CORRECCION[c]].corto)})`)
                          .join(", "),
                      })}
                </p>
                {errorRegistro && <p className="error">{errorRegistro}</p>}
                <div className="certificado-acciones-registro">
                  <button
                    type="button"
                    className="certificado-boton certificado-boton-corregir"
                    onClick={guardarRegistro}
                    disabled={guardandoRegistro || clavesConCambios.length === 0}
                  >
                    {guardandoRegistro ? t("common.saving") : t("certificado.guardarCambiosRegistro")}
                  </button>
                  <button type="button" className="certificado-boton" onClick={descartarCorrecciones} disabled={guardandoRegistro}>
                    {t("certificado.descartarCambios")}
                  </button>
                </div>
              </div>
            )}

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
              {modoRegistro === "editando" && "impresion" in deRegistro
                ? impresionCorregible()
                : texto("impresion", esFicha ? "certificado.materiales" : "certificado.impresion", { renglones: 2 })}
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
          {confirmandoSalida && (
            <div className="certificado-aviso" role="alert">
              <strong>{t("certificado.salirSinGuardar")}</strong>
              <p>
                {t("certificado.cambiosPendientes", {
                  lista: clavesConCambios
                    .map((c) => `${t(ETIQUETA_CORREGIBLE[c])} (${t(DESTINO_TEXTO[DESTINO_CORRECCION[c]].corto)})`)
                    .join(", "),
                })}
              </p>
              {errorRegistro && <p className="error">{errorRegistro}</p>}
              <div className="certificado-acciones-registro">
                <button
                  type="button"
                  className="certificado-boton certificado-boton-corregir"
                  disabled={guardandoRegistro}
                  onClick={async () => {
                    if (await guardarRegistro()) onClose();
                    else setConfirmandoSalida(false);
                  }}
                >
                  {guardandoRegistro ? t("common.saving") : t("certificado.guardarYSalir")}
                </button>
                <button type="button" className="certificado-boton" disabled={guardandoRegistro} onClick={onClose}>
                  {t("certificado.descartarYSalir")}
                </button>
                <button type="button" className="certificado-boton" disabled={guardandoRegistro} onClick={() => setConfirmandoSalida(false)}>
                  {t("obraDetail.seguirEditando")}
                </button>
              </div>
            </div>
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
            <button type="button" onClick={salir} disabled={guardando}>
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

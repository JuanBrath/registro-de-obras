import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  derivarAnioDesdeFecha,
  derivarEsSeriadaObraGrafica,
  formatTags,
  formatearNumeroEjemplar,
  formatearNumeroPruebaArtista,
  generarEjemplarUnico,
  generarEjemplares,
  obraMiniaturaPath,
  obraOriginalPath,
  type CategoriaObra,
  type SubtipoObraGrafica,
} from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import {
  ObraDetalleFields,
  initialObraDetalleFieldsState,
  type ObraDetalleFieldsState,
} from "./fields/ObraDetalleFields.js";
import { FotografiaFields, initialFotografiaFieldsState, type FotografiaFieldsState } from "./fields/FotografiaFields.js";
import {
  EdicionDetalleRow,
  initialEdicionDetalleState,
  type EdicionDetalleState,
} from "./fields/EdicionDetalleFields.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { FilePathField } from "../components/FilePathField.js";
import { ArtistaSelector } from "../components/ArtistaSelector.js";
import { TagPicker } from "../components/TagPicker.js";
import { ImageFileField } from "../components/ImageFileField.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";

export function ObraForm({
  onEditProfile,
  onCancel,
  onViewObra,
  onVerObras,
}: {
  onEditProfile?: () => void;
  onCancel: () => void;
  onViewObra: (obraId: number) => void;
  onVerObras: () => void;
}) {
  const { context, personalArtista } = useWorkspace();
  const { t } = useLanguage();
  const esRegistroPersonal = context?.workspace === "personal";

  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [codigoInventario, setCodigoInventario] = useState("");
  const [anioPeriodo, setAnioPeriodo] = useState("");
  const [regimenIngreso, setRegimenIngreso] = useState("");
  const [historialProcedenciaExhibiciones, setHistorialProcedenciaExhibiciones] = useState("");
  const [selectedArtistaId, setSelectedArtistaId] = useState<number | null>(null);
  const [ubicacion, setUbicacion] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Sin categoria por defecto: asi el bloque de "informacion de la obra" solo
  // se despliega cuando el usuario efectivamente elige una, en vez de mostrar
  // ya los campos de Fotografia sin que nadie haya elegido nada.
  const [categoria, setCategoria] = useState<CategoriaObra | null>(null);

  const [fotografia, setFotografia] = useState<FotografiaFieldsState>(initialFotografiaFieldsState);
  const [obraDetalle, setObraDetalle] = useState<ObraDetalleFieldsState>(initialObraDetalleFieldsState);

  const [cantidadTotalEdiciones, setCantidadTotalEdiciones] = useState("1");
  const [hayPruebaAutor, setHayPruebaAutor] = useState(false);
  const [cantidadPruebaAutor, setCantidadPruebaAutor] = useState("1");
  // La advertencia de "excede el 10%" es solo informativa: una vez que el
  // usuario cargo la cantidad (no bien toca el campo), se deja de mostrar en
  // vez de quedar fija en pantalla.
  const [advertenciaPruebaAutorVista, setAdvertenciaPruebaAutorVista] = useState(false);
  const [detallesEdiciones, setDetallesEdiciones] = useState<{
    edicion: EdicionDetalleState[];
    prueba_artista: EdicionDetalleState[];
  }>({ edicion: [], prueba_artista: [] });
  const [expandedEdicionKey, setExpandedEdicionKey] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; obraId: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const tituloInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    };
  }, []);

  // Foco inicial en Titulo para que el usuario vea de entrada donde esta
  // parado (el cursor titilando), en vez de un formulario sin nada enfocado.
  useEffect(() => {
    tituloInputRef.current?.focus();
  }, []);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    if (file) {
      const url = URL.createObjectURL(file);
      imagePreviewUrlRef.current = url;
      setImagePreviewUrl(url);
    } else {
      imagePreviewUrlRef.current = null;
      setImagePreviewUrl(null);
    }
  }

  function resetForm() {
    setTitulo("");
    setSubtitulo("");
    setCodigoInventario("");
    setAnioPeriodo("");
    setRegimenIngreso("");
    setHistorialProcedenciaExhibiciones("");
    setSelectedArtistaId(null);
    setUbicacion("");
    setTags([]);
    setCategoria(null);
    setFotografia(initialFotografiaFieldsState);
    setObraDetalle(initialObraDetalleFieldsState);
    setCantidadTotalEdiciones("1");
    setHayPruebaAutor(false);
    setCantidadPruebaAutor("1");
    setAdvertenciaPruebaAutorVista(false);
    setDetallesEdiciones({ edicion: [], prueba_artista: [] });
    setExpandedEdicionKey(null);
    handleImageChange(null);
  }

  function handleContinue() {
    setResult(null);
    resetForm();
  }

  const esSeriada =
    categoria === "Fotografia"
      ? fotografia.esSeriada
      : categoria === "ObraGrafica"
        ? obraDetalle.subtipo
          ? derivarEsSeriadaObraGrafica(obraDetalle.subtipo as SubtipoObraGrafica)
          : false
        : categoria
          ? obraDetalle.esSeriada
          : false;

  const cantidadEdicionesNum = Math.max(1, parseInt(cantidadTotalEdiciones, 10) || 1);
  const cantidadPruebaAutorNum = hayPruebaAutor ? Math.max(0, parseInt(cantidadPruebaAutor, 10) || 0) : 0;
  const excedePruebaAutor =
    hayPruebaAutor && cantidadPruebaAutorNum > cantidadEdicionesNum * 0.1 && !advertenciaPruebaAutorVista;

  // Mantiene un bloque de detalle por cada edicion y prueba de autor,
  // sincronizado con la cantidad tipeada: asi se puede completar info de
  // cada copia (si ya se tiene) en el momento de cargar la obra, en vez de
  // recien poder hacerlo despues editando cada ejemplar en ObraDetail.
  useEffect(() => {
    if (!esSeriada) return;
    function resize(arr: EdicionDetalleState[], size: number): EdicionDetalleState[] {
      if (arr.length === size) return arr;
      const next = arr.slice(0, size);
      while (next.length < size) next.push({ ...initialEdicionDetalleState });
      return next;
    }
    setDetallesEdiciones((prev) => {
      const edicion = resize(prev.edicion, cantidadEdicionesNum);
      const prueba_artista = resize(prev.prueba_artista, cantidadPruebaAutorNum);
      if (edicion === prev.edicion && prueba_artista === prev.prueba_artista) return prev;
      return { edicion, prueba_artista };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esSeriada, cantidadEdicionesNum, cantidadPruebaAutorNum]);

  if (!context) return null;

  const esFotografia = categoria === "Fotografia";
  const esFotografiaDigital = esFotografia && fotografia.subtipoFotografia === "DigitalFineArt";
  const esFotografiaDigitalOSintografia =
    esFotografia &&
    (fotografia.subtipoFotografia === "DigitalFineArt" || fotografia.subtipoFotografia === "Sintografia");
  const permiteEnmarcado =
    categoria === "Fotografia" || categoria === "Pintura" || categoria === "ObraGrafica" || categoria === "Dibujo";
  const esObraGrafica = categoria === "ObraGrafica";
  const esEscultura = categoria === "Escultura";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const { db, fs } = context!;

      if (!esRegistroPersonal && !selectedArtistaId) {
        throw new Error(t("obraForm.errorElegirArtista"));
      }
      if (!categoria) {
        throw new Error(t("obraForm.errorElegirCategoria"));
      }
      const artistaId = esRegistroPersonal ? personalArtista!.id : selectedArtistaId!;
      const cantidad = Math.max(1, parseInt(cantidadTotalEdiciones, 10) || 1);

      const obraId = await db.transaction(async (tx) => {
        const insertObra = await tx.execute(
          `INSERT INTO obra (
             titulo, categoria_obra, artista_id, estado, ubicacion_fisica_actual, es_seriada, tags,
             subtitulo, codigo_inventario, anio_periodo, regimen_ingreso, historial_procedencia_exhibiciones
           )
           VALUES (?, ?, ?, 'disponible', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            titulo,
            categoria,
            artistaId,
            ubicacion || null,
            esSeriada ? 1 : 0,
            formatTags(tags) || null,
            subtitulo || null,
            codigoInventario || null,
            anioPeriodo || null,
            regimenIngreso || null,
            historialProcedenciaExhibiciones || null,
          ],
        );
        const id = insertObra.lastInsertId;
        if (!id) throw new Error("No se pudo crear la obra");

        if (categoria === "Fotografia") {
          await tx.execute(
            `INSERT INTO obra_fotografia (
               obra_id, subtipo_fotografia, fecha_captura, anio_toma, fecha_edicion, software_edicion, dimensiones,
               tecnica, escala_por_tamanos, serie_proyecto, clasificacion_positivado, proceso_quimico_analogica,
               viraje_conservacion, formato_negativo, estado_negativo, formato_archivo_maestro, espacio_color,
               condiciones_custodia_archivo, proceso_quimico_historicos, preparacion_soporte, metales_sales,
               pieza_unica_o_matriz, estructura_objeto, contenedor_estuche, incluye_copia_coleccionista,
               detalle_copia_coleccionista, creditos_editoriales, isbn, colofon, motor_ia, prompt_parametros,
               flujo_generativo, intervencion_postproduccion, soporte_salida, declaracion_derechos_ia
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              fotografia.subtipoFotografia,
              fotografia.fechaCaptura || null,
              derivarAnioDesdeFecha(fotografia.fechaCaptura),
              fotografia.fechaEdicion || null,
              fotografia.softwareEdicion || null,
              fotografia.dimensiones || null,
              fotografia.tecnica || null,
              fotografia.escalaPorTamanos || null,
              fotografia.serieProyecto || null,
              fotografia.clasificacionPositivado || null,
              fotografia.procesoQuimicoAnalogica || null,
              fotografia.virajeConservacion || null,
              fotografia.formatoNegativo || null,
              fotografia.estadoNegativo || null,
              fotografia.formatoArchivoMaestro || null,
              fotografia.espacioColor || null,
              fotografia.condicionesCustodiaArchivo || null,
              fotografia.procesoQuimicoHistoricos || null,
              fotografia.preparacionSoporte || null,
              fotografia.metalesSales || null,
              fotografia.piezaUnicaOMatriz || null,
              fotografia.estructuraObjeto || null,
              fotografia.contenedorEstuche || null,
              fotografia.incluyeCopiaColeccionista ? 1 : 0,
              fotografia.detalleCopiaColeccionista || null,
              fotografia.creditosEditoriales || null,
              fotografia.isbn || null,
              fotografia.colofon || null,
              fotografia.motorIa || null,
              fotografia.promptParametros || null,
              fotografia.flujoGenerativo || null,
              fotografia.intervencionPostproduccion || null,
              fotografia.soporteSalida || null,
              fotografia.declaracionDerechosIa || null,
            ],
          );
        } else {
          await tx.execute(
            `INSERT INTO obra_detalle (
               obra_id, subtipo, tecnica_material, soporte, tecnica, dimensiones, peso, fecha_creacion,
               materiales_mixtura, tipo_bastidor, imprimacion_base, profundidad_relieve, configuracion_panel,
               estabilidad_capas, barniz_proteccion, sensibilidad_ambiental, estado_cantos,
               matriz_material, matriz_estado, papel_marca, papel_gramaje, papel_caracteristicas, editor_publicador,
               materiales_principales, acabado_patina, elementos_complementarios, apta_exterior, requisitos_instalacion
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              obraDetalle.subtipo || null,
              obraDetalle.tecnicaMaterial || null,
              obraDetalle.soporte || null,
              obraDetalle.tecnica || null,
              obraDetalle.dimensiones || null,
              obraDetalle.peso || null,
              obraDetalle.fechaCreacion || null,
              obraDetalle.materialesMixtura || null,
              obraDetalle.tipoBastidor || null,
              obraDetalle.imprimacionBase || null,
              obraDetalle.profundidadRelieve || null,
              obraDetalle.configuracionPanel || null,
              obraDetalle.estabilidadCapas || null,
              obraDetalle.barnizProteccion || null,
              obraDetalle.sensibilidadAmbiental || null,
              obraDetalle.estadoCantos || null,
              obraDetalle.matrizMaterial || null,
              obraDetalle.matrizEstado || null,
              obraDetalle.papelMarca || null,
              obraDetalle.papelGramaje || null,
              obraDetalle.papelCaracteristicas || null,
              obraDetalle.editorPublicador || null,
              obraDetalle.materialesPrincipales || null,
              obraDetalle.acabadoPatina || null,
              obraDetalle.elementosComplementarios || null,
              obraDetalle.aptaExterior || null,
              obraDetalle.requisitosInstalacion || null,
            ],
          );
        }

        const ejemplares = esSeriada
          ? generarEjemplares(cantidad, cantidadPruebaAutorNum)
          : [generarEjemplarUnico()];
        for (const ejemplar of ejemplares) {
          const detalle = detallesEdiciones[ejemplar.tipo]?.[ejemplar.indice - 1];
          await tx.execute(
            `INSERT INTO ejemplar (
               obra_id, tipo, indice, total_ediciones, numero, fecha_impresion, tipo_impresion, soporte_impresion,
               tipo_tintas, taller_impresion, ubicacion_actual, dimensiones, tipo_enmarcado, tamano_final_enmarcado,
               ubicacion_firma, sello_seco_holograma, notas, coa_numero, coa_emisor, coa_fecha, valor_seguro,
               moneda_seguro, vidrio_proteccion_frontal, sistema_cuelgue, coa_sistema_seguridad,
               informe_conservacion, dimensiones_soporte_completo, peso, tipo_firma, clasificacion_prueba_especial,
               instrucciones_manipulacion
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ejemplar.tipo,
              ejemplar.indice,
              ejemplar.totalEdiciones,
              ejemplar.numero,
              detalle?.fechaImpresion || null,
              detalle?.tipoImpresion || null,
              detalle?.soporteImpresion || null,
              detalle?.tipoTintas || null,
              detalle?.tallerImpresion || null,
              detalle?.ubicacionActual || null,
              detalle?.dimensiones || null,
              detalle?.tipoEnmarcado || null,
              detalle?.tamanoFinalEnmarcado || null,
              detalle?.ubicacionFirma || null,
              detalle?.selloSecoHolograma || null,
              detalle?.notas || null,
              detalle?.coaNumero || null,
              detalle?.coaEmisor || null,
              detalle?.coaFecha || null,
              detalle?.valorSeguro ? parseFloat(detalle.valorSeguro) : null,
              detalle?.valorSeguro ? detalle.monedaSeguro : null,
              detalle?.vidrioProteccionFrontal || null,
              detalle?.sistemaCuelgue || null,
              detalle?.coaSistemaSeguridad || null,
              detalle?.informeConservacion || null,
              detalle?.dimensionesSoporteCompleto || null,
              detalle?.peso || null,
              detalle?.tipoFirma || null,
              detalle?.clasificacionPruebaEspecial || null,
              detalle?.instruccionesManipulacion || null,
            ],
          );
        }

        await tx.execute(`INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'creacion', ?)`, [
          id,
          `Obra "${titulo}" creada`,
        ]);

        if (imageFile) {
          const ext = imageFile.name.split(".").pop() || "jpg";
          const bytes = new Uint8Array(await imageFile.arrayBuffer());
          const originalPath = obraOriginalPath(id, ext);
          const miniaturaPath = obraMiniaturaPath(id);

          await fs.writeFile(originalPath, bytes);
          await fs.writeFile(miniaturaPath, bytes);

          await tx.execute(`UPDATE obra SET imagen_alta_resolucion_path = ?, miniatura_path = ? WHERE id = ?`, [
            originalPath,
            miniaturaPath,
            id,
          ]);
        }

        return id;
      });

      setResult({
        message:
          t("obraForm.resultSaved", { titulo, id: obraId }) +
          (esSeriada ? t("obraForm.edicionesGeneradas", { cantidad }) : "") +
          ".",
        obraId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="obra-form-saved">
        <p className="success" role="status">
          ✅ {result.message}
        </p>
        <div className="obra-form-saved-actions">
          <button type="button" onClick={handleContinue}>
            {t("obraForm.cargarOtra")}
          </button>
          <button type="button" onClick={() => onViewObra(result.obraId)}>
            {t("obraForm.verEstaObra")}
          </button>
          <button type="button" onClick={onVerObras}>
            {t("obraForm.volverAObras")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="obra-form" onSubmit={handleSubmit} onKeyDown={focusNextOnEnter}>
      <div className="obra-form-header">
        <h2>{t("obraForm.tituloNueva")}</h2>
        <button type="button" onClick={onCancel}>
          {t("obraForm.cancelarVolver")}
        </button>
      </div>

      {esRegistroPersonal && personalArtista && (
        <p className="field-note">
          {t("obraForm.artista")} <strong>{personalArtista.nombreCompleto}</strong>{" "}
          {onEditProfile && (
            <button type="button" onClick={onEditProfile}>
              {t("obraForm.editarMisDatos")}
            </button>
          )}
        </p>
      )}

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.artistaLabel")}
          <ArtistaSelector value={selectedArtistaId} onChange={setSelectedArtistaId} />
        </label>
      )}

      <label>
        {t("obraForm.imagenLabel")}
        {imagePreviewUrl && <img src={imagePreviewUrl} alt="" className="obra-edit-imagen-actual" />}
        <ImageFileField value={imageFile} onChange={handleImageChange} />
      </label>

      <label>
        {t("obraForm.tituloLabel")}
        <input
          ref={tituloInputRef}
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </label>

      <label>
        {t("obraForm.subtituloLabel")} <HelpIcon fieldKey="subtitulo" />
        <input type="text" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
      </label>

      <label>
        {t("obraForm.codigoInventarioLabel")} <HelpIcon fieldKey="codigo_inventario" />
        <input type="text" value={codigoInventario} onChange={(e) => setCodigoInventario(e.target.value)} />
      </label>

      <label>
        {t("obraForm.anioPeriodoLabel")} <HelpIcon fieldKey="anio_periodo" />
        <input type="text" value={anioPeriodo} onChange={(e) => setAnioPeriodo(e.target.value)} />
      </label>

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.regimenIngresoLabel")} <HelpIcon fieldKey="regimen_ingreso" />
          <select value={regimenIngreso} onChange={(e) => setRegimenIngreso(e.target.value)}>
            <option value="">—</option>
            <option value="ConsignacionTaller">{t("obraForm.regimenIngresoConsignacionTaller")}</option>
            <option value="DepositoColeccionPrivada">
              {t("obraForm.regimenIngresoDepositoColeccionPrivada")}
            </option>
            <option value="CompraFirmeGaleria">{t("obraForm.regimenIngresoCompraFirmeGaleria")}</option>
          </select>
        </label>
      )}

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.historialProcedenciaExhibicionesLabel")}{" "}
          <HelpIcon fieldKey="historial_procedencia_exhibiciones" />
          <textarea
            rows={3}
            value={historialProcedenciaExhibiciones}
            onChange={(e) => setHistorialProcedenciaExhibiciones(e.target.value)}
          />
        </label>
      )}

      <label>
        {t("obraForm.categoriaLabel")} <HelpIcon fieldKey="categoria_obra" />
        <select
          required
          value={categoria ?? ""}
          onChange={(e) => setCategoria((e.target.value || null) as CategoriaObra | null)}
        >
          <option value="" disabled>
            {t("obraForm.elegirCategoria")}
          </option>
          <option value="Fotografia">{t("fields.fotografia.legend")}</option>
          <option value="Pintura">{t("fields.pintura.legend")}</option>
          <option value="ObraGrafica">{t("fields.obraGrafica.legend")}</option>
          <option value="Escultura">{t("fields.escultura.legend")}</option>
          <option value="Dibujo">{t("fields.dibujo.legend")}</option>
          <option value="TextilCeramica">{t("fields.textilCeramica.legend")}</option>
          <option value="NuevosMedios">{t("fields.nuevosMedios.legend")}</option>
        </select>
      </label>

      {/* A partir de aca, informacion de la obra: depende de la categoria elegida arriba. */}
      {categoria && (
        <>
          {esRegistroPersonal && categoria !== "Fotografia" && (
            <label>
              {t("obraForm.ubicacionLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
              <FilePathField value={ubicacion} onChange={setUbicacion} />
            </label>
          )}

          {categoria === "Fotografia" && (
            <FotografiaFields
              value={fotografia}
              onChange={setFotografia}
              mostrarSoftwareEdicion={esRegistroPersonal}
              mostrarEsSeriada={false}
              ubicacion={ubicacion}
              onUbicacionChange={setUbicacion}
              mostrarUbicacion={esRegistroPersonal}
            />
          )}
          {categoria && categoria !== "Fotografia" && (
            <ObraDetalleFields categoria={categoria} value={obraDetalle} onChange={setObraDetalle} mostrarEsSeriada={false} />
          )}

          <label>
            {t("obraForm.etiquetasLabel")}
            <TagPicker value={tags} onChange={setTags} />
          </label>

          {categoria === "Fotografia" && (
            <label>
              <input
                type="checkbox"
                checked={fotografia.esSeriada}
                onChange={(e) => setFotografia({ ...fotografia, esSeriada: e.target.checked })}
              />
              {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
            </label>
          )}
          {categoria === "ObraGrafica" && obraDetalle.subtipo && (
            <p className="field-note">
              {t("fields.pintura.esSeriadaPrefix")} <strong>{esSeriada ? t("common.yes") : t("common.no")}</strong>{" "}
              {t("fields.pintura.esSeriadaSuffix")} <HelpIcon fieldKey="es_seriada" />
            </p>
          )}
          {categoria && categoria !== "Fotografia" && categoria !== "ObraGrafica" && (
            <label>
              <input
                type="checkbox"
                checked={obraDetalle.esSeriada}
                onChange={(e) => setObraDetalle({ ...obraDetalle, esSeriada: e.target.checked })}
              />
              {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
            </label>
          )}

          {esSeriada && (
            <label>
              <input
                type="checkbox"
                checked={hayPruebaAutor}
                onChange={(e) => {
                  setHayPruebaAutor(e.target.checked);
                  setAdvertenciaPruebaAutorVista(false);
                }}
              />
              {t("obraForm.hayPruebaAutorLabel")} <HelpIcon fieldKey="pruebas_artista" />
            </label>
          )}

          {esSeriada && hayPruebaAutor && (
            <label>
              {t("obraForm.cantidadPruebaAutorLabel")}
              <input
                type="number"
                min={0}
                value={cantidadPruebaAutor}
                onChange={(e) => {
                  setCantidadPruebaAutor(e.target.value);
                  setAdvertenciaPruebaAutorVista(true);
                }}
              />
            </label>
          )}

          {esSeriada && excedePruebaAutor && (
            <p className="error" role="alert">
              ⚠️ {t("obraForm.advertenciaPruebaAutor")}
            </p>
          )}

          {esSeriada && (
            <label>
              {t("obraForm.cantidadEdicionesLabel")}
              <input
                type="number"
                min={1}
                value={cantidadTotalEdiciones}
                onChange={(e) => setCantidadTotalEdiciones(e.target.value)}
              />
            </label>
          )}

          {esSeriada && (detallesEdiciones.edicion.length > 0 || detallesEdiciones.prueba_artista.length > 0) && (
            <div className="obra-form-detalles-ediciones">
              <p className="field-note">{t("obraForm.detalleEdicionesNota")}</p>
              {detallesEdiciones.edicion.map((detalle, i) => {
                const key = `edicion-${i}`;
                return (
                  <EdicionDetalleRow
                    key={key}
                    numero={formatearNumeroEjemplar(i + 1, detallesEdiciones.edicion.length)}
                    value={detalle}
                    onChange={(next) =>
                      setDetallesEdiciones((prev) => ({
                        ...prev,
                        edicion: prev.edicion.map((d, idx) => (idx === i ? next : d)),
                      }))
                    }
                    editing={expandedEdicionKey === key}
                    onStartEdit={() => setExpandedEdicionKey(key)}
                    onStopEdit={() => setExpandedEdicionKey(null)}
                    esFotografia={esFotografia}
                    esFotografiaDigital={esFotografiaDigital}
                    esFotografiaDigitalOSintografia={esFotografiaDigitalOSintografia}
                    permiteEnmarcado={permiteEnmarcado}
                    esPruebaArtista={false}
                    esGaleria={!esRegistroPersonal}
                    esObraGrafica={esObraGrafica}
                    esEscultura={esEscultura}
                  />
                );
              })}
              {detallesEdiciones.prueba_artista.map((detalle, i) => {
                const key = `prueba_artista-${i}`;
                return (
                  <EdicionDetalleRow
                    key={key}
                    numero={formatearNumeroPruebaArtista(i + 1, detallesEdiciones.prueba_artista.length)}
                    value={detalle}
                    onChange={(next) =>
                      setDetallesEdiciones((prev) => ({
                        ...prev,
                        prueba_artista: prev.prueba_artista.map((d, idx) => (idx === i ? next : d)),
                      }))
                    }
                    editing={expandedEdicionKey === key}
                    onStartEdit={() => setExpandedEdicionKey(key)}
                    onStopEdit={() => setExpandedEdicionKey(null)}
                    esFotografia={esFotografia}
                    esFotografiaDigital={esFotografiaDigital}
                    esFotografiaDigitalOSintografia={esFotografiaDigitalOSintografia}
                    permiteEnmarcado={permiteEnmarcado}
                    esPruebaArtista={true}
                    esGaleria={!esRegistroPersonal}
                    esObraGrafica={esObraGrafica}
                    esEscultura={esEscultura}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? t("common.saving") : t("obraForm.guardarObra")}
      </button>

      {error && (
        <p className="error" role="alert">
          ⚠️ {t("obraForm.errorNoSePudoGuardar", { error })}
        </p>
      )}
    </form>
  );
}

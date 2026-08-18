import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  derivarAnioDesdeFecha,
  formatTags,
  generarEjemplarUnico,
  generarEjemplares,
  obraMiniaturaPath,
  obraOriginalPath,
  type CategoriaObra,
} from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { EsculturaFields, initialEsculturaFieldsState, type EsculturaFieldsState } from "./fields/EsculturaFields.js";
import { FotografiaFields, initialFotografiaFieldsState, type FotografiaFieldsState } from "./fields/FotografiaFields.js";
import { PinturaFields, initialPinturaFieldsState, type PinturaFieldsState } from "./fields/PinturaFields.js";
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
  const [selectedArtistaId, setSelectedArtistaId] = useState<number | null>(null);
  const [ubicacion, setUbicacion] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<CategoriaObra>("Fotografia");

  const [fotografia, setFotografia] = useState<FotografiaFieldsState>(initialFotografiaFieldsState);
  const [pintura, setPintura] = useState<PinturaFieldsState>(initialPinturaFieldsState);
  const [escultura, setEscultura] = useState<EsculturaFieldsState>(initialEsculturaFieldsState);

  const [cantidadTotalEdiciones, setCantidadTotalEdiciones] = useState("1");
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
    setSelectedArtistaId(null);
    setUbicacion("");
    setTags([]);
    setCategoria("Fotografia");
    setFotografia(initialFotografiaFieldsState);
    setPintura(initialPinturaFieldsState);
    setEscultura(initialEsculturaFieldsState);
    setCantidadTotalEdiciones("1");
    handleImageChange(null);
  }

  function handleContinue() {
    setResult(null);
    resetForm();
  }

  if (!context) return null;

  const esSeriada =
    categoria === "Fotografia"
      ? fotografia.esSeriada
      : categoria === "Escultura"
        ? escultura.esSeriada
        : pintura.subtipoPintura !== "Original";

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
      const artistaId = esRegistroPersonal ? personalArtista!.id : selectedArtistaId!;
      const cantidad = Math.max(1, parseInt(cantidadTotalEdiciones, 10) || 1);

      const obraId = await db.transaction(async (tx) => {
        const insertObra = await tx.execute(
          `INSERT INTO obra (titulo, categoria_obra, artista_id, estado, ubicacion_fisica_actual, es_seriada, tags)
           VALUES (?, ?, ?, 'disponible', ?, ?, ?)`,
          [titulo, categoria, artistaId, ubicacion || null, esSeriada ? 1 : 0, formatTags(tags) || null],
        );
        const id = insertObra.lastInsertId;
        if (!id) throw new Error("No se pudo crear la obra");

        if (categoria === "Fotografia") {
          await tx.execute(
            `INSERT INTO obra_fotografia (obra_id, subtipo_fotografia, fecha_captura, anio_toma, fecha_edicion, software_edicion, dimensiones, tecnica)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              fotografia.subtipoFotografia,
              fotografia.fechaCaptura || null,
              derivarAnioDesdeFecha(fotografia.fechaCaptura),
              fotografia.fechaEdicion || null,
              fotografia.softwareEdicion || null,
              fotografia.dimensiones || null,
              fotografia.tecnica || null,
            ],
          );
        } else if (categoria === "Pintura") {
          await tx.execute(
            `INSERT INTO obra_pintura (obra_id, subtipo_pintura, tecnica, dimensiones, peso, fecha_creacion)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, pintura.subtipoPintura, pintura.tecnica || null, pintura.dimensiones || null, pintura.peso || null, pintura.fechaCreacion || null],
          );
        } else {
          await tx.execute(
            `INSERT INTO obra_escultura (obra_id, tecnica, dimensiones, peso, fecha_creacion)
             VALUES (?, ?, ?, ?, ?)`,
            [id, escultura.tecnica || null, escultura.dimensiones || null, escultura.peso || null, escultura.fechaCreacion || null],
          );
        }

        const ejemplares = esSeriada ? generarEjemplares(cantidad) : [generarEjemplarUnico()];
        for (const ejemplar of ejemplares) {
          await tx.execute(
            `INSERT INTO ejemplar (obra_id, tipo, indice, total_ediciones, numero) VALUES (?, ?, ?, ?, ?)`,
            [id, ejemplar.tipo, ejemplar.indice, ejemplar.totalEdiciones, ejemplar.numero],
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
        <h2>
          {t("obraForm.tituloNueva", {
            registro: esRegistroPersonal ? t("workspacePicker.personal") : t("workspacePicker.galeria"),
          })}
        </h2>
        <button type="button" onClick={onCancel}>
          {t("obraForm.cancelarVolver")}
        </button>
      </div>

      {esRegistroPersonal && personalArtista && (
        <p className="field-note">
          {t("obraForm.artista")} <strong>{personalArtista.nombreCompleto}</strong>{" "}
          {onEditProfile && (
            <button type="button" className="link-button" onClick={onEditProfile}>
              {t("obraForm.editarMisDatos")}
            </button>
          )}
        </p>
      )}

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
        {t("obraForm.imagenLabel")}
        {imagePreviewUrl && <img src={imagePreviewUrl} alt="" className="obra-edit-imagen-actual" />}
        <ImageFileField value={imageFile} onChange={handleImageChange} />
      </label>

      {!esRegistroPersonal && (
        <label>
          {t("obraForm.artistaLabel")}
          <ArtistaSelector value={selectedArtistaId} onChange={setSelectedArtistaId} />
        </label>
      )}

      {esRegistroPersonal && (
        <label>
          {t("obraForm.ubicacionLabel")} <HelpIcon fieldKey="ubicacion_fisica_archivo" />
          <FilePathField value={ubicacion} onChange={setUbicacion} />
        </label>
      )}

      <label>
        {t("obraForm.categoriaLabel")}
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaObra)}>
          <option value="Fotografia">{t("fields.fotografia.legend")}</option>
          <option value="Pintura">{t("fields.pintura.legend")}</option>
          <option value="Escultura">{t("fields.escultura.legend")}</option>
        </select>
      </label>

      {categoria === "Fotografia" && (
        <FotografiaFields value={fotografia} onChange={setFotografia} mostrarSoftwareEdicion={esRegistroPersonal} />
      )}
      {categoria === "Pintura" && <PinturaFields value={pintura} onChange={setPintura} />}
      {categoria === "Escultura" && <EsculturaFields value={escultura} onChange={setEscultura} />}

      {esSeriada && (
        <label>
          {t("obraForm.cantidadEdicionesLabel")} <HelpIcon fieldKey="pruebas_artista" />
          <input
            type="number"
            min={1}
            value={cantidadTotalEdiciones}
            onChange={(e) => setCantidadTotalEdiciones(e.target.value)}
          />
        </label>
      )}

      <label>
        {t("obraForm.etiquetasLabel")}
        <TagPicker value={tags} onChange={setTags} />
      </label>

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

import { useEffect, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { Modal } from "./Modal.js";
import { agregarObrasASeleccion, crearSeleccion, listSelecciones, type Seleccion } from "../data/selecciones.js";

/** Agrega las obras indicadas a una selección existente o a una nueva. */
export function AgregarASeleccionModal({
  obraIds,
  onClose,
  onDone,
}: {
  obraIds: number[];
  onClose: () => void;
  onDone: (mensaje: string) => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [selecciones, setSelecciones] = useState<Seleccion[]>([]);
  const [destinoId, setDestinoId] = useState<number | "nueva">("nueva");
  const [nombreNueva, setNombreNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!context) return;
    listSelecciones(context.db)
      .then((rows) => {
        setSelecciones(rows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [context]);

  async function guardar() {
    if (!context) return;
    const nombre = nombreNueva.trim();
    if (destinoId === "nueva" && !nombre) return;
    setGuardando(true);
    setError(null);
    try {
      let id: number;
      let nombreFinal: string;
      if (destinoId === "nueva") {
        id = await crearSeleccion(context.db, nombre);
        nombreFinal = nombre;
      } else {
        id = destinoId;
        nombreFinal = selecciones.find((s) => s.id === destinoId)?.nombre ?? "";
      }
      await agregarObrasASeleccion(context.db, id, obraIds);
      onDone(t("selecciones.agregadas", { cantidad: obraIds.length, nombre: nombreFinal }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGuardando(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{t("selecciones.agregarTitulo", { cantidad: obraIds.length })}</h2>
      <label>
        <span className="field-label">{t("selecciones.destino")}</span>
        <select value={destinoId} onChange={(e) => setDestinoId(e.target.value === "nueva" ? "nueva" : Number(e.target.value))}>
          <option value="nueva">{t("selecciones.nuevaOpcion")}</option>
          {selecciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} ({s.cantidad})
            </option>
          ))}
        </select>
      </label>
      {destinoId === "nueva" && (
        <label>
          <span className="field-label">{t("selecciones.nombreLabel")}</span>
          <input type="text" value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} autoFocus />
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" onClick={onClose} disabled={guardando}>
          {t("common.cancel")}
        </button>
        <button type="button" onClick={guardar} disabled={guardando || (destinoId === "nueva" && !nombreNueva.trim())}>
          {t("selecciones.agregarBoton")}
        </button>
      </div>
    </Modal>
  );
}

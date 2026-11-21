import { useEffect, useState } from "react";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { Modal } from "./Modal.js";
import { eliminarRegistroDossier, listDossiers, type SeleccionDossier } from "../data/selecciones.js";
import { openLocalFile } from "../utils/openExternalUrl.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";

/** "2026-11-21 19:30:12" -> "21/11/2026 19:30". */
function formatearFecha(valor: string): string {
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : valor;
}

/** Historial de dossiers generados para una selección: abrir, guardar una copia o borrar. */
export function DossiersGuardadosModal({
  seleccionId,
  seleccionNombre,
  onClose,
  onCambio,
}: {
  seleccionId: number;
  seleccionNombre: string;
  onClose: () => void;
  onCambio: () => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [dossiers, setDossiers] = useState<SeleccionDossier[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmarId, setConfirmarId] = useState<number | null>(null);

  async function recargar() {
    if (!context) return;
    setDossiers(await listDossiers(context.db, seleccionId));
  }

  useEffect(() => {
    recargar()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, seleccionId]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setMensaje(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const abrir = (d: SeleccionDossier) =>
    run(async () => {
      if (!context) return;
      await openLocalFile(await context.fs.resolveAbsolutePath(d.archivo_path));
    });

  const guardarCopia = (d: SeleccionDossier) =>
    run(async () => {
      if (!context) return;
      const bytes = await context.fs.readFile(d.archivo_path);
      const nombre = `dossier_${seleccionNombre.replace(/[^\p{L}\p{N}]+/gu, "_")}_${String(d.numero).padStart(2, "0")}.pdf`;
      const ok = await savePdfWithDialog(bytes, nombre);
      if (ok) setMensaje(t("dossier.copiaGuardada"));
    });

  const eliminar = (d: SeleccionDossier) =>
    run(async () => {
      if (!context) return;
      try {
        await context.fs.remove(d.archivo_path);
      } catch {
        // Si el archivo ya no estaba, igual se limpia el registro.
      }
      await eliminarRegistroDossier(context.db, d.id);
      setConfirmarId(null);
      await recargar();
      onCambio();
    });

  return (
    <Modal onClose={onClose} wide>
      <div className="dossier-modal">
        <h2 className="dossier-titulo">{t("dossier.guardadosTitulo", { nombre: seleccionNombre })}</h2>
        {cargando && <p>{t("common.loading")}</p>}
        {!cargando && dossiers.length === 0 && <p>{t("dossier.guardadosVacio")}</p>}
        <div className="dossier-lista">
          {dossiers.map((d) => (
            <div className="dossier-item" key={d.id}>
              <div className="dossier-item-info">
                <strong>{t("dossier.numeroDossier", { numero: d.numero })}</strong>
                <span>{formatearFecha(d.creado_en)}</span>
                <span>{t("dossier.cantidadObrasItem", { cantidad: d.cantidad_obras })}</span>
              </div>
              <div className="dossier-item-acciones">
                <button type="button" onClick={() => abrir(d)}>
                  {t("dossier.abrir")}
                </button>
                <button type="button" onClick={() => guardarCopia(d)}>
                  {t("dossier.guardarCopia")}
                </button>
                {confirmarId === d.id ? (
                  <>
                    <button type="button" onClick={() => eliminar(d)}>
                      {t("selecciones.eliminarConfirmar")}
                    </button>
                    <button type="button" onClick={() => setConfirmarId(null)}>
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmarId(d.id)}>
                    {t("common.delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {mensaje && (
          <p className="success" role="status">
            ✅ {mensaje}
          </p>
        )}
        <div className="dossier-acciones">
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

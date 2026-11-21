import { useCallback, useEffect, useRef, useState } from "react";
import { InformeListadoObrasModal, SQL_INFORME_OBRAS, type InformeObraRow } from "../components/InformeListadoObrasModal.js";
import { DossierModal } from "../components/DossierModal.js";
import { DossiersGuardadosModal } from "../components/DossiersGuardadosModal.js";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { leerMiniaturasPorIdEnParalelo } from "../utils/imageObjectUrl.js";
import {
  actualizarSeleccion,
  crearSeleccion,
  contarDossiers,
  eliminarSeleccion,
  listDossiers,
  listObraIdsDeSeleccion,
  listSelecciones,
  quitarObraDeSeleccion,
  reordenarSeleccion,
  type Seleccion,
} from "../data/selecciones.js";

interface ObraMini {
  id: number;
  titulo: string;
  nombre_completo: string | null;
  anio_periodo: string | null;
  miniatura_path: string | null;
}

/** Selecciones: grupos de obras elegidos a mano (base de los dossiers en PDF). */
export function SeleccionesScreen({
  onBack,
  onOpenObra,
}: {
  onBack: () => void;
  onOpenObra: (obraId: number) => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [selecciones, setSelecciones] = useState<Seleccion[]>([]);
  const [activaId, setActivaId] = useState<number | null>(null);
  const [obras, setObras] = useState<ObraMini[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [nueva, setNueva] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossierAbierto, setDossierAbierto] = useState(false);
  const [guardadosAbierto, setGuardadosAbierto] = useState(false);
  const [informeObras, setInformeObras] = useState<InformeObraRow[] | null>(null);
  const [cantidadDossiers, setCantidadDossiers] = useState(0);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const recargarLista = useCallback(async () => {
    if (!context) return [];
    const rows = await listSelecciones(context.db);
    setSelecciones(rows);
    return rows;
  }, [context]);

  const liberarThumbs = () => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  };

  const cargarObras = useCallback(
    async (seleccionId: number) => {
      if (!context) return;
      const ids = await listObraIdsDeSeleccion(context.db, seleccionId);
      let rows: ObraMini[] = [];
      if (ids.length > 0) {
        const found = await context.db.query<ObraMini>(
          `SELECT obra.id, obra.titulo, obra.anio_periodo, obra.miniatura_path, artista.nombre_completo
           FROM obra LEFT JOIN artista ON artista.id = obra.artista_id
           WHERE obra.id IN (${ids.map(() => "?").join(",")})`,
          ids,
        );
        const porId = new Map(found.map((o) => [o.id, o]));
        rows = ids.map((id) => porId.get(id)).filter((o): o is ObraMini => !!o);
      }
      setObras(rows);
      liberarThumbs();
      const { urls, objectUrls } = await leerMiniaturasPorIdEnParalelo(
        context.fs,
        rows,
        (o) => o.id,
        (o) => o.miniatura_path,
      );
      objectUrlsRef.current.push(...objectUrls);
      setThumbs(urls);
    },
    [context],
  );

  useEffect(() => {
    recargarLista().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return liberarThumbs;
  }, [recargarLista]);

  useEffect(() => {
    setConfirmarEliminar(false);
    if (activaId === null) {
      setObras([]);
      return;
    }
    const s = selecciones.find((x) => x.id === activaId);
    setNombre(s?.nombre ?? "");
    setNotas(s?.notas ?? "");
    cargarObras(activaId).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    contarDossiers(context!.db, activaId).then(setCantidadDossiers).catch(() => setCantidadDossiers(0));
    // Solo al cambiar de selección: recargar al renombrar/mover no debe pisar lo que se esta escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activaId, cargarObras]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const empezarNueva = () => {
    setActivaId(null);
    setNueva(true);
    setNombre("");
    setNotas("");
  };

  const guardarDatos = () =>
    run(async () => {
      if (!context || !nombre.trim()) return;
      if (nueva) {
        const id = await crearSeleccion(context.db, nombre, notas.trim() || null);
        await recargarLista();
        setNueva(false);
        setActivaId(id);
        return;
      }
      if (activaId === null) return;
      await actualizarSeleccion(context.db, activaId, nombre, notas.trim() || null);
      await recargarLista();
    });

  // Abre directamente la ventana de informes, limitada a las obras de la selección (en su orden).
  const abrirInformes = () =>
    run(async () => {
      if (!context || obras.length === 0) return;
      const ids = obras.map((o) => o.id);
      const rows = await context.db.query<InformeObraRow>(SQL_INFORME_OBRAS(ids.map(() => "?").join(",")), ids);
      const porId = new Map(rows.map((r) => [r.id, r]));
      setInformeObras(ids.map((id) => porId.get(id)).filter((r): r is InformeObraRow => !!r));
    });

  const eliminar = () =>
    run(async () => {
      if (!context || activaId === null) return;
      for (const d of await listDossiers(context.db, activaId)) {
        try {
          await context.fs.remove(d.archivo_path);
        } catch {
          // Archivo ya borrado: no impide eliminar la selección.
        }
      }
      await eliminarSeleccion(context.db, activaId);
      setActivaId(null);
      await recargarLista();
    });

  const quitar = (obraId: number) =>
    run(async () => {
      if (!context || activaId === null) return;
      await quitarObraDeSeleccion(context.db, activaId, obraId);
      await cargarObras(activaId);
      await recargarLista();
    });

  const mover = (indice: number, destino: number) =>
    run(async () => {
      if (!context || activaId === null) return;
      if (destino < 0 || destino >= obras.length || destino === indice) return;
      const ids = obras.map((o) => o.id);
      const [movida] = ids.splice(indice, 1);
      ids.splice(destino, 0, movida);
      // Se refleja de inmediato (sin esperar la base) para que el arrastre no "salte".
      const porId = new Map(obras.map((o) => [o.id, o]));
      setObras(ids.map((id) => porId.get(id)!));
      await reordenarSeleccion(context.db, activaId, ids);
    });

  if (!context) return null;
  const activa = selecciones.find((s) => s.id === activaId) ?? null;

  return (
    <div className="obras-list obras-list-grid-ancho">
      <div className="obras-list-header">
        <h1>{t("selecciones.title")}</h1>
        <div className="header-actions">
          <button type="button" className="header-close-button" onClick={onBack} aria-label={t("common.back")} title={t("common.back")}>
            ✕
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="selecciones-bloque">
        <button type="button" onClick={empezarNueva} disabled={nueva}>
          {t("selecciones.crear")}
        </button>
      </div>

      {nueva && (
        <section className="selecciones-bloque selecciones-formulario">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.notasLabel")}</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </label>
          <div className="form-actions">
            <button type="button" onClick={guardarDatos} disabled={!nombre.trim()}>
              {t("common.save")}
            </button>
            {!nueva && (
              <button type="button" onClick={() => setDossierAbierto(true)} disabled={obras.length === 0}>
                {t("dossier.boton")}
              </button>
            )}
            {nueva && (
              <button type="button" onClick={() => setNueva(false)}>
                {t("common.cancel")}
              </button>
            )}
          </div>
        </section>
      )}

      <div className="selecciones-bloque">
        {selecciones.length === 0 && !nueva && <p>{t("selecciones.vacio")}</p>}
        {selecciones.length > 0 && <h2 className="selecciones-subtitulo">{t("selecciones.existentes")}</h2>}
        <div className="obras-toolbar-fila">
          {selecciones.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === activaId ? "obras-vista-toggle-boton activo" : "obras-vista-toggle-boton"}
              onClick={() => {
                setNueva(false);
                setActivaId(s.id);
              }}
            >
              {s.nombre} ({s.cantidad})
            </button>
          ))}
        </div>
      </div>

      {activa && (
        <section className="selecciones-bloque selecciones-formulario">
          <label>
            <span className="field-label">{t("selecciones.nombreLabel")}</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("selecciones.notasLabel")}</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </label>
          <div className="form-actions">
            <button type="button" onClick={guardarDatos} disabled={!nombre.trim()}>
              {t("common.save")}
            </button>
            {!nueva && (
              <button type="button" onClick={() => setDossierAbierto(true)} disabled={obras.length === 0}>
                {t("dossier.boton")}
              </button>
            )}
            {!nueva && (
              <button type="button" onClick={() => setGuardadosAbierto(true)}>
                {t("dossier.guardadosBoton", { cantidad: cantidadDossiers })}
              </button>
            )}
            {!nueva && (
              <button type="button" onClick={abrirInformes} disabled={obras.length === 0}>
                {t("selecciones.informesBoton")}
              </button>
            )}
            {nueva && (
              <button type="button" onClick={() => setNueva(false)}>
                {t("common.cancel")}
              </button>
            )}
            {!nueva && !confirmarEliminar ? (
              <button type="button" onClick={() => setConfirmarEliminar(true)}>
                {t("selecciones.eliminar")}
              </button>
            ) : !nueva ? (
              <div className="confirm-box selecciones-confirmar-eliminar" role="alertdialog">
                <p>{t("selecciones.eliminarPregunta")}</p>
                {cantidadDossiers > 0 && (
                  <p className="selecciones-aviso-dossiers">
                    ⚠️ {t("selecciones.eliminarAvisoDossiers", { cantidad: cantidadDossiers })}
                  </p>
                )}
                <div className="form-actions">
                  <button type="button" className="boton-peligro" onClick={eliminar}>
                    {t("selecciones.eliminarConfirmar")}
                  </button>
                  <button type="button" onClick={() => setConfirmarEliminar(false)}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="selecciones-bloque">

          {obras.length === 0 && <p>{t("selecciones.sinObras")}</p>}
          <div className="obras-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {obras.map((obra, i) => (
              <div
                className="obra-card-wrapper"
                key={obra.id}
                draggable
                onDragStart={(e) => {
                  setArrastrando(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (sobre !== i) setSobre(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (arrastrando !== null) mover(arrastrando, i);
                  setArrastrando(null);
                  setSobre(null);
                }}
                onDragEnd={() => {
                  setArrastrando(null);
                  setSobre(null);
                }}
                style={{
                  opacity: arrastrando === i ? 0.4 : 1,
                  outline: sobre === i && arrastrando !== null && arrastrando !== i ? "3px dashed var(--accent, #4a90e2)" : undefined,
                  cursor: "grab",
                }}
              >
                <button type="button" className="obra-card" onClick={() => onOpenObra(obra.id)}>
                  {thumbs[obra.id] ? (
                    <img src={thumbs[obra.id]} alt={obra.titulo} />
                  ) : (
                    <div className="obra-card-placeholder">{t("obrasList.sinImagen")}</div>
                  )}
                  <div className="obra-card-info">
                    <span>
                      {i + 1}. {obra.titulo}
                    </span>
                    {obra.nombre_completo && <span>{obra.nombre_completo}</span>}
                  </div>
                </button>
                <div className="form-actions">
                  <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={t("selecciones.subir")} title={t("selecciones.subir")}>
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, i + 1)}
                    disabled={i === obras.length - 1}
                    aria-label={t("selecciones.bajar")}
                    title={t("selecciones.bajar")}
                  >
                    →
                  </button>
                  <button type="button" onClick={() => quitar(obra.id)}>
                    {t("selecciones.quitar")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
      )}
      {dossierAbierto && activa && (
        <DossierModal
          seleccionId={activa.id}
          seleccionNombre={activa.nombre}
          onClose={() => setDossierAbierto(false)}
          onGenerado={() => contarDossiers(context.db, activa.id).then(setCantidadDossiers)}
        />
      )}
      {informeObras && <InformeListadoObrasModal obras={informeObras} onClose={() => setInformeObras(null)} />}
      {guardadosAbierto && activa && (
        <DossiersGuardadosModal
          seleccionId={activa.id}
          seleccionNombre={activa.nombre}
          onClose={() => setGuardadosAbierto(false)}
          onCambio={() => contarDossiers(context.db, activa.id).then(setCantidadDossiers)}
        />
      )}
    </div>
  );
}

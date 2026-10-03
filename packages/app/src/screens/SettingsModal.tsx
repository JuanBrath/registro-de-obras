import { useState } from "react";
import { edicionIncluyeGaleria, edicionIncluyePersonal, type WorkspaceId } from "@registro/core";
import { Modal } from "../components/Modal.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useTheme } from "../state/ThemeContext.js";
import { useFontSize } from "../state/FontSizeContext.js";
import { useMiniaturasModo } from "../state/MiniaturasModoContext.js";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { isTauri } from "../adapters/detectPlatform.js";
import { LightroomSettings } from "../components/LightroomSettings.js";
import { LicenciaSettings } from "../components/LicenciaSettings.js";

/**
 * En macOS, copiar a un disco externo (o a otras carpetas protegidas) puede
 * fallar con un "Permission denied (os error 13)" crudo del sistema
 * operativo si la app todavia no tiene el permiso de privacidad
 * correspondiente — algo comun en apps que, como esta, no estan firmadas
 * con una cuenta de desarrollador de Apple ni notarizadas. Se lo reemplaza
 * por una explicacion accionable en vez del mensaje tecnico tal cual.
 */
function describirErrorMudanza(err: unknown, t: (key: TranslationKey, vars?: Record<string, string | number>) => string): string {
  const mensaje = err instanceof Error ? err.message : String(err);
  if (/permission denied|os error 13/i.test(mensaje)) {
    return t("settings.moverCarpetaErrorPermisos");
  }
  return mensaje;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { idioma, setIdioma, t } = useLanguage();
  const { tema, setTema } = useTheme();
  const { tamanoFuente, setTamanoFuente } = useFontSize();
  const { miniaturasModo, setMiniaturasModo } = useMiniaturasModo();
  const { context, close, setDb } = useWorkspace();
  const { edicion } = useEdicion();
  // Copia de seguridad y restaurar: a que registro se le aplica. Se puede usar
  // desde la pantalla de presentacion, sin haber entrado a ninguno todavia
  // (pensado para el caso en que la base este tan corrompida que ni se pueda
  // abrir el registro) — por eso no dependen de `context`, sino de la edicion
  // (que registros existen) mas una eleccion aparte si hay mas de uno.
  const workspacesDisponibles: WorkspaceId[] = [
    ...(edicion !== null && edicionIncluyePersonal(edicion) ? (["personal"] as const) : []),
    ...(edicion !== null && edicionIncluyeGaleria(edicion) ? (["galeria"] as const) : []),
  ];
  const [workspaceBackupElegido, setWorkspaceBackupElegido] = useState<WorkspaceId | null>(null);
  const workspaceBackup = workspaceBackupElegido ?? context?.workspace ?? workspacesDisponibles[0] ?? null;
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetExito, setResetExito] = useState(false);
  const [cambiandoCarpeta, setCambiandoCarpeta] = useState(false);
  const [errorCambioCarpeta, setErrorCambioCarpeta] = useState<string | null>(null);
  const [moviendoCarpeta, setMoviendoCarpeta] = useState(false);
  const [progresoCopia, setProgresoCopia] = useState<{ copiados: number; total: number } | null>(null);
  const [resultadoMudanza, setResultadoMudanza] = useState<{ nuevaRuta: string; rutaVieja: string } | null>(null);
  const [borrandoCarpetaVieja, setBorrandoCarpetaVieja] = useState(false);
  const [errorMudanza, setErrorMudanza] = useState<string | null>(null);
  const [haciendoBackup, setHaciendoBackup] = useState(false);
  const [progresoBackup, setProgresoBackup] = useState<{ copiados: number; total: number } | null>(null);
  const [resultadoBackup, setResultadoBackup] = useState<string | null>(null);
  const [errorBackup, setErrorBackup] = useState<string | null>(null);
  const [confirmandoRestaurar, setConfirmandoRestaurar] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [progresoRestaurar, setProgresoRestaurar] = useState<{ copiados: number; total: number } | null>(null);
  const [errorRestaurar, setErrorRestaurar] = useState<string | null>(null);
  const [restaurado, setRestaurado] = useState(false);

  // Fuerza a elegir una carpeta nueva para este workspace (aunque la actual
  // siga siendo valida) y vuelve a la pantalla de inicio para reabrir el
  // registro ya apuntando ahi: evita dejar pantallas con datos de la carpeta
  // vieja todavia cargados en memoria despues de cambiar la fuente de datos.
  async function handleCambiarCarpeta() {
    if (!context) return;
    setCambiandoCarpeta(true);
    setErrorCambioCarpeta(null);
    try {
      const { changeTauriWorkspaceRoot } = await import("../adapters/tauri/tauriAdapterFactory.js");
      await changeTauriWorkspaceRoot(context.workspace);
      await close();
      onClose();
    } catch (err) {
      setErrorCambioCarpeta(err instanceof Error ? err.message : String(err));
    } finally {
      setCambiandoCarpeta(false);
    }
  }

  // A diferencia de "Cambiar carpeta" (que asume que el usuario ya movio los
  // archivos a mano), esta copia ella misma todo el contenido a la carpeta
  // nueva — pensado para quien no esta comodo manejando carpetas en el
  // Finder. Termina en un cartel de exito que recien ahi ofrece borrar la
  // carpeta vieja, nunca antes de confirmar que la nueva quedo funcionando.
  async function handleMoverCarpeta() {
    if (!context) return;
    setMoviendoCarpeta(true);
    setErrorMudanza(null);
    setProgresoCopia(null);
    setResultadoMudanza(null);
    try {
      const { moverTauriWorkspaceRoot } = await import("../adapters/tauri/tauriAdapterFactory.js");
      const resultado = await moverTauriWorkspaceRoot(context.workspace, context.db, (copiados, total) =>
        setProgresoCopia({ copiados, total }),
      );
      setResultadoMudanza(resultado);
    } catch (err) {
      setErrorMudanza(describirErrorMudanza(err, t));
    } finally {
      setMoviendoCarpeta(false);
    }
  }

  async function handleBorrarCarpetaVieja() {
    if (!resultadoMudanza) return;
    setBorrandoCarpetaVieja(true);
    setErrorMudanza(null);
    try {
      const { borrarCarpetaViejaTauri } = await import("../adapters/tauri/tauriAdapterFactory.js");
      await borrarCarpetaViejaTauri(resultadoMudanza.rutaVieja);
      await terminarMudanza();
    } catch (err) {
      setErrorMudanza(err instanceof Error ? err.message : String(err));
    } finally {
      setBorrandoCarpetaVieja(false);
    }
  }

  async function terminarMudanza() {
    await close();
    onClose();
  }

  // Copia completa del workspace elegido (base, obras, certificados) a una
  // carpeta nueva con fecha y hora, elegida por el usuario. No cambia la
  // carpeta actual: si el workspace elegido es el que esta abierto ahora, al
  // terminar sigue usandose (con una conexion nueva, ver
  // hacerBackupTauriWorkspace); si se hizo desde la pantalla de presentacion
  // (sin haber entrado a ningun registro), no hay ninguna conexion que tocar.
  async function handleHacerBackup() {
    if (!workspaceBackup) return;
    setHaciendoBackup(true);
    setErrorBackup(null);
    setResultadoBackup(null);
    setProgresoBackup(null);
    try {
      const { hacerBackupTauriWorkspace } = await import("../adapters/tauri/tauriAdapterFactory.js");
      const etiqueta = workspaceBackup === "personal" ? t("workspacePicker.personal") : t("workspacePicker.galeria");
      const abierto = context && context.workspace === workspaceBackup ? context : null;
      const { destino, dbNueva } = await hacerBackupTauriWorkspace(workspaceBackup, abierto?.db ?? null, etiqueta, (copiados, total) =>
        setProgresoBackup({ copiados, total }),
      );
      if (dbNueva) setDb(dbNueva);
      setResultadoBackup(destino);
    } catch (err) {
      setErrorBackup(describirErrorMudanza(err, t));
    } finally {
      setHaciendoBackup(false);
    }
  }

  // Reemplaza TODO el contenido actual del workspace elegido por el de una
  // copia de seguridad elegida por el usuario: se pierde lo cargado despues
  // de esa copia, por eso pide confirmar antes. Si ese workspace es el que
  // esta abierto ahora, termina volviendo a la pantalla de inicio (como
  // "Mover carpeta"), para que todas las pantallas se recarguen de cero con
  // los datos restaurados en vez de quedar con datos viejos en memoria; si
  // se hizo desde la pantalla de presentacion (sin haber entrado), no hay
  // ninguna sesion que recargar.
  async function handleRestaurar() {
    if (!workspaceBackup) return;
    setRestaurando(true);
    setErrorRestaurar(null);
    setProgresoRestaurar(null);
    setRestaurado(false);
    try {
      const { restaurarTauriWorkspaceDesdeBackup } = await import("../adapters/tauri/tauriAdapterFactory.js");
      const esElAbierto = context && context.workspace === workspaceBackup;
      await restaurarTauriWorkspaceDesdeBackup(workspaceBackup, esElAbierto ? context.db : null, (copiados, total) =>
        setProgresoRestaurar({ copiados, total }),
      );
      if (esElAbierto) {
        await close();
        onClose();
      } else {
        setConfirmandoRestaurar(false);
        setRestaurado(true);
        setRestaurando(false);
      }
    } catch (err) {
      setErrorRestaurar(describirErrorMudanza(err, t));
      setRestaurando(false);
    }
  }

  async function handleResetearNumeradores() {
    if (!context) return;
    setReseteando(true);
    setResetError(null);
    try {
      await context.db.transaction(async (tx) => {
        await tx.execute("UPDATE artista_contador SET siguiente_numero = 1 WHERE id = 1");
        await tx.execute("UPDATE certificado_contador SET siguiente_numero = 1 WHERE id = 1");
      });
      setConfirmandoReset(false);
      setResetExito(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : String(err));
    } finally {
      setReseteando(false);
    }
  }

  // Mientras se copia o se borra la carpeta vieja, no se deja cerrar el
  // modal: la conexion actual ya esta cerrada para poder copiar el archivo
  // .db sin riesgo, asi que salir a mitad de camino dejaria pantallas de
  // fondo intentando usar una conexion que ya no existe.
  const bloqueaCierre = moviendoCarpeta || borrandoCarpetaVieja || haciendoBackup || restaurando;

  return (
    <Modal onClose={bloqueaCierre ? () => {} : onClose}>
      <h2>{t("settings.title")}</h2>
      <LicenciaSettings />

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.idioma")}</legend>
        <label>
          <input type="radio" name="idioma" checked={idioma === "es"} onChange={() => setIdioma("es")} />
          {t("settings.espanol")}
        </label>
        <label>
          <input type="radio" name="idioma" checked={idioma === "en"} onChange={() => setIdioma("en")} />
          {t("settings.ingles")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.apariencia")}</legend>
        <label>
          <input type="radio" name="tema" checked={tema === "claro"} onChange={() => setTema("claro")} />
          {t("settings.claro")}
        </label>
        <label>
          <input type="radio" name="tema" checked={tema === "oscuro"} onChange={() => setTema("oscuro")} />
          {t("settings.oscuro")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.tamanoLetra")}</legend>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "chica"}
            onChange={() => setTamanoFuente("chica")}
          />
          {t("settings.letraChica")}
        </label>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "mediana"}
            onChange={() => setTamanoFuente("mediana")}
          />
          {t("settings.letraMediana")}
        </label>
        <label>
          <input
            type="radio"
            name="tamanoFuente"
            checked={tamanoFuente === "grande"}
            onChange={() => setTamanoFuente("grande")}
          />
          {t("settings.letraGrande")}
        </label>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.miniaturas")}</legend>
        <label>
          <input
            type="radio"
            name="miniaturasModo"
            checked={miniaturasModo === "estaticas"}
            onChange={() => setMiniaturasModo("estaticas")}
          />
          {t("settings.miniaturasEstaticas")}
        </label>
        <label>
          <input
            type="radio"
            name="miniaturasModo"
            checked={miniaturasModo === "dinamicas"}
            onChange={() => setMiniaturasModo("dinamicas")}
          />
          {t("settings.miniaturasDinamicas")}
        </label>
        <p className="field-note">{t("settings.miniaturasNota")}</p>
      </fieldset>

      <fieldset className="settings-idioma-fieldset">
        <legend>{t("settings.numeradoresAutomaticos")}</legend>
        {resetExito && <p className="success" role="status">✅ {t("settings.resetearNumeradoresExito")}</p>}
        {resetError && (
          <p className="error" role="alert">
            ⚠️ {resetError}
          </p>
        )}
        {confirmandoReset ? (
          <div className="confirm-box">
            <p>{t("settings.resetearNumeradoresAdvertencia")}</p>
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleResetearNumeradores} disabled={reseteando}>
                {reseteando ? t("common.saving") : t("settings.resetearNumeradoresConfirmar")}
              </button>
              <button type="button" onClick={() => setConfirmandoReset(false)} disabled={reseteando}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setResetExito(false);
              setConfirmandoReset(true);
            }}
          >
            {t("settings.resetearNumeradoresBoton")}
          </button>
        )}
      </fieldset>

      {isTauri() && <LightroomSettings />}

      {isTauri() && context && (
        <fieldset className="settings-idioma-fieldset">
          <legend>{t("settings.carpetaDatos")}</legend>

          <p className="field-note">{t("settings.cambiarCarpetaNota")}</p>
          {errorCambioCarpeta && (
            <p className="error" role="alert">
              ⚠️ {errorCambioCarpeta}
            </p>
          )}
          <button type="button" onClick={handleCambiarCarpeta} disabled={cambiandoCarpeta || moviendoCarpeta}>
            {cambiandoCarpeta ? t("common.saving") : t("settings.cambiarCarpetaBoton")}
          </button>

          <p className="field-note">{t("settings.moverCarpetaNota")}</p>
          {errorMudanza && (
            <p className="error" role="alert">
              ⚠️ {errorMudanza}
            </p>
          )}
          {resultadoMudanza ? (
            <div className="confirm-box">
              <p className="success" role="status">
                ✅ {t("settings.moverCarpetaExito", { nueva: resultadoMudanza.nuevaRuta })}
              </p>
              <p className="field-note">{t("settings.moverCarpetaCarpetaVieja", { vieja: resultadoMudanza.rutaVieja })}</p>
              <div className="obra-form-saved-actions">
                <button type="button" onClick={handleBorrarCarpetaVieja} disabled={borrandoCarpetaVieja}>
                  {borrandoCarpetaVieja ? t("common.saving") : t("settings.moverCarpetaBorrarAhora")}
                </button>
                <button type="button" onClick={terminarMudanza} disabled={borrandoCarpetaVieja}>
                  {t("settings.moverCarpetaDejarla")}
                </button>
              </div>
            </div>
          ) : moviendoCarpeta ? (
            <p role="status">
              {progresoCopia
                ? t("settings.moverCarpetaProgreso", { copiados: progresoCopia.copiados, total: progresoCopia.total })
                : t("common.loading")}
            </p>
          ) : (
            <button type="button" onClick={handleMoverCarpeta} disabled={cambiandoCarpeta}>
              {t("settings.moverCarpetaBoton")}
            </button>
          )}
        </fieldset>
      )}

      {isTauri() && workspacesDisponibles.length > 0 && (
        <fieldset className="settings-idioma-fieldset">
          <legend>{t("settings.backupTitulo")}</legend>

          {workspacesDisponibles.length > 1 && (
            <div className="settings-backup-workspace">
              <span className="field-note">{t("settings.backupWorkspaceLabel")}</span>
              {workspacesDisponibles.map((ws) => (
                <label key={ws}>
                  <input
                    type="radio"
                    name="backupWorkspace"
                    checked={workspaceBackup === ws}
                    onChange={() => {
                      setWorkspaceBackupElegido(ws);
                      setResultadoBackup(null);
                      setErrorBackup(null);
                      setRestaurado(false);
                      setErrorRestaurar(null);
                      setConfirmandoRestaurar(false);
                    }}
                  />
                  {ws === "personal" ? t("workspacePicker.personal") : t("workspacePicker.galeria")}
                </label>
              ))}
            </div>
          )}

          <p className="field-note">{t("settings.backupNota")}</p>
          {errorBackup && (
            <p className="error" role="alert">
              ⚠️ {errorBackup}
            </p>
          )}
          {resultadoBackup && (
            <p className="success" role="status">
              ✅ {t("settings.backupExito", { destino: resultadoBackup })}
            </p>
          )}
          {haciendoBackup ? (
            <p role="status">
              {progresoBackup
                ? t("settings.moverCarpetaProgreso", { copiados: progresoBackup.copiados, total: progresoBackup.total })
                : t("common.loading")}
            </p>
          ) : (
            <button type="button" onClick={handleHacerBackup} disabled={restaurando}>
              {t("settings.backupBoton")}
            </button>
          )}

          <p className="field-note">{t("settings.restaurarNota")}</p>
          {errorRestaurar && (
            <p className="error" role="alert">
              ⚠️ {errorRestaurar}
            </p>
          )}
          {restaurado && (
            <p className="success" role="status">
              ✅ {t("settings.restaurarExito")}
            </p>
          )}
          {confirmandoRestaurar ? (
            <div className="confirm-box">
              <p>{t("settings.restaurarAdvertencia")}</p>
              <div className="obra-form-saved-actions">
                <button type="button" onClick={handleRestaurar} disabled={restaurando}>
                  {restaurando
                    ? progresoRestaurar
                      ? t("settings.moverCarpetaProgreso", { copiados: progresoRestaurar.copiados, total: progresoRestaurar.total })
                      : t("common.loading")
                    : t("settings.restaurarConfirmar")}
                </button>
                <button type="button" onClick={() => setConfirmandoRestaurar(false)} disabled={restaurando}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmandoRestaurar(true)} disabled={haciendoBackup}>
              {t("settings.restaurarBoton")}
            </button>
          )}
        </fieldset>
      )}
    </Modal>
  );
}

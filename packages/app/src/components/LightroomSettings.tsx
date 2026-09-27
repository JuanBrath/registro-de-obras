import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import {
  estadoLightroom,
  instalarComplementoLightroom,
  quitarComplementoLightroom,
  type EstadoLightroom,
} from "../lightroom/lightroom.js";

/**
 * La vinculacion opcional con Lightroom Classic, dentro de Configuracion: instalar, actualizar o quitar
 * el complemento. Sin ella, Galeris Studio funciona igual.
 */
export function LightroomSettings() {
  const { t } = useLanguage();
  const [estado, setEstado] = useState<EstadoLightroom | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    estadoLightroom().then(setEstado).catch(() => setEstado(null));
  }, []);

  async function ejecutar(accion: () => Promise<void>, textoOk: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      await accion();
      setEstado(await estadoLightroom());
      setMensaje({ tipo: "ok", texto: textoOk });
    } catch (e) {
      setMensaje({ tipo: "error", texto: t("lightroom.error", { error: String(e) }) });
    } finally {
      setOcupado(false);
    }
  }

  if (!estado) return null;
  return (
    <fieldset className="settings-idioma-fieldset">
      <legend>{t("lightroom.titulo")}</legend>
      <p className="field-note">{t("lightroom.ayuda")}</p>
      <p className="field-note">
        <strong>{estado.instalado ? t("lightroom.instalado") : t("lightroom.noInstalado")}</strong>
        {estado.desactualizado && ` ${t("lightroom.desactualizado")}`}
        {!estado.lightroomEncontrado && ` ${t("lightroom.noEncontrado")}`}
      </p>
      <div className="obra-form-saved-actions">
        <button type="button" disabled={ocupado} onClick={() => ejecutar(instalarComplementoLightroom, t("lightroom.instaladoOk"))}>
          {estado.desactualizado ? t("lightroom.actualizar") : estado.instalado ? t("lightroom.reinstalar") : t("lightroom.instalar")}
        </button>
        {estado.instalado && (
          <button type="button" disabled={ocupado} onClick={() => ejecutar(quitarComplementoLightroom, t("lightroom.quitadoOk"))}>
            {t("lightroom.quitar")}
          </button>
        )}
      </div>
      {mensaje && (
        <p className={mensaje.tipo === "ok" ? "success" : "error"} role={mensaje.tipo === "ok" ? "status" : "alert"}>
          {mensaje.tipo === "ok" ? "✅ " : "⚠️ "}
          {mensaje.texto}
        </p>
      )}
    </fieldset>
  );
}

import { useState } from "react";
import type { EdicionId } from "@registro/core";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEdicion } from "../state/EdicionContext.js";
import { pickTauriFilePath } from "../adapters/tauri/TauriFileSystemAdapter.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { BrandHeader } from "./BrandHeader.js";

const EDICION_LABEL_KEY: Record<EdicionId, TranslationKey> = {
  personal: "workspacePicker.personal",
  galeria: "workspacePicker.galeria",
  personal_galeria: "settings.licenciaEdicionSuite",
};

/**
 * En macOS, leer un archivo de Escritorio/Documentos/Descargas puede fallar
 * con un "Permission denied (os error 13)" crudo del sistema operativo si la
 * app todavia no tiene el permiso de privacidad correspondiente — mismo caso
 * que describirErrorMudanza en SettingsModal.tsx, pero para elegir el
 * archivo de licencia en vez de mover la carpeta de datos.
 */
function describirErrorLicencia(motivo: string, t: (key: TranslationKey) => string): string {
  if (/permission denied|os error 13/i.test(motivo)) {
    return t("settings.licenciaErrorPermisos");
  }
  return motivo;
}

/**
 * Estado de la licencia + boton para activar/reemplazarla. Se usa en dos
 * lugares con el mismo contenido (ver variant): la seccion "Licencia" de
 * Configuracion, y la pantalla de pantalla completa que bloquea la app
 * cuando no hay ninguna licencia valida (ActivarLicencia.tsx) — para no
 * duplicar "elegir archivo + validar + mostrar estado/error" dos veces.
 */
export function LicenciaSettings({ variant = "settings" }: { variant?: "settings" | "pantalla" }) {
  const { estadoLicencia, activarLicencia } = useEdicion();
  const { t } = useLanguage();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function elegirArchivo() {
    setOcupado(true);
    setMensaje(null);
    try {
      const ruta = await pickTauriFilePath();
      if (!ruta) return;
      const resultado = await activarLicencia(ruta);
      if (resultado.estado === "valida") {
        setMensaje({ tipo: "ok", texto: t("settings.licenciaActivadaOk") });
      } else if (resultado.estado === "invalida") {
        setMensaje({ tipo: "error", texto: describirErrorLicencia(resultado.motivo, t) });
      }
    } finally {
      setOcupado(false);
    }
  }

  const nucleo = (
    <>
      {estadoLicencia.estado === "valida" ? (
        <>
          <p className="field-note">{t("settings.licenciaTitular", { titular: estadoLicencia.titular })}</p>
          <p className="field-note">{t(EDICION_LABEL_KEY[estadoLicencia.edicion])}</p>
          <p className="field-note">
            {estadoLicencia.vence
              ? t("settings.licenciaVence", { vence: formatFechaDDMMYYYY(estadoLicencia.vence) })
              : t("settings.licenciaSinVencimiento")}
          </p>
        </>
      ) : (
        <p className="field-note">{t("settings.licenciaNinguna")}</p>
      )}
      <button type="button" disabled={ocupado} onClick={elegirArchivo}>
        {t("settings.licenciaBoton")}
      </button>
      {mensaje && (
        <p className={mensaje.tipo === "ok" ? "success" : "error"} role={mensaje.tipo === "ok" ? "status" : "alert"}>
          {mensaje.tipo === "ok" ? "✅ " : "⚠️ "}
          {mensaje.texto}
        </p>
      )}
    </>
  );

  if (variant === "pantalla") {
    return (
      <div className="workspace-picker">
        <BrandHeader size="splash" className="workspace-picker-brand" />
        <div className="activar-licencia-contenido">
          <h1>{t("activarLicencia.titulo")}</h1>
          <p>{t("activarLicencia.ayuda")}</p>
          {nucleo}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="settings-idioma-fieldset">
      <legend>{t("settings.licenciaTitulo")}</legend>
      {nucleo}
    </fieldset>
  );
}

import { LicenciaSettings } from "../components/LicenciaSettings.js";

/**
 * Pantalla de pantalla completa que reemplaza a WorkspacePicker mientras no
 * haya una licencia valida (ver App.tsx, AppShell). Mismo contenido que la
 * seccion "Licencia" de Configuracion, solo con otro envoltorio visual — ver
 * LicenciaSettings.tsx.
 */
export function ActivarLicencia() {
  return <LicenciaSettings variant="pantalla" />;
}

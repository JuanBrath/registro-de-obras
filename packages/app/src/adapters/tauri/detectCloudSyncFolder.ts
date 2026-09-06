// Sincronizar el archivo de base de datos SQLite via iCloud/Dropbox/Google
// Drive/OneDrive puede corromperlo: esos servicios sincronizan a nivel
// archivo, sin entender que hay escrituras activas (locks, write-ahead log)
// en curso. Esta deteccion es heuristica (por ruta), no un chequeo exacto de
// que la sincronizacion este realmente activa — el objetivo es avisar antes
// de que el usuario elija una carpeta asi por accidente.
const MARCADORES_NUBE: { patron: RegExp; nombre: string }[] = [
  { patron: /Library\/Mobile Documents/i, nombre: "iCloud Drive" },
  { patron: /Library\/CloudStorage\/Dropbox/i, nombre: "Dropbox" },
  { patron: /Library\/CloudStorage\/GoogleDrive/i, nombre: "Google Drive" },
  { patron: /Library\/CloudStorage\/OneDrive/i, nombre: "OneDrive" },
  { patron: /(^|\/)Dropbox(\/|$)/i, nombre: "Dropbox" },
  { patron: /(^|\/)Google Drive(\/|$)/i, nombre: "Google Drive" },
  { patron: /(^|\/)OneDrive(\/|$)/i, nombre: "OneDrive" },
];

/** Devuelve el nombre del servicio de nube detectado en la ruta, o null si no coincide con ninguno conocido. */
export function detectarProveedorNubeEnRuta(path: string): string | null {
  for (const { patron, nombre } of MARCADORES_NUBE) {
    if (patron.test(path)) return nombre;
  }
  return null;
}

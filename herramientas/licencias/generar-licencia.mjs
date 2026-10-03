#!/usr/bin/env node
// Herramienta interna para emitir licencias de Galeris (firma Ed25519,
// validacion 100% offline en la app — ver apps/desktop/src-tauri/src/licencia.rs).
// Sin dependencias npm: usa solo node:crypto/fs/path. No forma parte del
// workspace de pnpm (vive fuera de apps/* y packages/*) ni se compila.
//
// Uso:
//   node herramientas/licencias/generar-licencia.mjs generar-claves [--out <carpeta>] [--forzar]
//   node herramientas/licencias/generar-licencia.mjs emitir --clave-privada <ruta> --edicion <personal|galeria|personal_galeria> \
//     --titular "Nombre" --email correo@ejemplo.com (--vence AAAA-MM-DD | --perpetua) [--emitida AAAA-MM-DD] [--salida ruta.json]

import { generateKeyPairSync, createPrivateKey, sign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = path.resolve(AQUI, "../..");
const EDICIONES_VALIDAS = ["personal", "galeria", "personal_galeria"];

// Gemela EXACTA de armar_string_firmado() en apps/desktop/src-tauri/src/licencia.rs.
// Si se cambia una, hay que cambiar la otra — la firma deja de validar si no coinciden byte a byte.
function armarStringFirmado(edicion, titular, email, emitida, vence) {
  return `galeris-licencia-v1\n${edicion}\n${titular}\n${email}\n${emitida}\n${vence ?? ""}\n`;
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function leerFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const clave = arg.slice(2);
    const siguiente = argv[i + 1];
    if (siguiente !== undefined && !siguiente.startsWith("--")) {
      flags[clave] = siguiente;
      i++;
    } else {
      flags[clave] = true;
    }
  }
  return flags;
}

function rutaEstaDentroDelRepo(ruta) {
  const resuelta = path.resolve(ruta);
  return resuelta === RAIZ_REPO || resuelta.startsWith(RAIZ_REPO + path.sep);
}

function slug(texto) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "licencia"
  );
}

function generarClaves(flags) {
  const carpetaOut = path.resolve(flags.out || homedir());
  if (rutaEstaDentroDelRepo(carpetaOut)) {
    console.error(
      `No se generan claves dentro del repo (${RAIZ_REPO}): la clave privada no se puede commitear jamas. Elegi otra carpeta con --out.`,
    );
    process.exit(1);
  }

  const rutaPrivada = path.join(carpetaOut, "clave_privada_licencias.pem");
  if (existsSync(rutaPrivada) && !flags.forzar) {
    console.error(
      `Ya existe ${rutaPrivada}. Generar un par nuevo invalida todas las licencias ya emitidas con el anterior. Si estas seguro, agrega --forzar.`,
    );
    process.exit(1);
  }

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  mkdirSync(carpetaOut, { recursive: true });
  const pemPrivada = privateKey.export({ type: "pkcs8", format: "pem" });
  writeFileSync(rutaPrivada, pemPrivada, { mode: 0o600 });

  // SPKI/DER de una clave Ed25519 son 44 bytes: 12 bytes de prefijo ASN.1
  // fijo (siempre el mismo OID) + 32 bytes de la clave cruda. Se toman los
  // ultimos 32 en vez de contar el prefijo a mano.
  const der = publicKey.export({ type: "spki", format: "der" });
  const claveCruda = der.subarray(der.length - 32);
  const rutaPublica = path.join(RAIZ_REPO, "apps/desktop/src-tauri/src/licencia_clave_publica.txt");
  writeFileSync(rutaPublica, claveCruda.toString("base64") + "\n");

  console.log(`Clave privada:  ${rutaPrivada}`);
  console.log(`Clave publica:  ${rutaPublica} (esta si se commitea, no es secreta)`);
  console.log(
    "\nHace una copia de seguridad de la clave privada en un lugar offline (gestor de contrasenas, pendrive, etc.). " +
      "Si se pierde, no se van a poder emitir mas licencias nuevas sin generar un par distinto e invalidar las ya emitidas.",
  );
}

function emitir(flags) {
  const faltantes = ["clave-privada", "edicion", "titular", "email"].filter((f) => !flags[f]);
  if (faltantes.length > 0) {
    console.error(`Faltan parametros obligatorios: ${faltantes.map((f) => `--${f}`).join(", ")}`);
    process.exit(1);
  }
  if (!EDICIONES_VALIDAS.includes(flags.edicion)) {
    console.error(`--edicion tiene que ser una de: ${EDICIONES_VALIDAS.join(", ")}`);
    process.exit(1);
  }
  if (flags.vence && flags.perpetua) {
    console.error("Elegi --vence o --perpetua, no los dos.");
    process.exit(1);
  }
  if (!flags.vence && !flags.perpetua) {
    console.error("Falta indicar --vence AAAA-MM-DD o --perpetua (sin vencimiento).");
    process.exit(1);
  }

  const edicion = flags.edicion;
  const titular = flags.titular;
  const email = flags.email;
  const emitida = flags.emitida || hoyISO();
  const vence = flags.perpetua ? null : flags.vence;

  const pem = readFileSync(path.resolve(flags["clave-privada"]), "utf8");
  const clavePrivada = createPrivateKey(pem);

  const mensaje = armarStringFirmado(edicion, titular, email, emitida, vence);
  const firma = sign(null, Buffer.from(mensaje, "utf8"), clavePrivada).toString("base64");

  const licencia = { version: 1, edicion, titular, email, emitida, vence, firma };
  const rutaSalida = path.resolve(flags.salida || `./licencia-${slug(titular)}.json`);
  writeFileSync(rutaSalida, JSON.stringify(licencia, null, 2) + "\n");

  console.log(`Licencia escrita en: ${rutaSalida}`);
  console.log(`\nString firmado:\n${mensaje}`);
  console.log(`Firma (base64): ${firma}`);
}

const [modo, ...resto] = process.argv.slice(2);
const flags = leerFlags(resto);

if (modo === "generar-claves") generarClaves(flags);
else if (modo === "emitir") emitir(flags);
else {
  console.error(
    "Uso:\n" +
      "  node herramientas/licencias/generar-licencia.mjs generar-claves [--out <carpeta>] [--forzar]\n" +
      "  node herramientas/licencias/generar-licencia.mjs emitir --clave-privada <ruta> --edicion <personal|galeria|personal_galeria> --titular \"Nombre\" --email correo@ejemplo.com (--vence AAAA-MM-DD | --perpetua) [--emitida AAAA-MM-DD] [--salida ruta.json]",
  );
  process.exit(1);
}

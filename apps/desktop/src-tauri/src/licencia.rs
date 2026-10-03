use base64::{engine::general_purpose::STANDARD, Engine as _};
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};

// Licencia firmada (Ed25519), validable 100% offline — no hay backend de
// activacion todavia (ver documento de especificacion, seccion 4.1). Las
// licencias se emiten a mano con herramientas/licencias/generar-licencia.mjs,
// usando la clave privada correspondiente (que NUNCA vive en este repo).
// Esta clave publica si se commitea (no es secreta) y se embebe en el
// binario compilado, mismo patron que ARCHIVOS en lightroom.rs.
const CLAVE_PUBLICA_B64: &str = include_str!("licencia_clave_publica.txt");

#[derive(Deserialize)]
struct LicenciaArchivo {
    version: u32,
    edicion: String,
    titular: String,
    email: String,
    emitida: String,
    vence: Option<String>,
    firma: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenciaValida {
    pub edicion: String,
    pub titular: String,
    pub email: String,
    pub emitida: String,
    pub vence: Option<String>,
}

/// El string que se firma (version 1 del formato). A proposito NO es JSON
/// canonico: asi se evita que Node (que emite las licencias) y Rust (que las
/// valida) puedan llegar a serializar el mismo JSON de forma distinta y
/// tumbar una firma que en realidad es valida. Esta funcion tiene que armar
/// exactamente el mismo string, byte a byte, que armarStringFirmado() en
/// herramientas/licencias/generar-licencia.mjs — si se cambia un lado, hay
/// que cambiar el otro.
fn armar_string_firmado(edicion: &str, titular: &str, email: &str, emitida: &str, vence: Option<&str>) -> String {
    format!(
        "galeris-licencia-v1\n{edicion}\n{titular}\n{email}\n{emitida}\n{}\n",
        vence.unwrap_or("")
    )
}

fn clave_publica_embebida() -> Result<VerifyingKey, String> {
    let bytes = STANDARD
        .decode(CLAVE_PUBLICA_B64.trim())
        .map_err(|_| "Clave pública embebida corrupta.".to_string())?;
    let arreglo: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "Clave pública embebida con longitud inválida.".to_string())?;
    VerifyingKey::from_bytes(&arreglo).map_err(|_| "Clave pública embebida inválida.".to_string())
}

// Nucleo puro (sin IO, sin #[tauri::command]): toma la clave publica por
// parametro para poder testearse con una clave de prueba, sin depender del
// archivo embebido real.
fn verificar_con_clave(contenido: &str, hoy: &str, clave_publica: &VerifyingKey) -> Result<LicenciaValida, String> {
    let datos: LicenciaArchivo =
        serde_json::from_str(contenido).map_err(|_| "El archivo de licencia está dañado o no es válido.".to_string())?;

    if datos.version != 1 {
        return Err("Esta versión del programa no entiende este formato de licencia.".to_string());
    }
    if !matches!(datos.edicion.as_str(), "personal" | "galeria" | "personal_galeria") {
        return Err("La edición indicada en la licencia no es válida.".to_string());
    }

    let mensaje = armar_string_firmado(&datos.edicion, &datos.titular, &datos.email, &datos.emitida, datos.vence.as_deref());
    let firma_bytes = STANDARD
        .decode(&datos.firma)
        .map_err(|_| "La firma de la licencia no es válida.".to_string())?;
    let firma_arreglo: [u8; 64] = firma_bytes
        .try_into()
        .map_err(|_| "La firma de la licencia no es válida.".to_string())?;
    let firma = Signature::from_bytes(&firma_arreglo);
    clave_publica
        .verify_strict(mensaje.as_bytes(), &firma)
        .map_err(|_| "La firma de la licencia no es válida.".to_string())?;

    if let Some(vence) = &datos.vence {
        // Comparacion de texto, sin parsear fechas: funciona porque "hoy" y
        // "vence" vienen siempre en formato ISO AAAA-MM-DD, que ordena igual
        // alfabeticamente que cronologicamente.
        if hoy > vence.as_str() {
            return Err(format!("La licencia venció el {vence}."));
        }
    }

    Ok(LicenciaValida {
        edicion: datos.edicion,
        titular: datos.titular,
        email: datos.email,
        emitida: datos.emitida,
        vence: datos.vence,
    })
}

/// Valida el contenido de un archivo de licencia ya leido (el JS lo lee del
/// archivo que eligio el usuario, o del store local donde quedo guardado de
/// una activacion anterior) contra la clave publica embebida. "hoy" lo manda
/// el JS (ya tiene todayISO()) para no necesitar ningun crate de fechas aca.
#[tauri::command]
pub fn validar_licencia(contenido: String, hoy: String) -> Result<LicenciaValida, String> {
    verificar_con_clave(&contenido, &hoy, &clave_publica_embebida()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    // Semilla fija: deterministico, sin RNG real, para que los tests no
    // dependan de la clave publica embebida de verdad.
    fn clave_de_prueba() -> SigningKey {
        SigningKey::from_bytes(&[7u8; 32])
    }

    fn licencia_de_prueba_json(firmante: &SigningKey, vence: Option<&str>) -> String {
        let edicion = "personal_galeria";
        let titular = "Artista de Prueba";
        let email = "prueba@ejemplo.com";
        let emitida = "2026-01-01";
        let mensaje = armar_string_firmado(edicion, titular, email, emitida, vence);
        let firma = firmante.sign(mensaje.as_bytes());
        serde_json::json!({
            "version": 1,
            "edicion": edicion,
            "titular": titular,
            "email": email,
            "emitida": emitida,
            "vence": vence,
            "firma": STANDARD.encode(firma.to_bytes()),
        })
        .to_string()
    }

    #[test]
    fn accepts_a_valid_license() {
        let firmante = clave_de_prueba();
        let contenido = licencia_de_prueba_json(&firmante, None);
        let resultado = verificar_con_clave(&contenido, "2026-06-01", &firmante.verifying_key());
        assert!(resultado.is_ok());
    }

    #[test]
    fn rejects_a_tampered_signature() {
        let firmante = clave_de_prueba();
        let contenido = licencia_de_prueba_json(&firmante, None).replace("Artista de Prueba", "Otro Nombre");
        let resultado = verificar_con_clave(&contenido, "2026-06-01", &firmante.verifying_key());
        assert!(resultado.is_err());
    }

    #[test]
    fn rejects_an_expired_license() {
        let firmante = clave_de_prueba();
        let contenido = licencia_de_prueba_json(&firmante, Some("2026-01-31"));
        let resultado = verificar_con_clave(&contenido, "2026-06-01", &firmante.verifying_key());
        assert!(resultado.is_err());
    }

    #[test]
    fn rejects_an_unsupported_version() {
        let firmante = clave_de_prueba();
        let contenido = licencia_de_prueba_json(&firmante, None).replacen("\"version\":1", "\"version\":2", 1);
        let resultado = verificar_con_clave(&contenido, "2026-06-01", &firmante.verifying_key());
        assert!(resultado.is_err());
    }
}

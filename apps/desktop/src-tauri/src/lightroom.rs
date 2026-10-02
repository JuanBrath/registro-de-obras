use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::ipc::Response;
use tauri::{AppHandle, Manager, Runtime};

// Vinculacion opcional con Lightroom Classic. El complemento (carpeta lightroom/ del proyecto) viene
// dentro del programa y se copia a la carpeta donde Lightroom busca sus complementos; deja la foto y
// sus datos en la carpeta "lightroom-entrada" de los datos del programa, que se lee de aca. Galeris
// Studio funciona igual sin todo esto.
const ARCHIVOS: [(&str, &str); 4] = [
    ("Info.lua", include_str!("../../../../lightroom/GalerisStudio.lrplugin/Info.lua")),
    ("CargarObra.lua", include_str!("../../../../lightroom/GalerisStudio.lrplugin/CargarObra.lua")),
    (
        "VigilarPedidos.lua",
        include_str!("../../../../lightroom/GalerisStudio.lrplugin/VigilarPedidos.lua"),
    ),
    (
        "TranslatedStrings_es.txt",
        include_str!("../../../../lightroom/GalerisStudio.lrplugin/TranslatedStrings_es.txt"),
    ),
];

const NOMBRE_CARPETA: &str = "GalerisStudio.lrplugin";
const CARPETA_ENTRADA: &str = "lightroom-entrada";
const CARPETA_PEDIDO: &str = "lightroom-pedido";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstadoLightroom {
    pub instalado: bool,
    /// Instalado, pero distinto del que trae esta version del programa (por ejemplo, tras una actualizacion).
    pub desactualizado: bool,
    pub lightroom_encontrado: bool,
    pub carpeta: String,
}

fn carpeta_modulos() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "No se encontró la carpeta personal.".to_string())?;
    Ok(PathBuf::from(home).join("Library/Application Support/Adobe/Lightroom/Modules"))
}

fn carpeta_complemento() -> Result<PathBuf, String> {
    Ok(carpeta_modulos()?.join(NOMBRE_CARPETA))
}

fn carpeta_entrada<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join(CARPETA_ENTRADA))
}

fn carpeta_pedido<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join(CARPETA_PEDIDO))
}

#[tauri::command]
pub fn estado_lightroom() -> Result<EstadoLightroom, String> {
    let complemento = carpeta_complemento()?;
    let modulos = carpeta_modulos()?;
    let instalado = complemento.join("Info.lua").exists();
    let desactualizado = instalado
        && ARCHIVOS
            .iter()
            .any(|(nombre, contenido)| fs::read_to_string(complemento.join(nombre)).map(|c| c != *contenido).unwrap_or(true));
    Ok(EstadoLightroom {
        instalado,
        desactualizado,
        lightroom_encontrado: Path::new("/Applications/Adobe Lightroom Classic").exists()
            || modulos.parent().map(|p| p.exists()).unwrap_or(false),
        carpeta: complemento.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn instalar_complemento_lightroom() -> Result<(), String> {
    let carpeta = carpeta_complemento()?;
    fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
    for (nombre, contenido) in ARCHIVOS {
        fs::write(carpeta.join(nombre), contenido).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Solo borra la carpeta propia del complemento (GalerisStudio.lrplugin), nunca la de los demas complementos.
#[tauri::command]
pub fn quitar_complemento_lightroom() -> Result<(), String> {
    let carpeta = carpeta_complemento()?;
    if carpeta.exists() {
        fs::remove_dir_all(&carpeta).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// El contenido de entrada.json, o None si Lightroom no mando nada.
#[tauri::command]
pub fn leer_envio_lightroom<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    let archivo = carpeta_entrada(&app)?.join("entrada.json");
    if !archivo.exists() {
        return Ok(None);
    }
    fs::read_to_string(archivo).map(Some).map_err(|e| e.to_string())
}

/// La foto que dejo Lightroom. Solo se acepta un nombre de archivo suelto (el nombre viene de un archivo externo).
#[tauri::command]
pub fn leer_imagen_envio_lightroom<R: Runtime>(app: AppHandle<R>, nombre: String) -> Result<Response, String> {
    if nombre.is_empty() || nombre.contains('/') || nombre.contains('\\') || nombre.contains("..") {
        return Err("nombre de archivo no válido".into());
    }
    let bytes = fs::read(carpeta_entrada(&app)?.join(nombre)).map_err(|e| e.to_string())?;
    Ok(Response::new(bytes))
}

/// Vacia la carpeta de entrada, para que el mismo envio no se cargue dos veces.
#[tauri::command]
pub fn borrar_envio_lightroom<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let carpeta = carpeta_entrada(&app)?;
    if carpeta.exists() {
        fs::remove_dir_all(carpeta).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Pide abrir una foto en Lightroom Classic (boton "Abrir en Lightroom" de una obra, direccion
/// opuesta a leer_envio_lightroom): deja la ruta en un archivo que el complemento, ya corriendo
/// dentro de Lightroom (VigilarPedidos.lua), revisa cada tanto, y trae Lightroom al frente. Si
/// Lightroom no esta corriendo, lo abre — el pedido espera en el archivo hasta que el complemento
/// termine de cargar y lo revise.
#[tauri::command]
pub fn pedir_abrir_en_lightroom<R: Runtime>(app: AppHandle<R>, ruta: String) -> Result<(), String> {
    let carpeta = carpeta_pedido(&app)?;
    fs::create_dir_all(&carpeta).map_err(|e| e.to_string())?;
    fs::write(carpeta.join("pedido.txt"), ruta).map_err(|e| e.to_string())?;
    std::process::Command::new("open")
        .args(["-a", "Adobe Lightroom Classic"])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

//! Abre el archivo original de una obra en Adobe Photoshop, eligiendo automáticamente la copia
//! más nueva si hay varias versiones instaladas (el nombre de la carpeta en /Applications lleva
//! el año, p.ej. "Adobe Photoshop 2025": a número más alto, versión más nueva).
//!
//! Adobe no instala el `.app` suelto en /Applications: crea una carpeta con el nombre del
//! programa (p.ej. "Adobe Photoshop 2026") y el `.app` de verdad queda adentro, junto con los
//! plug-ins, los ajustes predeterminados y el desinstalador. Por eso hay que mirar un nivel para
//! adentro para encontrarlo (confirmado mirando una instalacion real).

use std::path::{Path, PathBuf};

const CARPETA_APLICACIONES: &str = "/Applications";

fn es_app(ruta: &Path) -> bool {
    ruta.extension().and_then(|e| e.to_str()) == Some("app")
}

/// El `.app` de Photoshop dentro de `entrada`: el `.app` mismo si ya es eso, o el primero que
/// encuentre un nivel adentro (la carpeta contenedora que instala Adobe). None si no hay ninguno
/// (por ejemplo, una carpeta de una version vieja que se desinstalo y solo le quedaron los
/// plug-ins).
fn app_adentro_de(entrada: &Path) -> Option<PathBuf> {
    if es_app(entrada) {
        return Some(entrada.to_path_buf());
    }
    std::fs::read_dir(entrada).ok()?.filter_map(|e| e.ok()).map(|e| e.path()).find(|p| es_app(p))
}

/// Entre las copias de Photoshop instaladas en `directorio`, la de version mas alta (o None si
/// no hay ninguna). Separado de `photoshop_mas_reciente` para poder probarlo sin depender de lo
/// que haya instalado de verdad en /Applications.
fn photoshop_mas_reciente_en(directorio: &Path) -> Option<PathBuf> {
    let mut candidatos: Vec<(u32, PathBuf)> = std::fs::read_dir(directorio)
        .ok()?
        .filter_map(|entrada| entrada.ok())
        .filter_map(|entrada| {
            let nombre = entrada.file_name().to_string_lossy().into_owned();
            let nombre_sin_extension = nombre.trim_end_matches(".app");
            if !nombre_sin_extension.starts_with("Adobe Photoshop") {
                return None;
            }
            let version: u32 =
                nombre_sin_extension.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0);
            let app = app_adentro_de(&entrada.path())?;
            Some((version, app))
        })
        .collect();
    candidatos.sort_by_key(|(version, _)| *version);
    candidatos.pop().map(|(_, ruta)| ruta)
}

fn photoshop_mas_reciente() -> Option<PathBuf> {
    photoshop_mas_reciente_en(Path::new(CARPETA_APLICACIONES))
}

/// Abre el archivo en la copia de Photoshop mas nueva instalada en este equipo.
#[tauri::command]
pub fn abrir_en_photoshop(ruta: String) -> Result<(), String> {
    if !Path::new(&ruta).exists() {
        return Err("no se encontro el archivo original".into());
    }
    let photoshop = photoshop_mas_reciente().ok_or("no se encontro ninguna copia de Adobe Photoshop instalada")?;
    std::process::Command::new("open")
        .arg("-a")
        .arg(&photoshop)
        .arg(&ruta)
        .spawn()
        .map_err(|e| format!("no se pudo abrir Photoshop: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod pruebas {
    use super::*;

    /// Una instalacion real de Adobe: una carpeta con el nombre del programa y el `.app` de
    /// verdad adentro (mas otras carpetas, como "Plug-ins", que no interesan aca).
    fn crear_photoshop_con_carpeta_contenedora(directorio: &Path, nombre_carpeta: &str) {
        std::fs::create_dir_all(directorio.join(nombre_carpeta).join(format!("{nombre_carpeta}.app"))).unwrap();
        std::fs::create_dir_all(directorio.join(nombre_carpeta).join("Plug-ins")).unwrap();
    }

    #[test]
    fn elige_la_version_mas_nueva_entre_varias_instaladas() {
        let directorio = std::env::temp_dir().join(format!("recer_photoshop_{}", std::process::id()));
        std::fs::create_dir_all(&directorio).unwrap();
        crear_photoshop_con_carpeta_contenedora(&directorio, "Adobe Photoshop 2023");
        crear_photoshop_con_carpeta_contenedora(&directorio, "Adobe Photoshop 2026");
        crear_photoshop_con_carpeta_contenedora(&directorio, "Adobe Photoshop 2024");
        std::fs::create_dir_all(directorio.join("Otra Aplicacion.app")).unwrap();

        let encontrado = photoshop_mas_reciente_en(&directorio).unwrap();
        assert_eq!(encontrado.file_name().unwrap().to_str().unwrap(), "Adobe Photoshop 2026.app");
        assert!(encontrado.starts_with(directorio.join("Adobe Photoshop 2026")));

        std::fs::remove_dir_all(&directorio).ok();
    }

    #[test]
    fn tambien_encuentra_un_app_suelto_sin_carpeta_contenedora() {
        let directorio = std::env::temp_dir().join(format!("recer_photoshop_suelto_{}", std::process::id()));
        std::fs::create_dir_all(directorio.join("Adobe Photoshop 2024.app")).unwrap();

        let encontrado = photoshop_mas_reciente_en(&directorio).unwrap();
        assert_eq!(encontrado.file_name().unwrap().to_str().unwrap(), "Adobe Photoshop 2024.app");

        std::fs::remove_dir_all(&directorio).ok();
    }

    #[test]
    fn una_carpeta_de_una_version_desinstalada_sin_app_adentro_se_descarta() {
        // Pasa en la practica: al desinstalar Photoshop a veces queda la carpeta con los
        // plug-ins, pero sin el .app. No tiene que elegirse como si fuera una copia valida.
        let directorio = std::env::temp_dir().join(format!("recer_photoshop_restos_{}", std::process::id()));
        std::fs::create_dir_all(directorio.join("Adobe Photoshop 2025").join("Plug-ins")).unwrap();
        crear_photoshop_con_carpeta_contenedora(&directorio, "Adobe Photoshop 2022");

        let encontrado = photoshop_mas_reciente_en(&directorio).unwrap();
        assert_eq!(encontrado.file_name().unwrap().to_str().unwrap(), "Adobe Photoshop 2022.app");

        std::fs::remove_dir_all(&directorio).ok();
    }

    #[test]
    fn si_no_hay_ninguna_copia_instalada_no_encuentra_nada() {
        let directorio = std::env::temp_dir().join(format!("recer_photoshop_vacio_{}", std::process::id()));
        std::fs::create_dir_all(&directorio).unwrap();
        assert!(photoshop_mas_reciente_en(&directorio).is_none());
        std::fs::remove_dir_all(&directorio).ok();
    }

    #[test]
    fn si_el_archivo_original_no_existe_da_error_claro() {
        match abrir_en_photoshop("/no/existe/archivo.psd".to_string()) {
            Err(motivo) => assert_eq!(motivo, "no se encontro el archivo original"),
            Ok(_) => panic!("se esperaba un error"),
        }
    }
}

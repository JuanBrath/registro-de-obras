use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// Lexically resolves ".."/"." segments without touching the filesystem, so a
/// traversal attempt can be rejected before any directory gets created.
fn normalize(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                result.pop();
            }
            std::path::Component::CurDir => {}
            other => result.push(other.as_os_str()),
        }
    }
    result
}

/// Custom fs commands operate on an explicit `root` chosen by the user (via the
/// folder picker) joined with a `relative_path`. They intentionally bypass
/// tauri-plugin-fs's static capability scope, since the workspace root is only
/// known at runtime and can be any folder on disk. Every entry point resolves
/// through here first so a ".."-based traversal is rejected before touching disk.
fn resolve(root: &str, relative_path: &str) -> Result<PathBuf, String> {
    let canonical_root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let normalized = normalize(&canonical_root.join(relative_path));

    if !normalized.starts_with(&canonical_root) {
        return Err("la ruta resuelta esta fuera del workspace".into());
    }

    Ok(normalized)
}

#[tauri::command]
pub fn fs_ensure_dir(root: String, relative_path: String) -> Result<(), String> {
    let dir = resolve(&root, &relative_path)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_write_file(root: String, relative_path: String, data: Vec<u8>) -> Result<(), String> {
    let path = resolve(&root, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_read_file(root: String, relative_path: String) -> Result<Vec<u8>, String> {
    let path = resolve(&root, &relative_path)?;
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_exists(root: String, relative_path: String) -> Result<bool, String> {
    let path = resolve(&root, &relative_path)?;
    Ok(path.exists())
}

#[tauri::command]
pub fn fs_remove(root: String, relative_path: String) -> Result<(), String> {
    let path = resolve(&root, &relative_path)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn fs_resolve_absolute(root: String, relative_path: String) -> Result<String, String> {
    let path = resolve(&root, &relative_path)?;
    Ok(path.to_string_lossy().to_string())
}

/// Writes to an arbitrary absolute path with no root/traversal check — used
/// for exports (e.g. the sales report PDF) whose destination comes from a
/// native "Save As" dialog the user already picked explicitly, unlike
/// fs_write_file which is sandboxed to the workspace root.
#[tauri::command]
pub fn fs_write_absolute(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(path, data).map_err(|e| e.to_string())
}

/// Reads an arbitrary absolute path with no root/traversal check — the read
/// counterpart of fs_write_absolute, used to read metadata (EXIF/IPTC/XMP)
/// from a file the user already picked explicitly via a native "Open" dialog
/// (e.g. the photography "ubicacion del archivo" field), which lives outside
/// the workspace root that fs_read_file is sandboxed to.
///
/// `max_bytes`, when given, caps how much gets read (and sent over IPC as a
/// JSON array of numbers, which gets expensive fast for big files): the
/// metadata this app looks for always lives near the start of the file, so a
/// several-hundred-MB PSD or camera RAW file doesn't need to travel over IPC
/// in full just to read a few tags out of it.
#[tauri::command]
pub fn fs_read_absolute(path: String, max_bytes: Option<u64>) -> Result<Vec<u8>, String> {
    match max_bytes {
        None => fs::read(path).map_err(|e| e.to_string()),
        Some(max) => {
            let file = fs::File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            file.take(max).read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            Ok(buffer)
        }
    }
}

#[derive(Clone, Serialize)]
struct ProgresoCopiaCarpeta {
    copiados: usize,
    total: usize,
}

fn contar_archivos(dir: &Path) -> std::io::Result<usize> {
    let mut total = 0;
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            total += contar_archivos(&path)?;
        } else {
            total += 1;
        }
    }
    Ok(total)
}

/// Logica pura de la copia recursiva, sin depender de Tauri: recibe un
/// callback de progreso generico en vez de un AppHandle, para poder probarla
/// con un closure comun en los tests de abajo.
fn copiar_recursivo(
    origen: &Path,
    destino: &Path,
    copiados: &mut usize,
    total: usize,
    on_progreso: &mut dyn FnMut(usize, usize),
) -> std::io::Result<()> {
    fs::create_dir_all(destino)?;
    for entry in fs::read_dir(origen)? {
        let path = entry?.path();
        let Some(nombre) = path.file_name() else { continue };
        let dest_path = destino.join(nombre);
        if path.is_dir() {
            copiar_recursivo(&path, &dest_path, copiados, total, on_progreso)?;
        } else {
            fs::copy(&path, &dest_path)?;
            *copiados += 1;
            on_progreso(*copiados, total);
        }
    }
    Ok(())
}

/// Copia recursivamente toda una carpeta de workspace (base de datos, obras,
/// certificados) de un lugar a otro — usado por "Mover carpeta" en Ajustes,
/// para que el usuario no tenga que arrastrar archivos a mano en el Finder.
/// Emite progreso via el evento "carpeta-copiando-progreso" a medida que
/// copia cada archivo. La carpeta de origen nunca se toca ni se borra aca:
/// eso es una decision aparte, explicita, del usuario (ver
/// fs_remove_workspace_root).
#[tauri::command]
pub fn fs_copiar_carpeta<R: tauri::Runtime>(app: AppHandle<R>, origen: String, destino: String) -> Result<(), String> {
    // El mensaje distingue si el problema fue leer el origen o escribir el
    // destino: en macOS, un "Permission denied" al leer el origen (que puede
    // estar en un disco externo, si ahi es donde esta el workspace ahora)
    // pasa ANTES de siquiera intentar tocar el destino, y sin esta distincion
    // el usuario no tiene forma de saber cual de las dos carpetas es la que
    // esta bloqueada.
    let origen_path = fs::canonicalize(&origen)
        .map_err(|e| format!("No se pudo acceder a la carpeta de origen ({origen}): {e}"))?;
    let destino_path = PathBuf::from(&destino);
    if let Ok(destino_canonico) = fs::canonicalize(&destino_path) {
        if destino_canonico == origen_path {
            return Err("La carpeta de destino es la misma que la de origen".into());
        }
    }

    let total = contar_archivos(&origen_path)
        .map_err(|e| format!("No se pudo leer el contenido de la carpeta de origen ({origen}): {e}"))?;
    let mut copiados = 0;
    copiar_recursivo(&origen_path, &destino_path, &mut copiados, total, &mut |copiados, total| {
        let _ = app.emit("carpeta-copiando-progreso", ProgresoCopiaCarpeta { copiados, total });
    })
    .map_err(|e| format!("No se pudo copiar de \"{origen}\" a \"{destino}\": {e}"))
}

/// Borra una carpeta de workspace vieja despues de una mudanza confirmada
/// (ver fs_copiar_carpeta). Solo borra si la carpeta todavia tiene un
/// registro.db adentro — evita borrar por error una carpeta que en realidad
/// no es (o ya dejo de ser) una carpeta de datos de Galeris.
#[tauri::command]
pub fn fs_remove_workspace_root(path: String) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.join("registro.db").exists() {
        return Err(
            "La carpeta no parece ser una carpeta de datos de Galeris (no tiene registro.db) — no se borra por seguridad."
                .into(),
        );
    }
    fs::remove_dir_all(root).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("registro_fs_test_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_then_read_roundtrip() {
        let root = temp_root("roundtrip");
        let root_str = root.to_string_lossy().to_string();

        fs_write_file(root_str.clone(), "obras/1/original.jpg".into(), vec![1, 2, 3]).unwrap();
        let bytes = fs_read_file(root_str.clone(), "obras/1/original.jpg".into()).unwrap();

        assert_eq!(bytes, vec![1, 2, 3]);
        assert!(fs_exists(root_str.clone(), "obras/1/original.jpg".into()).unwrap());
    }

    #[test]
    fn rejects_path_traversal_outside_root() {
        let root = temp_root("traversal");
        let root_str = root.to_string_lossy().to_string();

        let result = fs_write_file(root_str, "../escaped.jpg".into(), vec![1]);

        assert!(result.is_err());
    }

    #[test]
    fn ensure_dir_creates_nested_directories() {
        let root = temp_root("ensure_dir");
        let root_str = root.to_string_lossy().to_string();

        fs_ensure_dir(root_str.clone(), "obras".into()).unwrap();
        fs_ensure_dir(root_str, "certificados".into()).unwrap();

        assert!(root.join("obras").is_dir());
        assert!(root.join("certificados").is_dir());
    }

    #[test]
    fn remove_deletes_file() {
        let root = temp_root("remove");
        let root_str = root.to_string_lossy().to_string();

        fs_write_file(root_str.clone(), "obras/1/miniatura.jpg".into(), vec![9]).unwrap();
        fs_remove(root_str.clone(), "obras/1/miniatura.jpg".into()).unwrap();

        assert!(!fs_exists(root_str, "obras/1/miniatura.jpg".into()).unwrap());
    }

    #[test]
    fn write_absolute_writes_to_the_exact_given_path() {
        let root = temp_root("write_absolute");
        let target = root.join("informe-ventas.pdf");
        let target_str = target.to_string_lossy().to_string();

        fs_write_absolute(target_str, vec![1, 2, 3]).unwrap();

        assert_eq!(fs::read(&target).unwrap(), vec![1, 2, 3]);
    }

    #[test]
    fn read_absolute_reads_the_exact_given_path() {
        let root = temp_root("read_absolute");
        let target = root.join("foto.jpg");
        fs::write(&target, vec![4, 5, 6]).unwrap();

        let bytes = fs_read_absolute(target.to_string_lossy().to_string(), None).unwrap();

        assert_eq!(bytes, vec![4, 5, 6]);
    }

    #[test]
    fn read_absolute_with_max_bytes_truncates_big_files_instead_of_reading_them_whole() {
        let root = temp_root("read_absolute_max_bytes");
        let target = root.join("original.psd");
        fs::write(&target, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).unwrap();

        let bytes = fs_read_absolute(target.to_string_lossy().to_string(), Some(4)).unwrap();

        assert_eq!(bytes, vec![1, 2, 3, 4]);
    }

    #[test]
    fn read_absolute_with_max_bytes_larger_than_the_file_reads_it_whole() {
        let root = temp_root("read_absolute_max_bytes_chico");
        let target = root.join("original.jpg");
        fs::write(&target, vec![1, 2, 3]).unwrap();

        let bytes = fs_read_absolute(target.to_string_lossy().to_string(), Some(1000)).unwrap();

        assert_eq!(bytes, vec![1, 2, 3]);
    }

    #[test]
    fn copiar_recursivo_copia_archivos_y_subcarpetas_y_reporta_progreso() {
        let origen = temp_root("copiar_origen");
        fs::write(origen.join("registro.db"), vec![1]).unwrap();
        fs::create_dir_all(origen.join("obras/1")).unwrap();
        fs::write(origen.join("obras/1/original.jpg"), vec![2, 3]).unwrap();
        fs::create_dir_all(origen.join("certificados")).unwrap();

        let destino = std::env::temp_dir().join("registro_fs_test_copiar_destino");
        let _ = fs::remove_dir_all(&destino);

        let total = contar_archivos(&origen).unwrap();
        assert_eq!(total, 2);

        let mut copiados = 0;
        let mut llamadas = Vec::new();
        copiar_recursivo(&origen, &destino, &mut copiados, total, &mut |c, t| llamadas.push((c, t))).unwrap();

        assert_eq!(copiados, 2);
        assert_eq!(llamadas.len(), 2);
        assert!(llamadas.iter().all(|&(_, t)| t == 2));
        assert_eq!(fs::read(destino.join("registro.db")).unwrap(), vec![1]);
        assert_eq!(fs::read(destino.join("obras/1/original.jpg")).unwrap(), vec![2, 3]);
        assert!(destino.join("certificados").is_dir());

        let _ = fs::remove_dir_all(&destino);
    }

    #[test]
    fn fs_copiar_carpeta_rechaza_copiar_una_carpeta_sobre_si_misma() {
        let root = temp_root("copiar_mismo");
        let root_str = root.to_string_lossy().to_string();
        let app = tauri::test::mock_app();

        let result = fs_copiar_carpeta(app.handle().clone(), root_str.clone(), root_str);

        assert!(result.is_err());
    }

    #[test]
    fn fs_copiar_carpeta_informa_si_el_problema_es_el_origen() {
        let origen_inexistente = std::env::temp_dir().join("registro_fs_test_origen_que_no_existe");
        let _ = fs::remove_dir_all(&origen_inexistente);
        let destino = temp_root("copiar_origen_malo_destino");
        let app = tauri::test::mock_app();

        let result = fs_copiar_carpeta(
            app.handle().clone(),
            origen_inexistente.to_string_lossy().to_string(),
            destino.to_string_lossy().to_string(),
        );

        let err = result.unwrap_err();
        assert!(err.contains("origen"), "el mensaje deberia mencionar el origen: {err}");
    }

    #[test]
    fn fs_copiar_carpeta_copia_todo_el_contenido_a_una_carpeta_nueva() {
        let origen = temp_root("copiar_carpeta_origen");
        fs::write(origen.join("registro.db"), vec![7]).unwrap();
        let destino = std::env::temp_dir().join("registro_fs_test_copiar_carpeta_destino");
        let _ = fs::remove_dir_all(&destino);
        let app = tauri::test::mock_app();

        fs_copiar_carpeta(app.handle().clone(), origen.to_string_lossy().to_string(), destino.to_string_lossy().to_string())
            .unwrap();

        assert_eq!(fs::read(destino.join("registro.db")).unwrap(), vec![7]);
        let _ = fs::remove_dir_all(&destino);
    }

    #[test]
    fn remove_workspace_root_se_niega_sin_registro_db() {
        let root = temp_root("remove_root_sin_db");
        let root_str = root.to_string_lossy().to_string();

        let result = fs_remove_workspace_root(root_str);

        assert!(result.is_err());
        assert!(root.exists());
    }

    #[test]
    fn remove_workspace_root_borra_si_tiene_registro_db() {
        let root = temp_root("remove_root_con_db");
        fs::write(root.join("registro.db"), vec![1]).unwrap();
        let root_str = root.to_string_lossy().to_string();

        fs_remove_workspace_root(root_str).unwrap();

        assert!(!root.exists());
    }
}

use std::fs;
use std::path::{Path, PathBuf};

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
}

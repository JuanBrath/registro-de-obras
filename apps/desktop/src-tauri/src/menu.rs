use std::sync::Mutex;

use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Manager, Runtime, State};

pub const LANG_ES_ID: &str = "lang-es";
pub const LANG_EN_ID: &str = "lang-en";

pub const EDICION_PERSONAL_ID: &str = "edicion-personal";
pub const EDICION_GALERIA_ID: &str = "edicion-galeria";
pub const EDICION_PERSONAL_GALERIA_ID: &str = "edicion-personal-galeria";

pub const TEMA_CLARO_ID: &str = "tema-claro";
pub const TEMA_OSCURO_ID: &str = "tema-oscuro";

pub const WINDOW_MAXIMIZE_ID: &str = "window-maximize";
pub const WINDOW_FULLSCREEN_ID: &str = "window-fullscreen";

// Idioma, edicion y tema viven en el store del lado JS (idioma.json /
// licencia.json / tema.json); esto solo cachea los ultimos valores conocidos
// para poder reconstruir el menu completo cuando alguno cambia (el menu no
// tiene forma de leer el store de Tauri directamente).
//
// window_maximized/window_fullscreen cachean el ultimo estado de ventana
// usado para reconstruir el menu — sirven solo para no reconstruir el menu
// entero en cada evento de resize (que dispara muchas veces durante un
// arrastre), sino unicamente cuando el estado realmente cambio.
pub struct MenuState {
    pub lang: Mutex<String>,
    pub edicion: Mutex<String>,
    pub tema: Mutex<String>,
    pub window_maximized: Mutex<bool>,
    pub window_fullscreen: Mutex<bool>,
}

impl Default for MenuState {
    fn default() -> Self {
        Self {
            lang: Mutex::new("es".to_string()),
            edicion: Mutex::new("personal_galeria".to_string()),
            tema: Mutex::new("claro".to_string()),
            window_maximized: Mutex::new(false),
            window_fullscreen: Mutex::new(false),
        }
    }
}

// Tauri's default app-wide menu (used when no custom menu is set) ships with
// English labels regardless of the app's own language setting. This builds
// an equivalent menu with labels for the language the user picked in
// Configuracion, so the native macOS/Windows/Linux menu bar stays in sync
// with the in-app UI language.
//
// The "Edicion" submenu is a MANUAL override for previewing what each
// subscription tier would show (see EdicionId in packages/core) — there is
// no real licensing backend yet. It is meant to be temporary/replaceable:
// once real subscription validation exists, this submenu goes away (or
// becomes read-only) and getEdicion() on the JS side starts asking the real
// backend instead of the local store — this file doesn't need to change.
pub fn build_menu<R: Runtime>(app: &AppHandle<R>, lang: &str, edicion: &str, tema: &str) -> tauri::Result<Menu<R>> {
    let es = lang != "en";

    let app_menu = SubmenuBuilder::new(app, app.package_info().name.clone())
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(
            app,
            Some(if es { "Ocultar" } else { "Hide" }),
        )?)
        .item(&PredefinedMenuItem::hide_others(
            app,
            Some(if es { "Ocultar otros" } else { "Hide Others" }),
        )?)
        .item(&PredefinedMenuItem::show_all(
            app,
            Some(if es { "Mostrar todo" } else { "Show All" }),
        )?)
        .separator()
        .item(&PredefinedMenuItem::quit(
            app,
            Some(if es { "Salir" } else { "Quit" }),
        )?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, if es { "Editar" } else { "Edit" })
        .item(&PredefinedMenuItem::undo(
            app,
            Some(if es { "Deshacer" } else { "Undo" }),
        )?)
        .item(&PredefinedMenuItem::redo(
            app,
            Some(if es { "Rehacer" } else { "Redo" }),
        )?)
        .separator()
        .item(&PredefinedMenuItem::cut(
            app,
            Some(if es { "Cortar" } else { "Cut" }),
        )?)
        .item(&PredefinedMenuItem::copy(
            app,
            Some(if es { "Copiar" } else { "Copy" }),
        )?)
        .item(&PredefinedMenuItem::paste(
            app,
            Some(if es { "Pegar" } else { "Paste" }),
        )?)
        .item(&PredefinedMenuItem::select_all(
            app,
            Some(if es { "Seleccionar todo" } else { "Select All" }),
        )?)
        .build()?;

    let lang_menu = SubmenuBuilder::new(app, if es { "Idioma" } else { "Language" })
        .item(
            &CheckMenuItemBuilder::with_id(LANG_ES_ID, "🇦🇷 Español")
                .checked(es)
                .build(app)?,
        )
        .item(
            &CheckMenuItemBuilder::with_id(LANG_EN_ID, "🇺🇸 English")
                .checked(!es)
                .build(app)?,
        )
        .build()?;

    let edicion_menu = SubmenuBuilder::new(app, if es { "Edición (prueba)" } else { "Edition (preview)" })
        .item(
            &CheckMenuItemBuilder::with_id(EDICION_PERSONAL_ID, "Personal")
                .checked(edicion == "personal")
                .build(app)?,
        )
        .item(
            &CheckMenuItemBuilder::with_id(EDICION_GALERIA_ID, if es { "Galería" } else { "Gallery" })
                .checked(edicion == "galeria")
                .build(app)?,
        )
        .item(
            &CheckMenuItemBuilder::with_id(
                EDICION_PERSONAL_GALERIA_ID,
                if es { "Personal + Galería" } else { "Personal + Gallery" },
            )
            .checked(edicion == "personal_galeria")
            .build(app)?,
        )
        .build()?;

    let tema_menu = SubmenuBuilder::new(app, if es { "Apariencia" } else { "Appearance" })
        .item(
            &CheckMenuItemBuilder::with_id(TEMA_CLARO_ID, if es { "Claro" } else { "Light" })
                .checked(tema == "claro")
                .build(app)?,
        )
        .item(
            &CheckMenuItemBuilder::with_id(TEMA_OSCURO_ID, if es { "Oscuro" } else { "Dark" })
                .checked(tema == "oscuro")
                .build(app)?,
        )
        .build()?;

    // Maximizar/Pantalla completa se reemplazan por CheckMenuItems propios
    // (en vez de los PredefinedMenuItem nativos) para poder mostrar un tilde
    // junto a la opcion activa; el estado se lee en vivo de la ventana real
    // cada vez que se reconstruye el menu (no se cachea aparte).
    let window = app.get_webview_window("main");
    let is_fullscreen = window.as_ref().and_then(|w| w.is_fullscreen().ok()).unwrap_or(false);
    // En macOS is_maximized() tambien da true estando en pantalla completa
    // (la ventana ocupa toda la pantalla en los dos casos); se excluye ese
    // caso para que los dos tildes sean mutuamente excluyentes.
    let is_maximized =
        !is_fullscreen && window.as_ref().and_then(|w| w.is_maximized().ok()).unwrap_or(false);

    let window_menu = SubmenuBuilder::new(app, if es { "Ventana" } else { "Window" })
        .item(&PredefinedMenuItem::minimize(
            app,
            Some(if es { "Minimizar" } else { "Minimize" }),
        )?)
        .item(
            &CheckMenuItemBuilder::with_id(WINDOW_MAXIMIZE_ID, if es { "Maximizar" } else { "Zoom" })
                .checked(is_maximized)
                .build(app)?,
        )
        .item(
            &CheckMenuItemBuilder::with_id(
                WINDOW_FULLSCREEN_ID,
                if es { "Pantalla completa" } else { "Enter Full Screen" },
            )
            .checked(is_fullscreen)
            .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::close_window(
            app,
            Some(if es { "Cerrar ventana" } else { "Close Window" }),
        )?)
        .build()?;

    MenuBuilder::new(app)
        .items(&[&app_menu, &edit_menu, &lang_menu, &edicion_menu, &tema_menu, &window_menu])
        .build()
}

pub fn rebuild_menu<R: Runtime>(app: &AppHandle<R>, state: &MenuState) -> tauri::Result<()> {
    let lang = state.lang.lock().unwrap().clone();
    let edicion = state.edicion.lock().unwrap().clone();
    let tema = state.tema.lock().unwrap().clone();
    let menu = build_menu(app, &lang, &edicion, &tema)?;
    app.set_menu(menu)?;
    Ok(())
}

#[tauri::command]
pub fn set_app_menu_language(app: AppHandle, state: State<MenuState>, lang: String) -> Result<(), String> {
    *state.lang.lock().unwrap() = lang;
    rebuild_menu(&app, &state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_app_menu_edicion(app: AppHandle, state: State<MenuState>, edicion: String) -> Result<(), String> {
    *state.edicion.lock().unwrap() = edicion;
    rebuild_menu(&app, &state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_app_menu_tema(app: AppHandle, state: State<MenuState>, tema: String) -> Result<(), String> {
    *state.tema.lock().unwrap() = tema;
    rebuild_menu(&app, &state).map_err(|e| e.to_string())
}

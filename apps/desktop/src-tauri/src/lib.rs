mod db_commands;
mod fs_commands;
mod menu;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .manage(db_commands::TxState::default())
    .manage(menu::MenuState::default())
    .invoke_handler(tauri::generate_handler![
      fs_commands::fs_ensure_dir,
      fs_commands::fs_write_file,
      fs_commands::fs_read_file,
      fs_commands::fs_exists,
      fs_commands::fs_remove,
      fs_commands::fs_resolve_absolute,
      fs_commands::fs_write_absolute,
      db_commands::db_begin,
      db_commands::db_tx_execute,
      db_commands::db_tx_query,
      db_commands::db_commit,
      db_commands::db_rollback,
      menu::set_app_menu_language,
      menu::set_app_menu_edicion,
      menu::set_app_menu_tema,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let initial_menu = menu::build_menu(app.handle(), "es", "personal_galeria", "claro")?;
      app.set_menu(initial_menu)?;

      app.on_menu_event(|app_handle, event| {
        match event.id().as_ref() {
          menu::LANG_ES_ID => {
            let _ = app_handle.emit("set-language", "es");
          }
          menu::LANG_EN_ID => {
            let _ = app_handle.emit("set-language", "en");
          }
          menu::EDICION_PERSONAL_ID => {
            let _ = app_handle.emit("set-edicion", "personal");
          }
          menu::EDICION_GALERIA_ID => {
            let _ = app_handle.emit("set-edicion", "galeria");
          }
          menu::EDICION_PERSONAL_GALERIA_ID => {
            let _ = app_handle.emit("set-edicion", "personal_galeria");
          }
          menu::TEMA_CLARO_ID => {
            let _ = app_handle.emit("set-tema", "claro");
          }
          menu::TEMA_OSCURO_ID => {
            let _ = app_handle.emit("set-tema", "oscuro");
          }
          menu::WINDOW_MAXIMIZE_ID => {
            if let Some(window) = app_handle.get_webview_window("main") {
              let is_maximized = window.is_maximized().unwrap_or(false);
              let _ = if is_maximized { window.unmaximize() } else { window.maximize() };
            }
            let state: tauri::State<menu::MenuState> = app_handle.state();
            let _ = menu::rebuild_menu(app_handle, &state);
          }
          menu::WINDOW_FULLSCREEN_ID => {
            if let Some(window) = app_handle.get_webview_window("main") {
              let is_fullscreen = window.is_fullscreen().unwrap_or(false);
              let _ = window.set_fullscreen(!is_fullscreen);
            }
            let state: tauri::State<menu::MenuState> = app_handle.state();
            let _ = menu::rebuild_menu(app_handle, &state);
          }
          _ => {}
        }
      });

      // El tilde de Maximizar/Pantalla completa tiene que reflejar el estado
      // real de la ventana tambien cuando el usuario la maximiza por fuera
      // del menu (boton verde nativo, atajo de teclado, arrastre). Se
      // reconstruye el menu solo cuando el estado efectivamente cambio, para
      // no reconstruirlo en cada evento de resize durante un arrastre.
      if let Some(window) = app.get_webview_window("main") {
        let app_handle_for_resize = app.handle().clone();
        window.on_window_event(move |event| {
          if let tauri::WindowEvent::Resized(_) = event {
            let Some(window) = app_handle_for_resize.get_webview_window("main") else {
              return;
            };
            let is_maximized = window.is_maximized().unwrap_or(false);
            let is_fullscreen = window.is_fullscreen().unwrap_or(false);
            let state: tauri::State<menu::MenuState> = app_handle_for_resize.state();
            let mut last_maximized = state.window_maximized.lock().unwrap();
            let mut last_fullscreen = state.window_fullscreen.lock().unwrap();
            if *last_maximized != is_maximized || *last_fullscreen != is_fullscreen {
              *last_maximized = is_maximized;
              *last_fullscreen = is_fullscreen;
              drop(last_maximized);
              drop(last_fullscreen);
              let _ = menu::rebuild_menu(&app_handle_for_resize, &state);
            }
          }
        });
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

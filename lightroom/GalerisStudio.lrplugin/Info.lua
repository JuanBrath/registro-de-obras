-- Complemento opcional de Lightroom Classic para cargar la foto elegida como una obra nueva en Galeris Studio.
-- Galeris Studio funciona igual sin este complemento. Para quitarlo: Galeris Studio > Configuracion
-- > Lightroom Classic > Quitar complemento (o borrar esta carpeta de
-- ~/Library/Application Support/Adobe/Lightroom/Modules/).
return {
  LrSdkVersion = 6.0,
  LrSdkMinimumVersion = 5.0,
  LrToolkitIdentifier = 'com.galeris.studio',
  LrPluginName = 'Galeris Studio',

  -- Tarea en segundo plano que revisa pedidos de "Abrir en Lightroom" desde una obra (ver
  -- VigilarPedidos.lua). LrForceInitPlugin hace que arranque apenas Lightroom carga el complemento, en
  -- vez de esperar a que el usuario use el menu por primera vez (alcanza con que el complemento ya
  -- aporte un item de menu, como este).
  LrInitPlugin = 'VigilarPedidos.lua',
  LrForceInitPlugin = true,

  LrLibraryMenuItems = {
    {
      title = LOC "$$$/GalerisStudio/Menu=Add artwork to Galeris Studio…",
      file = 'CargarObra.lua',
      enabledWhen = 'photosSelected',
    },
  },

  LrExportMenuItems = {
    {
      title = LOC "$$$/GalerisStudio/Menu=Add artwork to Galeris Studio…",
      file = 'CargarObra.lua',
      enabledWhen = 'photosSelected',
    },
  },

  VERSION = { major = 0, minor = 1, revision = 0 },
}

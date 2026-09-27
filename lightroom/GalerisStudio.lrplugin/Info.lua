-- Complemento opcional de Lightroom Classic para cargar la foto elegida como una obra nueva en Galeris Studio.
-- Galeris Studio funciona igual sin este complemento. Para quitarlo: Galeris Studio > Configuracion
-- > Lightroom Classic > Quitar complemento (o borrar esta carpeta de
-- ~/Library/Application Support/Adobe/Lightroom/Modules/).
return {
  LrSdkVersion = 6.0,
  LrSdkMinimumVersion = 5.0,
  LrToolkitIdentifier = 'com.galeris.studio',
  LrPluginName = 'Galeris Studio',

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

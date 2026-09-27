-- Manda la foto activa de Lightroom Classic a Galeris Studio, para cargarla como una obra nueva.
--
-- Como funciona: prepara una copia de la foto en JPG y un archivo de datos (titulo, palabras clave,
-- calificacion, fecha de captura, camara, ruta del original...) en la carpeta "lightroom-entrada" de
-- Galeris Studio, y abre Galeris Studio. Galeris Studio lee esa carpeta al abrirse (o al volver a primer
-- plano), abre "Nueva obra" con eso ya cargado y la vacia. No se cambia nada en la foto ni en el catalogo.
--
-- Los datos se escriben en JSON a mano (Lightroom no trae una libreria para eso): ver
-- packages/core/src/business/lightroom.ts en Galeris Studio, que es quien los interpreta.

local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrDate = import 'LrDate'
local LrExportSession = import 'LrExportSession'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local LrTasks = import 'LrTasks'

local LADO_MAXIMO = 2400

-- Texto entre comillas para JSON: escapa la barra, las comillas y los caracteres de control.
local function jsonTexto(valor)
  local texto = tostring(valor or '')
  texto = texto:gsub('\\', '\\\\')
  texto = texto:gsub('"', '\\"')
  texto = texto:gsub('%c', function(c) return string.format('\\u%04x', c:byte()) end)
  return '"' .. texto .. '"'
end

local function escribirArchivo(ruta, contenido)
  local archivo, motivo = io.open(ruta, 'wb')
  if not archivo then error(motivo or ruta) end
  archivo:write(contenido)
  archivo:close()
end

local function mostrar(mensaje)
  LrDialogs.message(LOC "$$$/GalerisStudio/Titulo=Galeris Studio", mensaje, 'info')
end

-- Los valores de Lightroom pueden venir vacios (nil): en el archivo de datos quedan como "".
local function metadato(foto, nombre)
  return foto:getFormattedMetadata(nombre)
end

local function mandarFoto()
  if WIN_ENV then
    mostrar(LOC "$$$/GalerisStudio/SoloMac=This plug-in only works on macOS.")
    return
  end

  local foto = LrApplication.activeCatalog():getTargetPhoto()
  if not foto then
    mostrar(LOC "$$$/GalerisStudio/SinFoto=Select a photo first.")
    return
  end

  -- La carpeta de datos de Galeris Studio: ~/Library/Application Support/com.registrodeobras.app.
  -- No sirve getStandardFilePath('appData'): en Lightroom eso es SU propia carpeta.
  local casa = LrPathUtils.getStandardFilePath('home')
  local buzon = LrPathUtils.child(
    LrPathUtils.child(LrPathUtils.child(LrPathUtils.child(casa, 'Library'), 'Application Support'), 'com.registrodeobras.app'),
    'lightroom-entrada'
  )
  LrFileUtils.createAllDirectories(buzon)
  local rutaDatos = LrPathUtils.child(buzon, 'entrada.json')
  local rutaImagen = LrPathUtils.child(buzon, 'imagen.jpg')
  -- Se borra lo anterior primero: Galeris Studio solo actua cuando aparece el archivo de datos, y ese va al final.
  LrFileUtils.delete(rutaDatos)
  LrFileUtils.delete(rutaImagen)

  local sesion = LrExportSession {
    photosToExport = { foto },
    exportSettings = {
      LR_export_destinationType = 'specificFolder',
      LR_export_destinationPathPrefix = buzon,
      LR_export_useSubfolder = false,
      LR_collisionHandling = 'overwrite',
      LR_format = 'JPEG',
      LR_jpeg_quality = 0.9,
      LR_export_colorSpace = 'sRGB',
      LR_size_doConstrain = true,
      LR_size_doNotEnlarge = true,
      LR_size_units = 'pixels',
      LR_size_resizeType = 'longEdge',
      LR_size_maxWidth = LADO_MAXIMO,
      LR_size_maxHeight = LADO_MAXIMO,
      LR_reimportExportedPhoto = false,
    },
  }

  local exportada, fallo
  for _, rendicion in sesion:renditions() do
    local ok, rutaOMensaje = rendicion:waitForRender()
    if ok then exportada = rutaOMensaje else fallo = rutaOMensaje end
  end
  if not exportada then
    mostrar(LOC("$$$/GalerisStudio/ErrorExportar=The photo could not be prepared: ^1", tostring(fallo)))
    return
  end
  if exportada ~= rutaImagen then
    if not LrFileUtils.move(exportada, rutaImagen) then
      mostrar(LOC("$$$/GalerisStudio/ErrorExportar=The photo could not be prepared: ^1", exportada))
      return
    end
  end

  local fechaCaptura = ''
  local fechaToma = foto:getRawMetadata('dateTimeOriginal')
  if fechaToma then fechaCaptura = string.sub(LrDate.timeToW3CDate(fechaToma), 1, 10) end

  -- Palabras clave: los nombres de todas las que tiene la foto en el catalogo.
  local palabras = {}
  for _, palabra in ipairs(foto:getRawMetadata('keywords') or {}) do
    palabras[#palabras + 1] = jsonTexto(palabra:getName())
  end

  local datos = '{'
    .. '"version":1,'
    .. '"id":' .. jsonTexto(tostring(LrDate.currentTime())) .. ','
    .. '"titulo":' .. jsonTexto(metadato(foto, 'title')) .. ','
    .. '"fechaCaptura":' .. jsonTexto(fechaCaptura) .. ','
    .. '"palabrasClave":[' .. table.concat(palabras, ',') .. '],'
    .. '"calificacion":' .. tostring(math.floor(tonumber(foto:getRawMetadata('rating')) or 0)) .. ','
    .. '"camaraMarca":' .. jsonTexto(metadato(foto, 'cameraMake')) .. ','
    .. '"camaraModelo":' .. jsonTexto(metadato(foto, 'cameraModel')) .. ','
    .. '"iso":' .. jsonTexto(foto:getRawMetadata('isoSpeedRating')) .. ','
    .. '"velocidad":' .. jsonTexto(metadato(foto, 'shutterSpeed')) .. ','
    .. '"diafragma":' .. jsonTexto(metadato(foto, 'aperture')) .. ','
    .. '"distanciaFocal":' .. jsonTexto(metadato(foto, 'focalLength')) .. ','
    .. '"rutaOriginal":' .. jsonTexto(foto:getRawMetadata('path')) .. ','
    .. '"imagen":"imagen.jpg"'
    .. '}'
  escribirArchivo(rutaDatos, datos)

  if LrTasks.execute('open -b com.registrodeobras.app') ~= 0 then
    mostrar(LOC "$$$/GalerisStudio/NoAbrio=The photo and its details are ready, but Galeris Studio could not be opened. Open it by hand and they will load by themselves.")
  end
end

LrTasks.startAsyncTask(function()
  local ok, problema = LrTasks.pcall(mandarFoto)
  if not ok then
    mostrar(LOC("$$$/GalerisStudio/ErrorGeneral=The photo could not be sent to Galeris Studio: ^1", tostring(problema)))
  end
end)

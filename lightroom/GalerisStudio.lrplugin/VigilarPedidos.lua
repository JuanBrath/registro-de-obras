-- Tarea en segundo plano: mientras Lightroom Classic esta abierto, revisa cada tanto si Galeris
-- Studio dejo un pedido de abrir una foto (boton "Abrir en Lightroom" de una obra) y, si la encuentra
-- en el catalogo actual, pasa a la Biblioteca, cambia a la carpeta de esa foto (si no, la seleccion
-- no se ve aunque se haya hecho) y la selecciona. Si no la encuentra (se movio de carpeta, o es de
-- otro catalogo), avisa con un cartel en vez de quedarse sin hacer nada.
--
-- Arranca solo: Info.lua lo registra como LrInitPlugin (mas LrForceInitPlugin, ya que el complemento
-- aporta un item de menu), asi que Lightroom lo ejecuta al cargar el complemento — al abrir Lightroom,
-- o al tocar "Recargar complemento" en el Administrador de complementos.

local LrApplication = import 'LrApplication'
local LrApplicationView = import 'LrApplicationView'
local LrDialogs = import 'LrDialogs'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local LrTasks = import 'LrTasks'

local function mostrar(mensaje)
  LrDialogs.message(LOC "$$$/GalerisStudio/Titulo=Galeris Studio", mensaje, 'info')
end

local function revisarPedido(carpeta)
  local rutaPedido = LrPathUtils.child(carpeta, 'pedido.txt')
  if not LrFileUtils.exists(rutaPedido) then return end

  -- Se borra apenas se lee, para no volver a procesar el mismo pedido si algo mas abajo falla.
  local ruta = LrFileUtils.readFile(rutaPedido)
  LrFileUtils.delete(rutaPedido)
  if not ruta then return end
  ruta = ruta:gsub('^%s+', ''):gsub('%s+$', '')
  if ruta == '' then return end

  local catalogo = LrApplication.activeCatalog()
  local foto = catalogo:findPhotoByPath(ruta)
  if not foto then
    mostrar(LOC("$$$/GalerisStudio/FotoNoEncontrada=No se encontró esa foto en el catálogo actual de Lightroom. Puede que se haya movido de carpeta, o que pertenezca a otro catálogo.\n\n^1", ruta))
    return
  end

  -- No alcanza con seleccionarla: Lightroom solo muestra la seleccion si la foto es parte de lo que
  -- ya esta mostrando la grilla (carpeta, coleccion o filtro actual). Por eso primero se cambia la
  -- fuente a la carpeta de la foto, asi queda visible sin importar que se estuviera mirando antes.
  LrApplicationView.switchToModule('library')
  catalogo:setActiveSources(foto:getRawMetadata('folder'))
  catalogo:setSelectedPhotos(foto, {})
end

LrTasks.startAsyncTask(function()
  -- Misma base que lightroom-entrada (ver CargarObra.lua), pero una carpeta hermana aparte para no
  -- mezclarse con los envios de Lightroom hacia Studio (esta va en la direccion opuesta).
  local casa = LrPathUtils.getStandardFilePath('home')
  local carpeta = LrPathUtils.child(
    LrPathUtils.child(LrPathUtils.child(LrPathUtils.child(casa, 'Library'), 'Application Support'), 'com.registrodeobras.app'),
    'lightroom-pedido'
  )
  while true do
    LrTasks.pcall(revisarPedido, carpeta)
    LrTasks.sleep(1.5)
  end
end)

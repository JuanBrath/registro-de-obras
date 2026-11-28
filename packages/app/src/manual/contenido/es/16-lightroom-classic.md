# Lightroom Classic

Cómo cargar una obra en Recer Studio partiendo de una foto de Lightroom Classic, y cómo quitar la conexión.

## Cómo funciona

Recer Studio funciona solo, sin Lightroom. Si usás Lightroom Classic, podés instalar un complemento opcional que agrega un menú para mandar la foto elegida: Recer Studio se abre en **Nueva obra** con la imagen y los datos de la foto ya cargados. Después elegís si es una obra única o seriada, completás lo demás y guardás.

## Instalar el complemento

1. En Recer Studio, tocá el engranaje ⚙ (**Configuración**) y buscá el grupo **Lightroom Classic**.
2. Tocá **Instalar complemento**. Aparece el aviso "Listo. Cerrá y volvé a abrir Lightroom Classic para que aparezca el menú."
3. Cerrá Lightroom Classic y volvé a abrirlo.
4. Si el menú no aparece: en Lightroom, **Archivo › Administrador de plug-ins…**, tocá **Agregar** y elegí la carpeta `RecerStudio.lrplugin` que está en `~/Library/Application Support/Adobe/Lightroom/Modules/`.

## Cargar una obra desde Lightroom

1. En Lightroom Classic, elegí la foto (por ejemplo, en el módulo Biblioteca).
2. Abrí el menú **Biblioteca › Extras de plug-in › Cargar obra en Recer Studio…** (en inglés, *Plug-in Extras*). También está en **Archivo › Extras de plug-in**.
3. Lightroom prepara una copia de la foto en JPG y abre Recer Studio.
4. Recer Studio abre **Nueva obra** con los datos cargados. Revisalos, elegí en **Es seriada** si es **Obra única** u **Obra seriada**, y tocá **Guardar obra**. Ver [Cargar una obra nueva](cap:nueva-obra).

- Se manda la foto activa (la que se ve grande), aunque haya varias elegidas.
- Lightroom no se modifica: no cambia la foto ni el catálogo.
- Si Recer Studio ya estaba abierto, alcanza con que vuelva a primer plano: abre **Nueva obra** solo. Si tenías abierta una pantalla de obra (un formulario o una ficha en edición), pregunta antes de descartarla.
- Si todavía no abriste tu registro (estás en la pantalla de presentación), la obra espera: cuando entres a **Recer Studio** se abre **Nueva obra**. Hace falta tener completo **Mis datos**. Ver [Mi perfil](cap:mi-perfil).

## Qué datos se cargan

- **Imagen de la obra**: una copia de la foto en JPG, de hasta 2400 píxeles de lado, con los ajustes de Lightroom.
- **Título**: el título de la foto en Lightroom.
- **Año / Período**: el año de la fecha de captura.
- **Categoría**: **Fotografía de Autor y Procesos Alternativos**, con el subtipo digital Fine Art (lo podés cambiar).
- **Fecha de captura**, **Software de edición** (Adobe Lightroom Classic) y los **Datos de captura**: cámara, ISO, velocidad de obturación, diafragma y distancia focal.
- **Ubicación del archivo original**: la ruta del archivo de Lightroom (no se copia el archivo).
- **Etiquetas**: las palabras clave de la foto.
- **Calificación**: las estrellas de la foto.

Lo que Lightroom no tenga cargado queda vacío. Conviene completar el título y las palabras clave en Lightroom (módulo Biblioteca, panel Metadatos).

## Abrir una foto en Lightroom desde Recer Studio

También funciona al revés: si una obra tiene cargada su **Ubicación del archivo original** (solo registro personal, fotografía digital), al lado del campo, en el formulario de edición, aparece el botón **LrC** (**Abrir en Lightroom Classic**). En la ficha de la obra (sin entrar a editar) está el mismo botón **LrC** al lado de **Editar obra**, y también se puede pedir con **Abrir en Lightroom** desde el menú del click derecho sobre la imagen — ver [Ficha de la obra](cap:ficha-de-obra). Además, en **Obras** podés habilitar un acceso **LrC** sobre las fotos (ver [Obras](cap:obras)). Todas estas formas hacen lo mismo: Lightroom pasa a primer plano (se abre solo si no estaba abierto) y, si el complemento está instalado, busca esa foto en el catálogo que tengas abierto y la selecciona en la Biblioteca.

- Si Lightroom no la encuentra (se movió de carpeta, o pertenece a otro catálogo), el aviso aparece como un cartel dentro de Lightroom.
- Si acabás de abrir Lightroom, puede tardar unos segundos en revisar el pedido: esperá un momento antes de probar de nuevo.
- Necesita el complemento instalado y actualizado (ver más abajo); si lo instalaste o actualizaste recién, cerrá y volvé a abrir Lightroom Classic una vez para que empiece a funcionar.

> Al lado del botón **LrC** de la ficha de la obra también puede aparecer el botón **Ps** (**Abrir en Photoshop**), que no tiene relación con Lightroom: abre el archivo original en Adobe Photoshop. Está disponible para cualquier categoría de obra, no solo fotografía — ver [Ficha de la obra](cap:ficha-de-obra).

## Si no se carga nada

- Revisá que el complemento esté al día: en Recer Studio, engranaje ⚙ › **Lightroom Classic**. Si dice que hay una versión nueva, tocá **Actualizar complemento** y reiniciá Lightroom Classic.
- Si Recer Studio se abre pero no aparece **Nueva obra**, revisá que ya tengas completo **Mis datos**: sin eso no se puede seguir.
- Si algo salió mal, cerrá Recer Studio y volvé a mandar la foto desde Lightroom.

## Quitar la conexión

1. En Recer Studio, tocá el engranaje ⚙ y, en **Lightroom Classic**, tocá **Quitar complemento**.
2. Reiniciá Lightroom Classic para que desaparezca el menú.

Recer Studio sigue funcionando igual, como siempre: las obras se cargan a mano desde **Obras › Nueva obra**. Ver [Obras](cap:obras).

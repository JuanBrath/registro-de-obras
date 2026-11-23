# Ficha de la obra

Todo lo que ves y podés hacer al abrir una obra: verla, editarla, sacar informes y eliminarla.

## Abrir una obra

En **Obras**, tocá la tarjeta de la obra. Arriba está el título; para volver usá la **✕** o el botón de abajo, que vuelve al lugar de donde abriste la obra: **Volver a obras** desde el listado, o **Volver a la selección** si la abriste desde una selección. Desde la vista [Imágenes](cap:galeria-de-obras) también podés abrirla con **Ver esta obra** o con clic derecho → **Abrir ficha**.

## Qué muestra la ficha

- La imagen de la obra. Si la tocás, se abre en grande. Con click derecho (en la miniatura o en la vista en grande) aparece un menú con **Exportar imagen…**, **Abrir en Photoshop** y **Abrir en Lightroom**; ver más abajo.
- El código de inventario, el artista, la categoría y el subtipo.
- Si es una obra única o seriada (y cuántas ediciones tiene).
- Los datos principales de la obra: técnica, soporte, dimensiones, peso…
- El **Statement** y las **Notas**: se muestra la primera línea; tocando el nombre del campo ves el texto completo.
- Más abajo, la lista de **Ejemplares**: las copias de la obra. Ver [Copias y estados](cap:copias).

Debajo de los datos hay cuatro botones: **Editar obra**, **Generar informe**, **Agregar a selección…** (para sumar la obra a una selección; ver [Selecciones y dossier](cap:selecciones-y-dossier)) y **Eliminar obra**. Si hay un archivo original cargado, al lado aparece también el botón **Ps** (**Abrir en Photoshop**) y, si además es una foto digital propia, el botón **Lr** (**Abrir en Lightroom Classic** — ver [Lightroom Classic](cap:lightroom-classic)).

## El menú del click derecho sobre la imagen

Con click derecho sobre la imagen (la miniatura o la vista en grande) aparece un menú con tres opciones.

### Exportar imagen…

- Si la obra no tiene cargada la **Ubicación del archivo original**, aparece el aviso "No se puede exportar: esta obra no tiene cargado el archivo original (ver "Ubicación del archivo original" en Editar obra)." y no se abre nada.
- Si lo tiene, se abre una ventana donde elegís:
  - **Formato**: **JPG**, **TIFF** u **Original (copia exacta del archivo, sin cambios)**.
  - Para JPG o TIFF, además: la **Profundidad de color** (solo en TIFF: **8 bits** o **16 bits por canal**; el JPG siempre es de 8 bits) y la casilla **Cambiar el tamaño**. Si no la tildás, la imagen sale con su **tamaño original**. Si la tildás, elegís el **Lado de referencia** (**Lado corto** o **Lado largo**), la **Unidad de medida** (**Píxeles** o **Centímetros**) y la **Medida** de ese lado; en centímetros también la **Resolución (ppp)**, que sirve para pasar los centímetros a píxeles (por ejemplo, 30 cm a 300 ppp son 3543 píxeles) y queda anotada en el archivo. No se va a ampliar: si el archivo original es más chico que esta medida, se exporta en su tamaño real. El archivo exportado lleva **incrustado el perfil de color del original** y los colores no se modifican; si el original no tiene perfil (o es en escala de grises o CMYK), sale convertido a sRGB con ese perfil incrustado.
  - Un **Copyright (opcional)**, que sale sugerido como "© [nombre del artista] [año actual]"; se puede borrar o cambiar, y queda guardado como metadato dentro del archivo exportado.
- Tocá **Exportar…**: primero preguntá dónde guardar el archivo nuevo (carpeta y nombre) y recién ahí lo genera.

> Con **Original** se exporta el archivo tal cual está, sea el formato que sea. Con JPG o TIFF, el programa necesita poder leer el archivo original: por ahora funciona con PSD, PSB, TIFF, JPG y RAW de cámara (CR2, NEF, ARW, ORF, DNG).

### Rehacer las imágenes desde el archivo original

Con el botón **Rehacer imágenes** (junto a **Eliminar obra**) o con el click derecho sobre la imagen, Recer vuelve a generar la imagen de la ficha y la miniatura a partir del archivo original. Usalo después de editarlo en Lightroom o Photoshop.

### Abrir en Photoshop

Abre el archivo original en Adobe Photoshop (la copia más nueva, si hay varias versiones instaladas en el equipo).

- Si la obra no tiene cargada la **Ubicación del archivo original**, aparece el aviso "No se puede abrir en Photoshop: esta obra no tiene cargado el archivo original (ver "Ubicación del archivo original" en Editar obra)." y no pasa nada más.
- Si no hay ninguna copia de Photoshop instalada en el equipo, aparece "No se pudo abrir el archivo en Photoshop. Puede que no lo tengas instalado en este equipo."

Es lo mismo que hace el botón **Ps** de más arriba: están las dos formas, podés usar la que te quede más a mano.

### Abrir en Lightroom

Es lo mismo que el botón **Lr** (ver más arriba y [Lightroom Classic](cap:lightroom-classic)), disponible también desde este menú.

- Si la obra no tiene cargada la **Ubicación del archivo original**, aparece el aviso "No se puede abrir en Lightroom: esta obra no tiene cargado el archivo original (ver "Ubicación del archivo original" en Editar obra)." y no pasa nada más.

## Editar la obra

1. Tocá **Editar obra**. La ficha se convierte en un formulario igual al de carga, con los datos actuales. Ver [Cargar una obra nueva](cap:nueva-obra).
2. Cambiá lo que necesites.
3. Tocá **Guardar cambios**.

Cosas que conviene saber al editar:

- **Imagen**: podés cambiarla o sacarla con **Quitar imagen**. Antes de guardar podés arrepentirte con **Deshacer** ("La imagen se eliminará al guardar los cambios").
- **Convertir una obra única en seriada, o al revés**: solo se puede si las copias no tienen historial propio. Si alguna ya tiene un estado (vendida, reservada, en exhibición…) o datos cargados, el programa no lo permite y te dice cuáles son. Lo mismo vale para una obra **sin serie** (venta sin límite): al editarla podés pasarla a **Obra única** o a **Obra seriada** con el mismo criterio, es decir, solo si como mucho una de sus copias tiene historial propio (por ejemplo, una sola venta hecha); esa copia se conserva y las demás, en blanco, se eliminan. Una obra única o una seriada se pueden pasar a **Sin serie**; en la seriada se aplica el mismo criterio (como mucho una copia con historial), se conserva una sola copia numerada 1 y las pruebas de autor se mantienen.
- **Bajar la cantidad de ediciones o de pruebas de autor**: el programa elimina las de número más alto. Solo lo permite si esas copias no tienen historial propio, y antes de guardar te avisa exactamente cuáles se van a eliminar ("Esta acción no se puede deshacer").
- **Agregar pruebas de autor**: en obras únicas, seriadas y sin serie, el campo de pruebas de autor también permite subir la cantidad (incluso si habías eliminado todas); las nuevas se crean en blanco.
- **Cambiar la categoría**: los datos específicos de la categoría anterior se reemplazan por los de la nueva.
- Si salís con cambios sin guardar, el programa pregunta **¿Salir igual y abandonarlos?**, con las opciones **Sí, salir sin guardar** y **Seguir editando**.

## Generar informes de la obra

Tocá **Generar informe**. Elegís qué informe sacar:

- **Ficha de la obra**: todos los datos de la obra. Si es seriada podés incluir **Todas las series** o **Elegir series específicas** (tildando cuáles).
- **Series no disponibles (detalle)**: el detalle de las copias que no están disponibles (vendidas, reservadas, en exhibición…).
- **Series disponibles (detalle)**: el detalle de las copias disponibles.
- **Detalle de la primera serie disponible**: solo la primera copia libre.
- **Informe para terceros**: pensado para compartir: no incluye el software de edición, los datos técnicos del archivo ni las etiquetas.

Además elegís el idioma, si lleva logo, la fecha en el membrete, si se incluyen las **Notas** y el **Statement** (cuando la obra los tiene) y la firma. Ver [Informes y documentos en PDF](cap:informes).

## Eliminar una obra

1. Tocá **Eliminar obra**.
2. Aparece "¿Eliminar esta obra? No se puede deshacer." Confirmá con **Sí, eliminar** o cancelá.

Si la obra tiene ventas registradas, no se puede eliminar, para no perder ese historial. Primero habría que resolver esas ventas (por ejemplo, anulándolas).

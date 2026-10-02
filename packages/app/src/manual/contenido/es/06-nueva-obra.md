# Cargar una obra nueva

Paso a paso del formulario **Nueva obra**: imagen, datos generales, categoría, series y copias.

## Abrir el formulario

En **Obras**, tocá **Nueva obra**. Para salir sin guardar, tocá la **✕** o **Cancelar y volver**.

## Paso 1: la imagen

1. En **Imagen de la obra** tocá **Elegir imagen…** y elegí un archivo.
2. Formatos aceptados: **JPG, PNG, GIF, WEBP, PSD, PSB y TIFF**.
3. Un JPG, PNG, GIF o WEBP se usa tal cual (si es muy grande, el programa lo reduce solo hasta un máximo de 2400 píxeles en el lado más largo, que alcanza para verlo con calidad a pantalla completa). No hace falta subir el original en máxima resolución.

Si elegís un **PSD, PSB o TIFF**, el programa genera solo un JPG con la imagen real del archivo, de hasta 2400 píxeles en el lado más largo y con los colores pasados a sRGB, para que se vea bien a pantalla completa. Lo guarda en tu registro; el archivo original no se toca ni se copia. Es rápido incluso con archivos de varios gigas. Aparece un aviso con las medidas del JPG generado.

> Un PSD o PSB tiene que tener la imagen compuesta, que Photoshop guarda con la opción **Maximizar compatibilidad**. Si el programa no puede generarla, usa la vista previa chica que trae el archivo adentro y te avisa que puede verse distinta de la obra final; si tampoco la tiene, activá **Vistas previas de imagen** en las preferencias de Photoshop y guardalo de nuevo, o elegí un JPG.

## Paso 2: los datos generales

- **Título**: obligatorio.
- **Subtítulo**: títulos alternativos, si los tiene.
- **Código de inventario / SKU**: un identificador propio de la obra, útil para ordenar y buscar.
- **Año / Período**: el año exacto o un rango, por ejemplo 2024-2025.
- **Notas**: texto libre.

En Galeris Studio la obra queda a tu nombre: arriba del formulario ves "Artista: tu nombre", con un botón **Editar mis datos** que lleva a tu perfil.

## Paso 3: la categoría

Elegí la **Categoría**. Al elegirla aparecen los campos propios de esa categoría:

- **Fotografía de Autor y Procesos Alternativos**
- **Pintura y Técnicas Mixtas**
- **Obra Gráfica Original (Estampa y Grabado)**
- **Escultura y Arte Tridimensional**
- **Dibujo y Obra sobre Papel**
- **Arte Textil y Cerámica de Autor**
- **Nuevos Medios, Videoarte e Instalaciones**

Cada categoría tiene sus **subtipos** (por ejemplo, en Fotografía: analógica clásica, digital Fine Art, procesos históricos del siglo XIX, fotolibros y porfolios, sintografía) y una **ficha rigurosa** con datos técnicos específicos. Todos son opcionales salvo los que el programa marca como obligatorios. Los cartelitos ⓘ explican cada uno.

### Si la obra es una fotografía

- Elegí el **Subtipo**. Según cuál sea, cambian los campos que siguen.
- **Fecha de captura** (en la sintografía se llama **Fecha de creación**), **Año de edición**, **Serie o proyecto** y **Técnica**.
- **Datos de captura**: cámara, ISO, velocidad de obturación, diafragma y distancia focal. No aparecen en la sintografía (que no tiene esos datos).
- **Ubicación del archivo original**: en las fotografías digitales elegí el archivo con el que se imprime la obra. Si el archivo es **JPEG, TIFF, HEIC, PSD/PSB o RAW de cámara (CR2, NEF, ARW, ORF, DNG)**, el programa completa solo la fecha de captura, el software de edición, los datos de la cámara y las **palabras clave** (que pasan a ser etiquetas). En una obra nueva toma además la **calificación en estrellas** que el archivo ya tenga (por ejemplo, puesta desde Lightroom o Bridge). Con otros formatos RAW (como CR3 o RAF) esos datos todavía no se leen solos, pero se pueden completar a mano. Después de eso, los datos viven en Galeris: cambiarlos acá no modifica el archivo, ni al revés. En los otros subtipos, este campo es un texto libre llamado **Ubicación del negativo**.
- **Sintografía** (arte generado íntegramente por inteligencia artificial): no lleva datos de cámara. Los certificados de estas obras llevan al pie la leyenda **SIN COPYRIGHT**, en lugar del copyright del artista. Ver [Certificado de autenticidad](cap:certificado).
- En Galeris Studio ves además el campo **Software de edición**.

## Paso 4: etiquetas

En **Etiquetas** elegí una existente o escribí una nueva. Las etiquetas son propias de Galeris: sirven para clasificar y buscar dentro del programa, pero no se graban en el archivo original.

## Paso 5: obra única o seriada

1. En **Es seriada** elegí **Obra única** o **Obra seriada**. (En Obra Gráfica esto se decide solo según el subtipo: por ejemplo, el monotipo es único y las demás técnicas son seriadas.)
2. Si es seriada, completá la **Cantidad total de ediciones**. El programa crea automáticamente las copias numeradas 1/N, 2/N… N/N.
3. Solo si es seriada aparece el tamaño de referencia de la edición: en Fotografía, primero **Escala por tamaños** (si la edición se divide en distintos tamaños, se deja constancia acá; si elegís **No**, completá el **Tamaño de la imagen (mm)**); en las demás categorías, directamente **Dimensiones**. Para una obra única no hace falta: alcanza con el tamaño de su única copia, que se completa en el paso siguiente.
4. Tildá **¿Hay prueba de autor?** si corresponde y poné la **Cantidad de pruebas de autor**. Las pruebas de autor (PA) van fuera de la numeración comercial. La regla habitual es el 10 % de la edición, redondeado hacia arriba: para 7 obras corresponde 1 PA y para 25 obras, 3 PA. Si ponés más que eso, el programa muestra una advertencia. Por convención las PA no se venden. Ver [Copias y estados](cap:copias).

Una obra única es, por dentro, una serie de una sola copia.

## Paso 6: los datos de cada copia (opcional)

Al elegir única o seriada aparece una fila por cada copia y por cada prueba de autor, con la nota "Completá los datos que ya tengas de cada copia — podés dejarlos en blanco y completarlos después". Se completan igual que cuando se edita una copia. Ver [Copias y estados](cap:copias).

## Otra forma: cargar la obra desde Lightroom Classic

Si usás Lightroom Classic, podés mandar la foto directamente y que este formulario se abra con la imagen y los datos ya cargados. Es opcional. Ver [Lightroom Classic](cap:lightroom-classic).

## Paso 7: guardar

Tocá **Guardar obra**. Si falta algo obligatorio, el programa te dice qué: elegir la categoría, elegir si la obra es única o seriada, o escribir el título.

Al guardar ves el mensaje "«Título» se guardó correctamente" (y cuántas ediciones se generaron) con tres botones:

- **Cargar otra obra**: vuelve a un formulario vacío.
- **Ver esta obra**: abre su ficha.
- **Volver a obras**: vuelve al listado.

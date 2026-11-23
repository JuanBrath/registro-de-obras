// Contenido del PDF de novedades de la versión 1.0.0 (23 de noviembre de 2026).
// Es la base de los próximos PDF de novedades: ver README.md.
export default {
  version: "1.0.0",
  fecha: "23 de noviembre de 2026",
  secciones: [
    {
      titulo: "Obras sin serie (venta sin límite)",
      items: [
        "Nueva tercera modalidad junto a Única y Seriada: la obra se vende sin límite y siempre hay una copia lista para vender; al venderla, el programa crea la siguiente con los datos de impresión, enmarcado y precio de la anterior.",
        "Las copias se numeran 1, 2, 3... sin total (nunca 1/10).",
        "Descartada, Destruida o Colección del autor se comportan igual que una venta: la copia sale y se genera la siguiente.",
        "Se pueden tener varias copias activas a la vez (disponibles, en stock, en exhibición...) con el botón + Agregar otra copia, y eliminar las copias que no tengan venta.",
        "Si se anula una venta y ya existe la copia nueva en blanco, el programa pregunta si se quiere anular esa copia; nunca lo hace solo.",
        "Al editar la obra se puede pasar de sin serie a única o seriada, de única a sin serie y de seriada directamente a sin serie, siempre con el mismo criterio: como mucho una copia con historial propio.",
        "Las pruebas de autor se pueden agregar y editar también en obras sin serie (PA 1, PA 2...) y volver a generar en obras únicas y seriadas aunque se hayan eliminado todas.",
      ],
    },
    {
      titulo: "Selecciones y grupos",
      items: [
        "Una selección es un grupo de obras elegidas a mano (para una feria, una galería, una página web...). Se crean desde Selecciones o desde Obras con el botón Seleccionar; una obra puede estar en varias selecciones.",
        "Arriba hay dos botones, Grupos y Selecciones, y cada uno muestra solo lo suyo. La lista de selecciones se pliega a dos renglones con Mostrar más, y la elegida queda siempre a la vista.",
        "Los grupos reúnen las selecciones de una misma temática: se crean con + Nuevo grupo, se abren para ver sus selecciones y con Agregar selecciones al grupo se eligen las que lo componen. Cada selección también tiene un desplegable Grupo junto al nombre.",
        "Las obras de una selección se ven como Columnas, Tarjetas o Imágenes, con control de tamaño; se pueden ordenar arrastrando o con flechas y quitar con el modo Ordenar y quitar. Las notas tienen Ver completo.",
        "Desde una selección se pueden generar informes limitados a sus obras, exportar todas sus fotos (con el mismo criterio que la ficha, sin pisar archivos) y generar dossiers.",
        "Solo el título queda fijo arriba; el resto de la pantalla se desplaza.",
      ],
    },
    {
      titulo: "Dossier en PDF",
      items: [
        "Se genera a partir de una selección: portada (con el nombre de la selección y un texto adicional a elección), biografía y texto del artista editables, y las obras con su ficha.",
        "Idioma español, inglés o ambos; tamaño A4 u Oficio; orientación vertical u horizontal; cantidad de obras por página, con excepciones en páginas puntuales.",
        "En obras seriadas o sin serie, los datos de la ficha salen de la primera copia que se puede ofrecer (disponible, en stock, en exhibición, consignación o en producción). Recer Studio no incluye el nombre del artista en los epígrafes; Recer Space sí.",
        "Los dossiers quedan guardados y numerados por selección, con un botón para volver a verlos; al eliminar una selección el programa avisa que también se borran sus dossiers.",
      ],
    },
    {
      titulo: "Obras: vista Imágenes",
      items: [
        "Junto a Columnas y Tarjetas hay un tercer modo, Imágenes, que reemplaza a la antigua Galería de obras (que dejó de ser una pantalla aparte). También existe en Selecciones.",
        "Un clic en la foto la amplía; la ficha se abre desde el visor con Ver esta obra o con clic derecho, Abrir ficha. En Columnas y Tarjetas el clic sigue abriendo la ficha.",
        "El visor tiene flechas, contador, calificación, información de la obra y de su primera copia disponible, y permite registrar una venta o reserva.",
        "Debajo de cada foto se ve el nombre de la obra y su calificación como un número y una estrella; un clic despliega las cinco estrellas y un segundo clic elige cuántas.",
        "Clic derecho sobre cualquier imagen: Abrir ficha, Exportar imagen..., Abrir en Photoshop y Abrir en Lightroom. El selector de vista y el tamaño de las miniaturas están juntos, a la derecha.",
      ],
    },
    {
      titulo: "Ayuda y manual",
      items: [
        "El botón ? (en rojo) de cada sección despliega dos opciones: Recorrido visual o Buscar en el manual.",
        "El recorrido señala cada botón con una explicación breve, sin desplazar la pantalla de fondo; incluye la vista Imágenes y su tarjeta no se sale de la ventana.",
        "El manual se abre sobre la pantalla actual, que queda tal cual estaba al cerrarlo. Está en español e inglés, con capítulos nuevos y actualizados (obras sin serie, selecciones y grupos, vista Imágenes, dossier).",
        "La primera vez que se abre el programa aparece la pantalla ¿Por qué Recer?, que explica el significado de RECER y su lema; también está en el manual.",
      ],
    },
    {
      titulo: "Aspecto y detalles",
      items: [
        "Azules más oscuros y neutros en toda la aplicación (botones, foco, controles).",
        "Las ventanas se ajustan al contenido; en Mi perfil y en el perfil de galería los datos se distribuyen en columnas para aprovechar el ancho.",
        "En Selecciones, los botones, campos y etiquetas usan el mismo tamaño de letra que Obras.",
        "Nueva obra: las opciones Única, Seriada y Sin serie se muestran sin recuadro ni título. Al agregar una obra a una selección, la ventana arranca en + Nueva selección.",
      ],
    },
  ],
};

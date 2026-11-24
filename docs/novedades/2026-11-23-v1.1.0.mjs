// Contenido del PDF de novedades de la versión 1.1.0 (23 de noviembre de 2026).
// Solo lo que cambió desde la 1.0.0: ver README.md.
export default {
  version: "1.1.0",
  fecha: "23 de noviembre de 2026",
  secciones: [
    {
      titulo: "Certificado: hoja doble",
      items: [
        "Nueva opción Páginas en la pantalla del certificado: Hoja simple u Hoja doble. La hoja doble es una hoja apaisada (A4 o Carta) con dos páginas lado a lado: a la derecha va el certificado del modelo elegido (Clásico, Simple o Ficha) y a la izquierda, a elección, la foto de la obra o un texto.",
        "Con la foto a la izquierda se puede girar un cuarto de vuelta a la izquierda, para que una foto apaisada llene esa mitad; la foto ya no se repite dentro del certificado.",
        "Con texto a la izquierda, se escribe lo que se quiera (un statement, un poema, un texto de sala); se centra y se achica solo si es largo.",
        "Arriba de la vista previa, tres botones permiten ver la hoja izquierda, ambas hojas o la hoja derecha. El PDF que se guarda siempre lleva las dos.",
        "La hoja doble solo existe en A4 y Carta: en A5 la opción queda desactivada. Funciona con los idiomas de títulos y con las guías de corte.",
      ],
    },
    {
      titulo: "Exportar imagen",
      items: [
        "El tamaño es opcional: si no se tilda, se exporta con las medidas del original.",
        "El tamaño se puede dar en píxeles o en centímetros (con la resolución en ppp), y los TIFF admiten profundidad de color de 8 o 16 bits.",
        "Todas las opciones están siempre a la vista (se desactivan las que no aplican) y la resolución queda en la misma fila que la medida.",
        "Se incrusta el perfil de color del original (JPG y TIFF) sin modificar los colores.",
      ],
    },
    {
      titulo: "Rehacer imágenes",
      items: [
        "Desde la ficha de la obra, un botón con texto visible vuelve a generar las imágenes a partir del archivo original.",
        "En Obras, Actualizar imágenes rehace solo las que se modificaron.",
      ],
    },
    {
      titulo: "Obras sin serie y copias",
      items: [
        "Al pasar una obra de seriada a sin serie se pueden cambiar las pruebas de autor en el mismo guardado.",
        "En obras sin serie solo se eliminan copias disponibles (con aviso si no se puede) y las restantes se renumeran sin huecos.",
        "El aviso de eliminar una copia se muestra en la propia copia, no arriba de la pantalla, y el texto del estado se corrigió.",
      ],
    },
  ],
};

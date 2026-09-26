# Manual del usuario: cómo se mantiene

El manual que se ve en el programa (botón **Manual del usuario**) sale de los archivos de la carpeta `contenido/`:
una subcarpeta por idioma (`es/` y `en/`), y en cada una un archivo por capítulo, en Markdown simple. El número del
nombre (`01-`, `02-`…) define el orden; lo que sigue es el identificador del capítulo, con el que otros capítulos lo
enlazan (`[texto](cap:primeros-pasos)`). El programa muestra el manual en el idioma que esté elegido en **Configuración**.

## Formato

- `# Título` (una vez, al principio) y, debajo, **una línea de resumen**.
- `## Sección`: cada sección es una entrada del buscador y aparece en el "En este capítulo".
- `### Subtítulo` dentro de una sección.
- Párrafos, listas con `- ` y pasos numerados con `1. ` (con `- ` sangrado para subpuntos).
- `> ` para una nota destacada.
- `**negrita**` para los nombres de botones y campos, tal cual aparecen en el programa (en el manual en inglés, tal
  cual aparecen en la interfaz en inglés: `src/i18n/en.ts`).
- `` `código` `` para nombres de archivo, y `[texto](cap:id)` para enlazar a otro capítulo (el id es el mismo en los
  dos idiomas, aunque el título esté traducido).

## Regla de mantenimiento

Cuando se cambia una pantalla, un botón o un texto del programa, hay que actualizar el capítulo correspondiente **en
los dos idiomas**: el manual usa los nombres exactos de los botones y campos. Las pruebas de `packages/core`
(`business/__tests__/manual.test.ts`) revisan que todos los capítulos tengan título, resumen y secciones, que ningún
enlace entre capítulos esté roto, y que el manual en español y el de inglés tengan los mismos archivos, las mismas
secciones, los mismos pasos, notas y enlaces (si se agrega algo a uno y no al otro, la prueba falla).

## Idiomas

Español (`es/`) e inglés (`en/`). El PDF (botón **Generar PDF**) sale en el idioma del programa; el buscador también
usa las palabras de relleno y las terminaciones propias de cada idioma (`terminosDeBusqueda` en
`packages/core/src/business/manual.ts`).

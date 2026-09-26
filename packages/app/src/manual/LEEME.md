# Manual del usuario: cómo se mantiene

El manual que se ve en el programa (botón **Manual del usuario**) sale de los archivos de la carpeta `contenido/`:
un archivo por capítulo, en Markdown simple. El número del nombre (`01-`, `02-`…) define el orden; lo que sigue es el
identificador del capítulo, con el que otros capítulos lo enlazan (`[texto](cap:primeros-pasos)`).

## Formato

- `# Título` (una vez, al principio) y, debajo, **una línea de resumen**.
- `## Sección`: cada sección es una entrada del buscador y aparece en el "En este capítulo".
- `### Subtítulo` dentro de una sección.
- Párrafos, listas con `- ` y pasos numerados con `1. ` (con `- ` sangrado para subpuntos).
- `> ` para una nota destacada.
- `**negrita**` para los nombres de botones y campos, tal cual aparecen en el programa.
- `` `código` `` para nombres de archivo, y `[texto](cap:id)` para enlazar a otro capítulo.

## Regla de mantenimiento

Cuando se cambia una pantalla, un botón o un texto del programa, hay que actualizar el capítulo correspondiente:
el manual usa los nombres exactos de los botones y campos. Las pruebas de `packages/core`
(`business/__tests__/manual.test.ts`) revisan que todos los capítulos tengan título, resumen y secciones, y que
ningún enlace entre capítulos esté roto.

## Idioma

Por ahora el manual está solo en español.

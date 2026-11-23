# PDF de novedades de cada versión

`2026-11-23.mjs` es el contenido de la versión **0.1.0** y es la **base** de los próximos PDF de novedades.

Para generar el de una versión nueva:

1. Copiar el último archivo de contenido (por ejemplo `2026-11-23.mjs`) con la fecha nueva como nombre.
2. Ajustar `version` y `fecha`, y agregar o modificar secciones con lo que cambió desde la versión anterior.
   El PDF está pensado para entregar con la versión, así que no menciona GitHub ni detalles internos.
3. `node docs/novedades/generar.mjs docs/novedades/<archivo>.mjs` genera el PDF junto al archivo.

# Certificado de autenticidad

Cómo armar el certificado de autenticidad (COA) de una copia, con vista previa, y cómo corregir datos desde ahí.

## Qué es y cuándo se puede preparar

El certificado acompaña a cada copia que sale de tu taller: para una venta, una reserva, una donación, o por cualquier otro motivo (por ejemplo, para dejarla en consignación en una galería). No hace falta tener registrada una venta para prepararlo. Toma la mayoría de los datos de lo que ya cargaste: no tenés que volver a escribirlos. Si la copia tiene una venta, reserva o donación registrada, el **Lugar** y la **Fecha** salen de ahí; si no tiene ninguna, esos dos campos quedan vacíos para completarlos a mano (ver **Emisión**, más abajo).

## Abrir la pantalla del certificado

1. Abrí la obra y buscá la copia. Ver [Copias y estados](cap:copias).
2. Tocá el botón **Certificado** (está al lado de **Informes**). Solo no aparece si la copia está **Destruida** o **Descartada** y nunca tuvo una venta, reserva o donación.
3. Se abre una pantalla grande: a la izquierda los datos y a la derecha la vista previa del certificado, que se actualiza sola cada vez que cambiás algo.

### Si ya generaste un certificado de esa copia

Si en lo que va de esta sesión ya guardaste un PDF del certificado de esa copia, al tocar **Certificado** de nuevo el programa pregunta qué querés hacer, en vez de abrir la pantalla directamente:

- **Ver el certificado guardado**: abre el PDF que ya guardaste, con el lector de PDF del sistema. Si el archivo se movió o se borró, avisa y a partir de ahí **Certificado** vuelve a abrir la pantalla directamente.
- **Rehacer el certificado**: abre la pantalla del certificado de nuevo, con los datos actuales del registro (por ejemplo, si editaste la obra o la copia después de generar el primero).

Esto solo pasa dentro de la misma sesión: si cerrás y volvés a abrir Recer Studio, **Certificado** abre la pantalla directamente, sin preguntar.

## Elegir cómo se ve

En la sección **Formato**:

- **Modelo**:
  - **Clásico**: con marco y foto grande.
  - **Simple**: sin marco, con el texto centrado.
  - **Ficha**: una grilla con los datos, con línea de firma del artista y de la galería (solo en Recer Space).
  - **Ficha sin firma de galería**: la misma grilla, solo con la firma del artista.
- **Tamaño de hoja**: **A4**, **Carta** o **A5**. El diseño se arma para esa medida, no se achica al imprimir.
- **Idioma de los títulos**: **Español**, **English** o **Ambos**. Solo cambia los títulos de cada campo; los datos salen como están cargados.
- **Guías de corte**: **Ninguna**, **Esquinas** (marcas de corte) o **Recuadro** (línea fina). Sirven para imprimir en un papel más grande o en bobina: el PDF sale un poco más grande, con las guías por fuera de la hoja elegida. Imprimilo a tamaño real (100 %) y cortá por las guías.

## Los datos en gris y los habilitados

En **Datos del certificado**:

- Los datos que el programa ya tiene (título, artista, serie, número de copia, medidas, impresión, año de la toma, imagen, firma, logo…) salen **en gris**: vienen de tu registro y no se pueden cambiar en ese campo.
- Los campos que están **vacíos** en tu registro salen **habilitados**: los podés completar, pero lo que escribas vale **solo para este certificado**, no se guarda en la obra.

Un campo que no completes no aparece en el certificado.

## Obras de sintografía: la leyenda SIN COPYRIGHT

Si la obra es una **sintografía** (arte generado íntegramente por inteligencia artificial), el certificado lleva al pie la leyenda **SIN COPYRIGHT**, en mayúsculas, en lugar del copyright del artista. Pasa en los tres modelos (**Clásico**, **Simple** y **Ficha**) y no hay que hacer nada: el programa lo pone solo según el subtipo de la obra. En la pantalla del certificado aparece un aviso que lo indica.

- En el certificado **Clásico**, la leyenda reemplaza la línea "© Artista - Todos los derechos reservados".
- Según el **Idioma de los títulos**, dice **SIN COPYRIGHT**, **NO COPYRIGHT** o las dos: **SIN COPYRIGHT · NO COPYRIGHT**.
- Las demás obras siguen llevando el copyright del artista en el modelo Clásico.

## Las pruebas de autor y el número de copia

El número de copia sale como **3/10**. Si la obra tiene pruebas de autor, el certificado suma la cantidad: **3/10 + 2 PA**. Si la copia es en sí una prueba de autor (**PA 1/2**), no se suma nada más.

## Firma y logo

- **Incluir la firma digital**: tilde para que la firma cargada en tu perfil aparezca en el certificado. Sin tildar, queda la línea para firmar a mano. Si no cargaste una firma, podés elegir una imagen para este certificado.
- **Incluir el logo**: igual, con el logo de tu perfil. Si no hay logo, el certificado sale sin logo. El modelo **Simple** no lleva logo.

## Emisión

- **Lugar** y **Fecha**: si la copia tiene una venta, reserva o donación, vienen de ahí (el lugar y la fecha) y salen en gris.
- Si la venta no tiene lugar cargado, o si la copia no tiene ninguna venta, reserva ni donación, el campo queda habilitado para escribirlo a mano (vale solo para este certificado).

## Corregir un dato incorrecto

Si ves un dato mal, hay dos caminos:

### Editar en la obra, la copia o la venta

Los botones **Editar en la obra**, **Editar la copia** y **Editar la venta** cierran el certificado y abren el formulario correspondiente. Es el camino para cualquier dato.

### Corregir datos del registro (sin salir de la pantalla)

1. Tocá **Corregir datos del registro**.
2. Aparece un aviso: los cambios **no son solo para este certificado**, se guardan también en la obra, la copia o la venta donde se cargó cada dato, y se van a ver en todo el programa y en los próximos informes. Si estás de acuerdo, tocá **Entendido, quiero corregir datos**.
3. Se habilitan, con borde dorado, los datos que se pueden corregir. Cada uno dice dónde se guarda: **Se guarda en la obra**, **Se guarda en la copia** o **Se guarda en la venta**.
4. Cambiá lo que necesites. Arriba queda a la vista un cuadro que lista lo que se va a actualizar ("Se van a actualizar: Título (obra), Medidas de la imagen (copia)").
5. Tocá **Guardar cambios en el registro**. Aparece "Registro actualizado." y los campos vuelven a gris con el dato corregido. Si preferís no guardar, **Descartar cambios**.

Se pueden corregir desde acá:

- En la **obra**: **Título**, **Serie**, **Año de la toma** (en la ficha, es el año de la obra si lo tiene cargado) y **Año de edición** (que se muestra en el modelo Clásico).
- En la **copia**: **Medidas de la imagen**, **Tipo de proceso/impresión**, **Soporte** y **Ubicación de la firma**.
- En la **venta**: **Lugar** y **Fecha** — solo si la copia tiene una venta, reserva o donación registrada. Si no tiene ninguna, estos dos se completan directamente en el campo habilitado (ver **Emisión**, más arriba) y no aparecen acá.

Todo se guarda junto o no se guarda nada. Si algo no es válido, el programa lo dice y no guarda:

- El **título** no puede quedar vacío.
- El **año de la toma** y el **año de edición** tienen que ser de 4 cifras (el año de edición se puede dejar vacío).
- La **fecha** tiene que ser una fecha real.

Lo demás (número de copia, pruebas de autor, subtipo, artista, datos de galería e imágenes) sigue en gris y se cambia con los botones **Editar…**. Mientras estás corrigiendo, esos botones quedan bloqueados para que no pierdas cambios sin guardar.

> Si cerrás la pantalla con cambios sin guardar en el registro, el programa pregunta qué hacer: **Guardar y salir**, **Descartar y salir** o **Seguir editando**.

## Guardar el PDF

Tocá **Guardar PDF**, elegí dónde guardarlo y, si querés verlo enseguida, **Abrir PDF**. El archivo se llama, por ejemplo, `coa_El_Cielo_en_el_Agua_3_10.pdf`.

## Preguntas frecuentes

- **¿Por qué no aparece el botón Certificado?** Solo pasa si la copia está **Destruida** o **Descartada** y nunca tuvo una venta, reserva o donación.
- **Escribí un dato en un campo habilitado y después no está en la obra.** Es lo esperado: lo que se completa en un campo habilitado vale solo para ese certificado. Para que quede en el registro, cargalo en la obra, la copia o la venta.

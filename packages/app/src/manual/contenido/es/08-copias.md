# Copias y estados

Las copias numeradas de cada obra (ediciones y pruebas de autor): sus estados, cómo editarlas y qué se puede hacer con cada una.

## Qué es una copia

Cada obra tiene una o más copias, que en el programa aparecen como **Ejemplares** (y a veces como "series"). Son lo mismo: cada unidad física numerada de la obra.

- Una **obra única** tiene una sola copia.
- Una **obra seriada** tiene tantas copias como ediciones: la número **1/10**, la **2/10**… hasta la **10/10**.
- Las **pruebas de autor** (**PA**) son copias adicionales que van fuera de la numeración comercial: **PA 1/2**, **PA 2/2**. Aparecen en una lista aparte, **Pruebas de autor**.

Por convención, las pruebas de autor **no se venden**: se conservan, se donan o se usan para difusión. De todos modos, el programa te deja registrar su venta si decidís venderlas; es una decisión tuya. Por eso, en una prueba de autor el botón se llama **Venta / Reserva / Donación**.

Cada copia tiene su propio estado, sus propios datos de impresión y, si se vende, su propia venta. Todo lo que pasa con una copia (vender, reservar, donar, certificar) se hace desde ahí.

## La lista de copias en la ficha

Al abrir una obra, la lista de **Ejemplares** muestra primero las copias que **no** están disponibles (vendidas, reservadas, etc.), que es lo que suele interesar. Si todas están disponibles, muestra solo la primera. Para ver el resto tocá **Ver las demás series (n)**, y para volver a plegar la lista, **Ver menos**. Las pruebas de autor tienen su propio botón para desplegar.

Cada copia muestra su número, su estado, sus datos (fecha de impresión, soporte, ubicación…) y, si tiene una venta, un resumen: "Vendida a Ana el 24/09/2026 — ARS 150000 — certificado #12".

## Los botones de cada copia

- **Editar**: cambiar los datos de la copia.
- **Venta / Reserva** (en las pruebas de autor, **Venta / Reserva / Donación**): registrar una venta. Ver [Ventas, reservas y donaciones](cap:ventas).
- Si la copia ya tiene una venta: **Editar venta** (o **Editar reserva** / **Editar donación**), **Confirmar venta** (solo en reservas) y **Anular venta** (o reserva / donación).
- **Informes**: presupuesto, comprobante, remito y contratos. Ver [Informes y documentos en PDF](cap:informes).
- **Certificado**: el certificado de autenticidad de esa copia (solo si tiene una venta, reserva o donación). Ver [Certificado de autenticidad](cap:certificado).

## Los estados de una copia

- **Disponible**: el número de serie está libre, pero esa copia todavía no se imprimió.
- **En stock**: la copia ya está impresa y lista para la venta.
- **En producción**: todavía se está imprimiendo o produciendo, no está terminada.
- **En exhibición**: la copia está expuesta en una muestra o exposición. Se puede indicar una **Fecha límite**.
- **Consignación**: está en manos de un tercero (galería, feria, depósito) para su eventual venta, pero todavía no se vendió. También admite **Fecha límite**.
- **Reservada**: tiene una reserva registrada.
- **Vendida**: tiene una venta registrada.
- **Colección del autor**: quedó en poder del propio artista y no está disponible para la venta ni para reserva.
- **Descartada**: se descartó por un defecto de impresión u otro motivo, sin llegar a ser una pieza válida.
- **Destruida**: la copia fue destruida y ya no existe físicamente.

Los estados **Reservada** y **Vendida** no se eligen a mano: aparecen solos cuando registrás una reserva o una venta. Mientras una copia tenga una venta, reserva o donación, tampoco se puede cambiar su estado desde la edición: para cambiarlo hay que modificar o anular esa venta.

## Editar una copia

1. En la copia, tocá **Editar**. Se abre el formulario de la copia.
2. Completá o corregí los datos. Según la categoría de la obra aparecen unos campos u otros; los principales son:
   - **Estado** (y **Fecha límite** si es exhibición o consignación).
   - **Fecha de impresión** y **Soporte** (papel u otro soporte).
   - **Tipo de proceso/impresión** (en fotografía digital y obra gráfica) y **Tipo de tintas** (en fotografía digital, sintografía y obra gráfica).
   - **Taller / Laboratorio de impresión** (en fotografía digital, obra gráfica y escultura).
   - **Tamaño (mm)**, **Medida de la hoja / soporte completo** y **Peso**.
   - **Montaje / Conservación**, **Tamaño final con marco (mm)**, **Vidrio / Protección frontal** y **Sistema de cuelgue** (en las categorías que se enmarcan: fotografía, pintura, obra gráfica y dibujo).
   - **Ubicación de la firma** y **Sello seco / Hologramas** (donde corresponde).
   - **Ubicación actual de esta copia** y **Valor** (el precio de la copia).
   - **Notas**.
   - En obra gráfica y escultura, las pruebas de autor además tienen **Clasificación de prueba especial** (P/E, B.A.T., H/C, P/I, F/C).
3. Tocá **Guardar cambios**.

Los cartelitos **?** explican cada dato. Ninguno es obligatorio, salvo lo necesario para vender (ver abajo).

> En Galeris Space, la copia tiene además datos propios de galería: el **Número**, el **Emisor** y la **Fecha de emisión del COA**, el **Sistema de seguridad del COA**, el **Valor de seguro** y el **Informe de conservación**.

## Lo que hace falta antes de vender o reservar

Para registrar una venta o una reserva, la copia tiene que tener cargados la **fecha de impresión** y el **soporte de impresión**. Si falta alguno, al tocar el botón el programa te avisa qué falta ("No se puede registrar venta ni reserva de 3/10: falta cargar la fecha de impresión") y te manda a completar con **Editar**.

No se pueden registrar ventas de copias **Descartadas**, **Destruidas** ni de la **Colección del autor**.

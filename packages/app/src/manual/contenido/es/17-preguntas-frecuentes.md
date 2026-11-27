# Preguntas frecuentes

Respuestas rápidas a las dudas más comunes.

## No puedo registrar una venta

Revisá estas causas:

- A la copia le falta la **fecha de impresión** o el **soporte**. El programa te dice qué falta: completalo con **Editar**. Ver [Copias y estados](cap:copias).
- La copia está **Descartada**, **Destruida** o en la **Colección del autor**: no se puede vender.
- La copia ya tiene una venta, reserva o donación: en ese caso ves **Editar venta** en lugar de **Venta / Reserva**.

## ¿Puedo vender una prueba de autor?

El programa te deja: en una prueba de autor el botón se llama **Venta / Reserva / Donación**. Por convención, las pruebas de autor no se venden (se conservan, se donan o se usan para difusión), pero si decidís venderla, se registra como cualquier otra venta. Ver [Copias y estados](cap:copias).

## Elegí varias etiquetas y veo obras que no tienen todas

Es lo esperado: con varias etiquetas, el filtro muestra las obras que tienen **al menos una** de ellas. Cada etiqueta que agregás amplía lo que ves. Ver [Obras](cap:obras).

## El certificado dice SIN COPYRIGHT

Pasa con las obras de subtipo **Sintografía** (arte generado por inteligencia artificial): en lugar del copyright del artista, el certificado aclara que no lo tiene. Ver [Certificado de autenticidad](cap:certificado).

## No puedo cambiar el estado de una copia

Si la copia tiene una venta, reserva o donación, el estado se maneja desde ahí: modificá o anulá esa operación. **Vendida** y **Reservada** no se eligen a mano. Ver [Ventas, reservas y donaciones](cap:ventas).

## No puedo eliminar una obra, un artista o un cliente

Si tienen ventas (o, en un artista, obras) registradas, el programa no los elimina para no perder ese historial. Primero hay que resolver esas ventas u obras.

## No puedo convertir mi obra única en seriada (o al revés), ni bajar la cantidad de ediciones

Solo se puede si las copias no tienen historial propio. Si alguna tiene un estado o datos cargados, el programa te dice cuáles y no lo permite. Ver [Ficha de la obra](cap:ficha-de-obra).

## Se me perdieron las obras de la pantalla

Puede ser que el programa esté apuntando a otra carpeta de datos, o que un disco externo no esté conectado. Ver [Primeros pasos](cap:primeros-pasos) y [Configuración](cap:configuracion).

## macOS no me deja abrir el programa

Como el programa todavía no está aprobado por Apple (no está firmado con una cuenta de desarrollador), macOS puede bloquear la primera apertura. Con el programa ya copiado en **Aplicaciones**:

1. Abrilo con doble clic. En el aviso tocá **Listo** (no **Trasladar a la papelera**).
2. Enseguida entrá en **Ajustes del Sistema** y en **Privacidad y seguridad**, y bajá hasta **Seguridad**. El botón aparece solo después de haber intentado abrir el programa, y dura alrededor de una hora.
3. Tocá **Abrir igualmente** y poné la contraseña de tu Mac. Se hace una sola vez.

Si el botón no aparece, abrí la aplicación **Terminal**, pegá esta línea y apretá Enter: `xattr -dr com.apple.quarantine /Applications/Recer.app`. Después abrí el programa normalmente. Esa línea le quita a este programa la marca de archivo descargado y saltea el control de Apple: usala solo con un instalador que hayas recibido directamente de quien te vendió Recer.

## La imagen de mi PSD no se ve

Un PSD o PSB solo puede usarse si trae guardada una vista previa. Abrilo en Photoshop, activá **Vistas previas de imagen** en las preferencias y guardalo de nuevo, o usá un JPG o PNG. Ver [Cargar una obra nueva](cap:nueva-obra).

## El certificado o el informe sale sin firma o sin logo

Hay que cargarlos primero en **Mi perfil (titular)**: tu logo y tu firma digital. Después, en el informe, elegí **Con logo** y **Firma digital** (en el certificado, tildá **Incluir el logo** y **Incluir la firma digital**). Ver [Mi perfil](cap:mi-perfil).

## Un campo del certificado está en gris y no lo puedo escribir

Ese dato viene de tu registro. Podés corregirlo con **Corregir datos del registro** o editarlo en la obra, la copia o la venta. Ver [Certificado de autenticidad](cap:certificado).

## ¿Dónde están mis datos y cómo hago una copia de seguridad?

Están en la carpeta de datos que elegiste la primera vez. Para hacer una copia de seguridad, copiá esa carpeta completa a otro lugar (por ejemplo, un disco externo). Ver [Configuración](cap:configuracion) para saber cómo cambiarla o moverla.

## ¿Puedo sincronizar mis datos con iCloud, Dropbox o Google Drive?

No conviene: esos servicios pueden dañar el archivo de la base de datos si lo sincronizan mientras el programa escribe. Usá una carpeta local y hacé copias manuales.

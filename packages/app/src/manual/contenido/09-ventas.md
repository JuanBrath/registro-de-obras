# Ventas, reservas y donaciones

Cómo registrar, editar, confirmar y anular una venta, una reserva o una donación de una copia.

## Registrar una venta, reserva o donación

1. Abrí la obra y buscá la copia. Ver [Copias y estados](cap:copias).
2. Tocá **Venta / Reserva** (o **Venta / Reserva / Donación** en una prueba de autor). Se abre un panel a la derecha.
3. Elegí el **Tipo**: **Venta**, **Reserva** o **Donación**.
4. Completá los datos (más abajo).
5. Tocá el botón de confirmar (**Confirmar venta**, **Confirmar reserva** o **Confirmar donación**).

La copia pasa a estar **Vendida** o **Reservada**. Una donación también deja la copia en estado **Vendida** (ya no está disponible), pero en el resumen de la copia figura como **Donada**.

Si querés salir sin guardar, tocá **Volver**: el programa avisa "Hay cambios sin guardar" y te deja elegir **Salir sin guardar** o **Seguir editando**.

## El comprador

- **Vincular a un cliente ya registrado (opcional)**: elegí a alguien de la lista y sus datos se completan solos.
- Si no elegís ninguno, escribí el **Nombre del comprador** (obligatorio), **Mail** y **Teléfono**. Al guardar se crea automáticamente un cliente nuevo con esos datos, para que quede en las estadísticas y en los informes de clientes.

## Entrega y confidencialidad

- **Entrega**: **Dirección de entrega**, **Ciudad** y **País**. Si elegiste un cliente, se completan con su domicilio, pero los podés cambiar (por ejemplo, si se envía a un depósito o a un tercero).
- **Venta confidencial**: marca informativa de que el precio o el comprador no deben divulgarse. No restringe el acceso dentro del programa.
- **Cláusula de reventa / primera opción de compra**: texto libre.

## Fecha, lugar y asesor

- **Fecha de venta** (o de reserva / de donación): obligatoria.
- **Lugar de venta**: ciudad, feria, galería o plataforma donde se concretó.
- **Asesor de venta**: quién gestionó la operación (es solo un nombre, no está ligado a un usuario). No aparece en las donaciones.

## Valor y moneda

- **Moneda**: **ARS**, **USD** o **EUR**.
- **Valor de venta** (o **Valor de reserva**).
- En una **reserva**, además, **Monto de la seña** y **Moneda de la seña**: lo entregado como señal para mantener la reserva.
- Las **donaciones** no tienen valor comercial: no se registra precio.

También, si no es una donación:

- **Precio de lista**, **Motivo / autorización del descuento** y **Tipo de cambio aplicado**.
- **Costos asociados a la venta**: **Enmarcado**, **Peana**, **Embalaje profesional (crate)**, **Transporte / flete** y **Seguro (clavo a clavo)**.
- **Condición de pago**: **Estado de pago** (**Pagado**, **Pendiente** o **En cuotas / leasing**), **Método de pago** y **Fecha de cobro efectiva**.

En Galeris Studio el artista recibe el valor total: no hay comisión. Las comisiones, el IVA y otros datos comerciales existen en Galeris Space. Ver [Galeris Space](cap:galeris-space).

## El número de certificado

Cada **venta** recibe automáticamente un **número de certificado** correlativo (1, 2, 3…). Lo ves al editar la venta, en el historial del cliente y como número del **Comprobante de venta**. Las reservas y donaciones no reciben número.

## Editar una venta

1. En la copia, tocá **Editar venta** (o **Editar reserva** / **Editar donación**).
2. Cambiá lo que haga falta y guardá.

El número de certificado no se puede modificar.

## Confirmar una reserva

Cuando la reserva se concreta en venta, tocá **Confirmar venta** en la fila de la copia reservada. La reserva pasa a ser una venta, la copia pasa a **Vendida**, se le asigna su **número de certificado** y la reserva queda anotada como **cumplida** (esto se cuenta en el [Reporte de ventas](cap:reporte-ventas)).

## Anular una venta, reserva o donación

1. Tocá **Anular venta** (o **Anular reserva** / **Anular donación**).
2. El programa pregunta "¿Está seguro que quiere cancelar…?" y "¿En qué estado queda la copia?": **Disponible**, **En stock**, **En exhibición** o **Consignación**.
3. Confirmá con **Sí, anular**.

La copia vuelve al estado que elegiste y queda libre para otra operación.

> Anular **borra** la venta, reserva o donación del registro: ya no aparece en el historial del cliente ni en el reporte de ventas. El número de certificado que tenía una venta anulada queda sin uso (no se vuelve a asignar). Si anulás una **reserva**, el programa la cuenta como reserva **caída** en el Reporte de ventas.

## Ver las ventas en conjunto

Para un balance por fechas, artistas o técnicas, usá el [Reporte de ventas](cap:reporte-ventas). Para ver todo lo que compró una persona, la ficha del cliente: [Clientes](cap:clientes).

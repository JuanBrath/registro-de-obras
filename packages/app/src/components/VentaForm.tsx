import { useEffect, useRef, useState, type FormEvent } from "react";
import { calcularPorcentajeComision, type EstadoLiquidacion, type EstadoPago, type Moneda, type TipoVenta } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { HelpIcon } from "./HelpIcon.js";
import { CampoFecha, BotonCalendario } from "./CampoFecha.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";

const MONEDAS: Moneda[] = ["ARS", "USD", "EUR"];

export interface VentaExistente {
  id: number;
  tipo: TipoVenta;
  clienteId: number | null;
  compradorNombre: string;
  compradorEmail: string | null;
  compradorTelefono: string | null;
  fechaVenta: string;
  lugarVenta: string | null;
  valorVenta: number;
  moneda: Moneda;
  aplicaComision: boolean;
  porcentajeComision: number | null;
  montoComision: number | null;
  numeroCertificado: number | null;
  ivaPorcentaje: number | null;
  ivaMonto: number | null;
  precioLista: number | null;
  motivoDescuento: string | null;
  tipoCambio: number | null;
  retencionesMonto: number | null;
  arancelesMonto: number | null;
  costoEnmarcado: number | null;
  costoPeana: number | null;
  costoEmbalaje: number | null;
  costoTransporte: number | null;
  costoSeguro: number | null;
  estadoPago: EstadoPago | null;
  metodoPago: string | null;
  fechaCobro: string | null;
  estadoLiquidacion: EstadoLiquidacion | null;
  droitSuiteAplica: boolean;
  droitSuitePorcentaje: number | null;
  droitSuiteMonto: number | null;
  direccionEntrega: string | null;
  ciudadEntrega: string | null;
  paisEntrega: string | null;
  confidencial: boolean;
  clausulaReventa: string | null;
  asesorVenta: string | null;
}

interface ClienteOption {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  domicilio: string | null;
  ciudad: string | null;
  pais: string | null;
}

function redondearMonto(n: number): number {
  return Math.round(n * 100) / 100;
}

// El input de porcentaje usa step="0.1" — redondear a 1 decimal evita que el
// valor calculado automaticamente quede en un paso invalido para el input
// (lo que el navegador rechaza silenciosamente al confirmar el formulario).
function redondearPorcentaje(n: number): number {
  return Math.round(n * 10) / 10;
}

export function VentaForm({
  obraId,
  ejemplarId,
  esSeriada,
  existingVenta,
  onDone,
  onCancel,
}: {
  obraId: number;
  ejemplarId: number | null;
  esSeriada: boolean;
  existingVenta?: VentaExistente | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const esGaleria = context?.workspace === "galeria";

  const [tipo, setTipo] = useState<TipoVenta>(existingVenta?.tipo ?? "venta");
  const esVenta = tipo === "venta";
  const esDonacion = tipo === "donacion";
  const esReserva = tipo === "reserva";

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(existingVenta?.clienteId ?? null);
  const [addingCliente, setAddingCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  useEscapeToDismiss(errorCliente, setErrorCliente);
  const [compradorNombre, setCompradorNombre] = useState(existingVenta?.compradorNombre ?? "");
  const [compradorEmail, setCompradorEmail] = useState(existingVenta?.compradorEmail ?? "");
  const [compradorTelefono, setCompradorTelefono] = useState(existingVenta?.compradorTelefono ?? "");
  const [fechaVenta, setFechaVenta] = useState(existingVenta?.fechaVenta ?? "");
  const [lugarVenta, setLugarVenta] = useState(existingVenta?.lugarVenta ?? "");
  const [moneda, setMoneda] = useState<Moneda>(existingVenta?.moneda ?? "ARS");
  const [valorVenta, setValorVenta] = useState(existingVenta ? String(existingVenta.valorVenta) : "");
  const [aplicaComision, setAplicaComision] = useState(existingVenta?.aplicaComision ?? false);
  const [porcentajeComision, setPorcentajeComision] = useState(
    existingVenta?.porcentajeComision != null ? String(existingVenta.porcentajeComision) : "",
  );
  const [montoComision, setMontoComision] = useState(
    existingVenta?.montoComision != null ? String(existingVenta.montoComision) : "",
  );
  const [ivaPorcentaje, setIvaPorcentaje] = useState(
    existingVenta?.ivaPorcentaje != null ? String(existingVenta.ivaPorcentaje) : "",
  );
  const [ivaMonto, setIvaMonto] = useState(existingVenta?.ivaMonto != null ? String(existingVenta.ivaMonto) : "");
  const [precioLista, setPrecioLista] = useState(
    existingVenta?.precioLista != null ? String(existingVenta.precioLista) : "",
  );
  const [motivoDescuento, setMotivoDescuento] = useState(existingVenta?.motivoDescuento ?? "");
  const [tipoCambio, setTipoCambio] = useState(existingVenta?.tipoCambio != null ? String(existingVenta.tipoCambio) : "");
  const [retencionesMonto, setRetencionesMonto] = useState(
    existingVenta?.retencionesMonto != null ? String(existingVenta.retencionesMonto) : "",
  );
  const [arancelesMonto, setArancelesMonto] = useState(
    existingVenta?.arancelesMonto != null ? String(existingVenta.arancelesMonto) : "",
  );
  const [costoEnmarcado, setCostoEnmarcado] = useState(
    existingVenta?.costoEnmarcado != null ? String(existingVenta.costoEnmarcado) : "",
  );
  const [costoPeana, setCostoPeana] = useState(existingVenta?.costoPeana != null ? String(existingVenta.costoPeana) : "");
  const [costoEmbalaje, setCostoEmbalaje] = useState(
    existingVenta?.costoEmbalaje != null ? String(existingVenta.costoEmbalaje) : "",
  );
  const [costoTransporte, setCostoTransporte] = useState(
    existingVenta?.costoTransporte != null ? String(existingVenta.costoTransporte) : "",
  );
  const [costoSeguro, setCostoSeguro] = useState(
    existingVenta?.costoSeguro != null ? String(existingVenta.costoSeguro) : "",
  );
  const [estadoPago, setEstadoPago] = useState<EstadoPago | "">(existingVenta?.estadoPago ?? "");
  const [metodoPago, setMetodoPago] = useState(existingVenta?.metodoPago ?? "");
  const [fechaCobro, setFechaCobro] = useState(existingVenta?.fechaCobro ?? "");
  const [estadoLiquidacion, setEstadoLiquidacion] = useState<EstadoLiquidacion | "">(
    existingVenta?.estadoLiquidacion ?? "",
  );
  const [droitSuiteAplica, setDroitSuiteAplica] = useState(existingVenta?.droitSuiteAplica ?? false);
  const [droitSuitePorcentaje, setDroitSuitePorcentaje] = useState(
    existingVenta?.droitSuitePorcentaje != null ? String(existingVenta.droitSuitePorcentaje) : "",
  );
  const [droitSuiteMonto, setDroitSuiteMonto] = useState(
    existingVenta?.droitSuiteMonto != null ? String(existingVenta.droitSuiteMonto) : "",
  );
  const [direccionEntrega, setDireccionEntrega] = useState(existingVenta?.direccionEntrega ?? "");
  const [ciudadEntrega, setCiudadEntrega] = useState(existingVenta?.ciudadEntrega ?? "");
  const [paisEntrega, setPaisEntrega] = useState(existingVenta?.paisEntrega ?? "");
  const [confidencial, setConfidencial] = useState(existingVenta?.confidencial ?? false);
  const [clausulaReventa, setClausulaReventa] = useState(existingVenta?.clausulaReventa ?? "");
  const [asesorVenta, setAsesorVenta] = useState(existingVenta?.asesorVenta ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [confirmandoSalir, setConfirmandoSalir] = useState(false);
  useEscapeToDismiss(confirmandoSalir, () => setConfirmandoSalir(false));

  // Snapshot de los valores con los que arranco el formulario (tal como los
  // calcula cada useState de arriba), para poder avisar antes de descartar
  // cambios sin guardar al volver — se toma una sola vez, en el primer render.
  const valoresInicialesRef = useRef(
    JSON.stringify({
      tipo: existingVenta?.tipo ?? "venta",
      clienteId: existingVenta?.clienteId ?? null,
      compradorNombre: existingVenta?.compradorNombre ?? "",
      compradorEmail: existingVenta?.compradorEmail ?? "",
      compradorTelefono: existingVenta?.compradorTelefono ?? "",
      fechaVenta: existingVenta?.fechaVenta ?? "",
      lugarVenta: existingVenta?.lugarVenta ?? "",
      moneda: existingVenta?.moneda ?? "ARS",
      valorVenta: existingVenta ? String(existingVenta.valorVenta) : "",
      aplicaComision: existingVenta?.aplicaComision ?? false,
      porcentajeComision: existingVenta?.porcentajeComision != null ? String(existingVenta.porcentajeComision) : "",
      montoComision: existingVenta?.montoComision != null ? String(existingVenta.montoComision) : "",
      ivaPorcentaje: existingVenta?.ivaPorcentaje != null ? String(existingVenta.ivaPorcentaje) : "",
      ivaMonto: existingVenta?.ivaMonto != null ? String(existingVenta.ivaMonto) : "",
      precioLista: existingVenta?.precioLista != null ? String(existingVenta.precioLista) : "",
      motivoDescuento: existingVenta?.motivoDescuento ?? "",
      tipoCambio: existingVenta?.tipoCambio != null ? String(existingVenta.tipoCambio) : "",
      retencionesMonto: existingVenta?.retencionesMonto != null ? String(existingVenta.retencionesMonto) : "",
      arancelesMonto: existingVenta?.arancelesMonto != null ? String(existingVenta.arancelesMonto) : "",
      costoEnmarcado: existingVenta?.costoEnmarcado != null ? String(existingVenta.costoEnmarcado) : "",
      costoPeana: existingVenta?.costoPeana != null ? String(existingVenta.costoPeana) : "",
      costoEmbalaje: existingVenta?.costoEmbalaje != null ? String(existingVenta.costoEmbalaje) : "",
      costoTransporte: existingVenta?.costoTransporte != null ? String(existingVenta.costoTransporte) : "",
      costoSeguro: existingVenta?.costoSeguro != null ? String(existingVenta.costoSeguro) : "",
      estadoPago: existingVenta?.estadoPago ?? "",
      metodoPago: existingVenta?.metodoPago ?? "",
      fechaCobro: existingVenta?.fechaCobro ?? "",
      estadoLiquidacion: existingVenta?.estadoLiquidacion ?? "",
      droitSuiteAplica: existingVenta?.droitSuiteAplica ?? false,
      droitSuitePorcentaje: existingVenta?.droitSuitePorcentaje != null ? String(existingVenta.droitSuitePorcentaje) : "",
      droitSuiteMonto: existingVenta?.droitSuiteMonto != null ? String(existingVenta.droitSuiteMonto) : "",
      direccionEntrega: existingVenta?.direccionEntrega ?? "",
      ciudadEntrega: existingVenta?.ciudadEntrega ?? "",
      paisEntrega: existingVenta?.paisEntrega ?? "",
      confidencial: existingVenta?.confidencial ?? false,
      clausulaReventa: existingVenta?.clausulaReventa ?? "",
      asesorVenta: existingVenta?.asesorVenta ?? "",
    }),
  ).current;

  const isDirty =
    JSON.stringify({
      tipo,
      clienteId,
      compradorNombre,
      compradorEmail,
      compradorTelefono,
      fechaVenta,
      lugarVenta,
      moneda,
      valorVenta,
      aplicaComision,
      porcentajeComision,
      montoComision,
      ivaPorcentaje,
      ivaMonto,
      precioLista,
      motivoDescuento,
      tipoCambio,
      retencionesMonto,
      arancelesMonto,
      costoEnmarcado,
      costoPeana,
      costoEmbalaje,
      costoTransporte,
      costoSeguro,
      estadoPago,
      metodoPago,
      fechaCobro,
      estadoLiquidacion,
      droitSuiteAplica,
      droitSuitePorcentaje,
      droitSuiteMonto,
      direccionEntrega,
      ciudadEntrega,
      paisEntrega,
      confidencial,
      clausulaReventa,
      asesorVenta,
    }) !== valoresInicialesRef;

  function handleVolverClick() {
    if (isDirty) {
      setConfirmandoSalir(true);
      return;
    }
    onCancel();
  }

  useEffect(() => {
    if (!context) return;
    context.db
      .query<ClienteOption>("SELECT id, nombre, email, telefono, domicilio, ciudad, pais FROM cliente ORDER BY nombre")
      .then(setClientes)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  if (!context) return null;

  function handleClienteChange(value: string) {
    if (!value) {
      setClienteId(null);
      return;
    }
    const id = Number(value);
    const cliente = clientes.find((c) => c.id === id);
    setClienteId(id);
    if (cliente) {
      setCompradorNombre(cliente.nombre);
      setCompradorEmail(cliente.email ?? "");
      setCompradorTelefono(cliente.telefono ?? "");
      setDireccionEntrega(cliente.domicilio ?? "");
      setCiudadEntrega(cliente.ciudad ?? "");
      setPaisEntrega(cliente.pais ?? "");
    }
  }

  async function handleCrearCliente() {
    if (!context || !nuevoClienteNombre.trim()) return;
    setCreandoCliente(true);
    setErrorCliente(null);
    try {
      const nombre = nuevoClienteNombre.trim();
      const email = nuevoClienteEmail.trim() || null;
      const telefono = nuevoClienteTelefono.trim() || null;
      const result = await context.db.execute(`INSERT INTO cliente (nombre, email, telefono) VALUES (?, ?, ?)`, [
        nombre,
        email,
        telefono,
      ]);
      const nuevoId = result.lastInsertId;
      if (!nuevoId) throw new Error(t("clientes.title"));
      const nuevoCliente: ClienteOption = {
        id: nuevoId,
        nombre,
        email,
        telefono,
        domicilio: null,
        ciudad: null,
        pais: null,
      };
      setClientes((prev) => [...prev, nuevoCliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setClienteId(nuevoId);
      setCompradorNombre(nuevoCliente.nombre);
      setCompradorEmail(nuevoCliente.email ?? "");
      setCompradorTelefono(nuevoCliente.telefono ?? "");
      setAddingCliente(false);
      setNuevoClienteNombre("");
      setNuevoClienteEmail("");
      setNuevoClienteTelefono("");
    } catch (err) {
      setErrorCliente(err instanceof Error ? err.message : String(err));
    } finally {
      setCreandoCliente(false);
    }
  }

  function handlePorcentajeChange(nuevoPorcentaje: string) {
    setPorcentajeComision(nuevoPorcentaje);
    const valor = parseFloat(valorVenta) || 0;
    const pct = parseFloat(nuevoPorcentaje);
    setMontoComision(!isNaN(pct) && valor > 0 ? String(redondearMonto(valor * (pct / 100))) : "");
  }

  function handleMontoComisionChange(nuevoMonto: string) {
    setMontoComision(nuevoMonto);
    const valor = parseFloat(valorVenta) || 0;
    const monto = parseFloat(nuevoMonto);
    setPorcentajeComision(
      !isNaN(monto) && valor > 0 ? String(redondearPorcentaje(calcularPorcentajeComision(valor, monto))) : "",
    );
  }

  function handleIvaPorcentajeChange(nuevoPorcentaje: string) {
    setIvaPorcentaje(nuevoPorcentaje);
    const valor = parseFloat(valorVenta) || 0;
    const pct = parseFloat(nuevoPorcentaje);
    setIvaMonto(!isNaN(pct) && valor > 0 ? String(redondearMonto(valor * (pct / 100))) : "");
  }

  function handleIvaMontoChange(nuevoMonto: string) {
    setIvaMonto(nuevoMonto);
    const valor = parseFloat(valorVenta) || 0;
    const monto = parseFloat(nuevoMonto);
    setIvaPorcentaje(
      !isNaN(monto) && valor > 0 ? String(redondearPorcentaje(calcularPorcentajeComision(valor, monto))) : "",
    );
  }

  function handleDroitSuitePorcentajeChange(nuevoPorcentaje: string) {
    setDroitSuitePorcentaje(nuevoPorcentaje);
    const valor = parseFloat(valorVenta) || 0;
    const pct = parseFloat(nuevoPorcentaje);
    setDroitSuiteMonto(!isNaN(pct) && valor > 0 ? String(redondearMonto(valor * (pct / 100))) : "");
  }

  function handleDroitSuiteMontoChange(nuevoMonto: string) {
    setDroitSuiteMonto(nuevoMonto);
    const valor = parseFloat(valorVenta) || 0;
    const monto = parseFloat(nuevoMonto);
    setDroitSuitePorcentaje(
      !isNaN(monto) && valor > 0 ? String(redondearPorcentaje(calcularPorcentajeComision(valor, monto))) : "",
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { db } = context!;
      const valorVentaNum = esDonacion ? 0 : parseFloat(valorVenta) || 0;
      const aplica = !esDonacion && esGaleria && aplicaComision;
      const porcentaje = aplica ? parseFloat(porcentajeComision) || 0 : null;
      const montoComisionNum = aplica ? parseFloat(montoComision) || 0 : 0;
      const montoNetoArtista = aplica ? valorVentaNum - montoComisionNum : valorVentaNum;
      const aplicaIva = !esDonacion && esGaleria && ivaPorcentaje !== "";
      const ivaPorcentajeNum = aplicaIva ? parseFloat(ivaPorcentaje) || 0 : null;
      const ivaMontoNum = aplicaIva ? parseFloat(ivaMonto) || 0 : null;

      const precioListaNum = !esDonacion && precioLista !== "" ? parseFloat(precioLista) || 0 : null;
      const motivoDescuentoVal = !esDonacion ? motivoDescuento || null : null;
      const tipoCambioNum = !esDonacion && tipoCambio !== "" ? parseFloat(tipoCambio) || 0 : null;
      const aplicaFiscalExtra = !esDonacion && esGaleria;
      const retencionesMontoNum = aplicaFiscalExtra && retencionesMonto !== "" ? parseFloat(retencionesMonto) || 0 : null;
      const arancelesMontoNum = aplicaFiscalExtra && arancelesMonto !== "" ? parseFloat(arancelesMonto) || 0 : null;
      const costoEnmarcadoNum = !esDonacion && costoEnmarcado !== "" ? parseFloat(costoEnmarcado) || 0 : null;
      const costoPeanaNum = !esDonacion && costoPeana !== "" ? parseFloat(costoPeana) || 0 : null;
      const costoEmbalajeNum = !esDonacion && costoEmbalaje !== "" ? parseFloat(costoEmbalaje) || 0 : null;
      const costoTransporteNum = !esDonacion && costoTransporte !== "" ? parseFloat(costoTransporte) || 0 : null;
      const costoSeguroNum = !esDonacion && costoSeguro !== "" ? parseFloat(costoSeguro) || 0 : null;
      const estadoPagoVal = !esDonacion && estadoPago !== "" ? estadoPago : null;
      const metodoPagoVal = !esDonacion ? metodoPago || null : null;
      const fechaCobroVal = !esDonacion && fechaCobro !== "" ? fechaCobro : null;
      const estadoLiquidacionVal = aplicaFiscalExtra && estadoLiquidacion !== "" ? estadoLiquidacion : null;
      const droitSuiteAplicaVal = aplicaFiscalExtra && droitSuiteAplica;
      const droitSuitePorcentajeNum = droitSuiteAplicaVal ? parseFloat(droitSuitePorcentaje) || 0 : null;
      const droitSuiteMontoNum = droitSuiteAplicaVal ? parseFloat(droitSuiteMonto) || 0 : null;
      const direccionEntregaVal = direccionEntrega || null;
      const ciudadEntregaVal = ciudadEntrega || null;
      const paisEntregaVal = paisEntrega || null;
      const clausulaReventaVal = clausulaReventa || null;
      const asesorVentaVal = !esDonacion ? asesorVenta || null : null;

      if (existingVenta) {
        await db.transaction(async (tx) => {
          await tx.execute(
            `UPDATE venta SET
               cliente_id = ?, comprador_nombre = ?, comprador_email = ?, comprador_telefono = ?, fecha_venta = ?,
               lugar_venta = ?, valor_venta = ?, moneda = ?, aplica_comision = ?, porcentaje_comision = ?,
               monto_comision = ?, monto_neto_artista = ?, iva_porcentaje = ?, iva_monto = ?,
               precio_lista = ?, motivo_descuento = ?, tipo_cambio = ?, retenciones_monto = ?, aranceles_monto = ?,
               costo_enmarcado = ?, costo_peana = ?, costo_embalaje = ?, costo_transporte = ?, costo_seguro = ?,
               estado_pago = ?, metodo_pago = ?, fecha_cobro = ?, estado_liquidacion = ?,
               droit_suite_aplica = ?, droit_suite_porcentaje = ?, droit_suite_monto = ?,
               direccion_entrega = ?, ciudad_entrega = ?, pais_entrega = ?, confidencial = ?, clausula_reventa = ?,
               asesor_venta = ?
             WHERE id = ?`,
            [
              clienteId,
              compradorNombre,
              compradorEmail || null,
              compradorTelefono || null,
              fechaVenta,
              lugarVenta || null,
              valorVentaNum,
              moneda,
              aplica ? 1 : 0,
              porcentaje,
              aplica ? montoComisionNum : null,
              montoNetoArtista,
              ivaPorcentajeNum,
              ivaMontoNum,
              precioListaNum,
              motivoDescuentoVal,
              tipoCambioNum,
              retencionesMontoNum,
              arancelesMontoNum,
              costoEnmarcadoNum,
              costoPeanaNum,
              costoEmbalajeNum,
              costoTransporteNum,
              costoSeguroNum,
              estadoPagoVal,
              metodoPagoVal,
              fechaCobroVal,
              estadoLiquidacionVal,
              droitSuiteAplicaVal ? 1 : 0,
              droitSuitePorcentajeNum,
              droitSuiteMontoNum,
              direccionEntregaVal,
              ciudadEntregaVal,
              paisEntregaVal,
              confidencial ? 1 : 0,
              clausulaReventaVal,
              asesorVentaVal,
              existingVenta.id,
            ],
          );
          await tx.execute(`INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'edicion', ?)`, [
            obraId,
            `${esVenta ? "Venta" : esDonacion ? "Donación" : "Reserva"} editada`,
          ]);
        });
      } else {
        await db.transaction(async (tx) => {
          let numeroCertificado: number | null = null;
          if (esVenta) {
            const counter = await tx.query<{ siguiente_numero: number }>(
              "SELECT siguiente_numero FROM certificado_contador WHERE id = 1",
            );
            numeroCertificado = counter[0].siguiente_numero;
            await tx.execute("UPDATE certificado_contador SET siguiente_numero = siguiente_numero + 1 WHERE id = 1");
          }

          const insertVenta = await tx.execute(
            `INSERT INTO venta (
               obra_id, ejemplar_id, tipo, cliente_id, comprador_nombre, comprador_email, comprador_telefono,
               fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision,
               monto_neto_artista, numero_certificado, iva_porcentaje, iva_monto,
               precio_lista, motivo_descuento, tipo_cambio, retenciones_monto, aranceles_monto,
               costo_enmarcado, costo_peana, costo_embalaje, costo_transporte, costo_seguro,
               estado_pago, metodo_pago, fecha_cobro, estado_liquidacion,
               droit_suite_aplica, droit_suite_porcentaje, droit_suite_monto,
               direccion_entrega, ciudad_entrega, pais_entrega, confidencial, clausula_reventa, asesor_venta
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              obraId,
              ejemplarId,
              tipo,
              clienteId,
              compradorNombre,
              compradorEmail || null,
              compradorTelefono || null,
              fechaVenta,
              lugarVenta || null,
              valorVentaNum,
              moneda,
              aplica ? 1 : 0,
              porcentaje,
              aplica ? montoComisionNum : null,
              montoNetoArtista,
              numeroCertificado,
              ivaPorcentajeNum,
              ivaMontoNum,
              precioListaNum,
              motivoDescuentoVal,
              tipoCambioNum,
              retencionesMontoNum,
              arancelesMontoNum,
              costoEnmarcadoNum,
              costoPeanaNum,
              costoEmbalajeNum,
              costoTransporteNum,
              costoSeguroNum,
              estadoPagoVal,
              metodoPagoVal,
              fechaCobroVal,
              estadoLiquidacionVal,
              droitSuiteAplicaVal ? 1 : 0,
              droitSuitePorcentajeNum,
              droitSuiteMontoNum,
              direccionEntregaVal,
              ciudadEntregaVal,
              paisEntregaVal,
              confidencial ? 1 : 0,
              clausulaReventaVal,
              asesorVentaVal,
            ],
          );
          const ventaId = insertVenta.lastInsertId;
          const nuevoEstado = esReserva ? "reservada" : "vendida";

          if (ejemplarId) {
            await tx.execute("UPDATE ejemplar SET estado = ?, venta_id = ? WHERE id = ?", [nuevoEstado, ventaId, ejemplarId]);
            // Una obra unica es, por dentro, una serie de un solo ejemplar —
            // mantenemos obra.estado reflejando ese unico ejemplar para que
            // el resto de las pantallas (listado, etc.) lo sigan leyendo tal
            // cual sin tener que consultar ejemplares para obras unicas.
            if (!esSeriada) {
              await tx.execute("UPDATE obra SET estado = ? WHERE id = ?", [nuevoEstado, obraId]);
            }
          } else {
            await tx.execute("UPDATE obra SET estado = ? WHERE id = ?", [nuevoEstado, obraId]);
          }

          await tx.execute("INSERT INTO historial_evento (obra_id, tipo, descripcion) VALUES (?, 'venta', ?)", [
            obraId,
            esVenta
              ? `Venta registrada — certificado #${numeroCertificado}`
              : esDonacion
                ? "Donación registrada"
                : "Reserva registrada",
          ]);
        });
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="venta-form" onSubmit={handleSubmit} onKeyDown={focusNextOnEnter}>
      <h3>
        {existingVenta
          ? esVenta
            ? t("common.editarVenta")
            : esDonacion
              ? t("common.editarDonacion")
              : t("common.editarReserva")
          : t("ventaForm.tituloNuevo")}
      </h3>

      {!existingVenta && (
        <fieldset>
          <legend>{t("ventaForm.tipoLegend")}</legend>
          <label>
            <input type="radio" name="tipo-venta" checked={esVenta} onChange={() => setTipo("venta")} />
            {t("common.venta")}
          </label>
          <label>
            <input type="radio" name="tipo-venta" checked={esReserva} onChange={() => setTipo("reserva")} />
            {t("common.reserva")}
          </label>
          <label>
            <input type="radio" name="tipo-venta" checked={esDonacion} onChange={() => setTipo("donacion")} />
            {t("common.donacion")}
          </label>
        </fieldset>
      )}

      {existingVenta && esVenta && (
        <label>
          {t("ventaForm.numeroCertificado")}
          <input type="text" value={existingVenta.numeroCertificado ?? "—"} disabled readOnly />
        </label>
      )}

      <div>
        <label>
          {t("ventaForm.clienteRegistrado")}
          <div className="artista-selector-row">
            <select required value={clienteId ?? ""} onChange={(e) => handleClienteChange(e.target.value)}>
              <option value="" disabled>
                {t("ventaForm.seleccionarCliente")}
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {!addingCliente && (
              <button type="button" onClick={() => setAddingCliente(true)}>
                {t("clientes.nuevoCliente")}
              </button>
            )}
          </div>
        </label>
        {!clienteId && compradorNombre && (
          <p className="field-note">{t("ventaForm.compradorSinVincular", { nombre: compradorNombre })}</p>
        )}

        {addingCliente && (
          <div className="artista-selector-new">
            <label>
              {t("clientes.nombreLabel")}
              <input
                type="text"
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
              />
            </label>
            <label>
              {t("profile.mail")}
              <input type="email" value={nuevoClienteEmail} onChange={(e) => setNuevoClienteEmail(e.target.value)} />
            </label>
            <label>
              {t("artistas.telefono")}
              <input
                type="tel"
                value={nuevoClienteTelefono}
                onChange={(e) => setNuevoClienteTelefono(e.target.value)}
              />
            </label>
            <div className="obra-form-saved-actions">
              <button
                type="button"
                onClick={handleCrearCliente}
                disabled={!nuevoClienteNombre.trim() || creandoCliente}
              >
                {creandoCliente ? t("common.adding") : t("common.add")}
              </button>
              <button type="button" onClick={() => setAddingCliente(false)} disabled={creandoCliente}>
                {t("common.cancel")}
              </button>
            </div>
            {errorCliente && (
              <p className="error" role="alert">
                ⚠️ {errorCliente}
              </p>
            )}
          </div>
        )}
      </div>

      <fieldset>
        <legend>{t("ventaForm.entregaLegend")}</legend>
        <div className="venta-form-row-2">
          <label>
            {t("ventaForm.direccionEntregaLabel")} <HelpIcon fieldKey="direccion_entrega_venta" />
            <input type="text" value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} />
          </label>
          <label>
            {t("ventaForm.ciudadEntregaLabel")}
            <input type="text" value={ciudadEntrega} onChange={(e) => setCiudadEntrega(e.target.value)} />
          </label>
        </div>
        <label>
          {t("ventaForm.paisEntregaLabel")}
          <input type="text" value={paisEntrega} onChange={(e) => setPaisEntrega(e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("ventaForm.confidencialidadLegend")}</legend>
        <label>
          <input type="checkbox" checked={confidencial} onChange={(e) => setConfidencial(e.target.checked)} />
          {t("ventaForm.confidencialLabel")} <HelpIcon fieldKey="confidencial_venta" />
        </label>
        <label>
          {t("ventaForm.clausulaReventaLabel")} <HelpIcon fieldKey="clausula_reventa" />
          <textarea rows={3} value={clausulaReventa} onChange={(e) => setClausulaReventa(e.target.value)} />
        </label>
      </fieldset>

      <label>
        {esVenta ? t("ventaForm.fechaVenta") : esDonacion ? t("ventaForm.fechaDonacion") : t("ventaForm.fechaReserva")}{" "}
        <BotonCalendario valorIso={fechaVenta} onChangeIso={setFechaVenta} />
        <CampoFecha valorIso={fechaVenta} onChangeIso={setFechaVenta} required />
      </label>

      <label>
        {esVenta ? t("ventaForm.lugarVenta") : esDonacion ? t("ventaForm.lugarDonacion") : t("ventaForm.lugarReserva")}{" "}
        <HelpIcon fieldKey="lugar_venta" />
        <input type="text" value={lugarVenta} onChange={(e) => setLugarVenta(e.target.value)} />
      </label>

      {!esDonacion && (
        <label>
          {t("ventaForm.asesorVentaLabel")} <HelpIcon fieldKey="asesor_venta" />
          <input type="text" value={asesorVenta} onChange={(e) => setAsesorVenta(e.target.value)} />
        </label>
      )}

      {esDonacion ? (
        <p className="field-note">{t("ventaForm.notaSinValorComercial")}</p>
      ) : (
        <div className="venta-form-valor-row">
          <label>
            {t("ventaForm.moneda")}
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label>
            {esVenta ? t("ventaForm.valorVenta") : t("ventaForm.valorReserva")}
            <input type="number" min={0} step="0.01" required value={valorVenta} onChange={(e) => setValorVenta(e.target.value)} />
          </label>
        </div>
      )}

      {!esDonacion && (
        <>
          <div className="venta-form-row-2">
            <label>
              {t("ventaForm.precioListaLabel")} <HelpIcon fieldKey="precio_lista" />
              <input type="number" min={0} step="0.01" value={precioLista} onChange={(e) => setPrecioLista(e.target.value)} />
            </label>
            <label>
              {t("ventaForm.motivoDescuentoLabel")}
              <input type="text" value={motivoDescuento} onChange={(e) => setMotivoDescuento(e.target.value)} />
            </label>
          </div>

          {moneda !== "ARS" && (
            <label>
              {t("ventaForm.tipoCambioLabel")} <HelpIcon fieldKey="tipo_cambio" />
              <input type="number" min={0} step="0.0001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />
            </label>
          )}

          <fieldset>
            <legend>{t("ventaForm.costosAsociadosLegend")}</legend>
            <div className="venta-form-row-2">
              <label>
                {t("ventaForm.costoEnmarcadoLabel")}
                <input type="number" min={0} step="0.01" value={costoEnmarcado} onChange={(e) => setCostoEnmarcado(e.target.value)} />
              </label>
              <label>
                {t("ventaForm.costoPeanaLabel")}
                <input type="number" min={0} step="0.01" value={costoPeana} onChange={(e) => setCostoPeana(e.target.value)} />
              </label>
            </div>
            <div className="venta-form-row-2">
              <label>
                {t("ventaForm.costoEmbalajeLabel")}
                <input type="number" min={0} step="0.01" value={costoEmbalaje} onChange={(e) => setCostoEmbalaje(e.target.value)} />
              </label>
              <label>
                {t("ventaForm.costoTransporteLabel")}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costoTransporte}
                  onChange={(e) => setCostoTransporte(e.target.value)}
                />
              </label>
            </div>
            <label>
              {t("ventaForm.costoSeguroLabel")} <HelpIcon fieldKey="costo_seguro_venta" />
              <input type="number" min={0} step="0.01" value={costoSeguro} onChange={(e) => setCostoSeguro(e.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>{t("ventaForm.condicionPagoLegend")}</legend>
            <label>
              {t("ventaForm.estadoPagoLabel")}
              <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value as EstadoPago | "")}>
                <option value="">—</option>
                <option value="pagado">{t("ventaForm.estadoPagoPagado")}</option>
                <option value="pendiente">{t("ventaForm.estadoPagoPendiente")}</option>
                <option value="en_cuotas">{t("ventaForm.estadoPagoEnCuotas")}</option>
              </select>
            </label>
            <div className="venta-form-row-2">
              <label>
                {t("ventaForm.metodoPagoLabel")}
                <input type="text" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} />
              </label>
              {estadoPago !== "pendiente" && (
                <label>
                  {t("ventaForm.fechaCobroLabel")} <BotonCalendario valorIso={fechaCobro} onChangeIso={setFechaCobro} />
                  <CampoFecha valorIso={fechaCobro} onChangeIso={setFechaCobro} />
                </label>
              )}
            </div>
          </fieldset>
        </>
      )}

      {esGaleria && !esDonacion && (
        <>
          <label>
            <input type="checkbox" checked={aplicaComision} onChange={(e) => setAplicaComision(e.target.checked)} />
            {t("ventaForm.aplicaComision")} <HelpIcon fieldKey="aplica_comision" />
          </label>
          {aplicaComision && (
            <>
              <div className="venta-form-valor-row">
                <label>
                  {t("ventaForm.porcentajeComision")} <HelpIcon fieldKey="porcentaje_comision" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={porcentajeComision}
                    onChange={(e) => handlePorcentajeChange(e.target.value)}
                  />
                </label>
                <label>
                  {t("ventaForm.montoComision")}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={montoComision}
                    onChange={(e) => handleMontoComisionChange(e.target.value)}
                  />
                </label>
              </div>
              <label>
                {t("ventaForm.montoNetoArtista")}
                <input
                  type="text"
                  disabled
                  readOnly
                  value={`${moneda} ${redondearMonto(
                    (parseFloat(valorVenta) || 0) - (parseFloat(montoComision) || 0),
                  )}`}
                />
              </label>
              <label>
                {t("ventaForm.estadoLiquidacionLabel")} <HelpIcon fieldKey="estado_liquidacion" />
                <select
                  value={estadoLiquidacion}
                  onChange={(e) => setEstadoLiquidacion(e.target.value as EstadoLiquidacion | "")}
                >
                  <option value="">—</option>
                  <option value="pendiente">{t("ventaForm.estadoLiquidacionPendiente")}</option>
                  <option value="liquidado">{t("ventaForm.estadoLiquidacionLiquidado")}</option>
                  <option value="comprobante_emitido">{t("ventaForm.estadoLiquidacionComprobanteEmitido")}</option>
                </select>
              </label>
            </>
          )}
          <div className="venta-form-valor-row">
            <label>
              {t("ventaForm.ivaPorcentaje")} <HelpIcon fieldKey="iva_porcentaje" />
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={ivaPorcentaje}
                onChange={(e) => handleIvaPorcentajeChange(e.target.value)}
              />
            </label>
            <label>
              {t("ventaForm.ivaMonto")}
              <input
                type="number"
                min={0}
                step="0.01"
                value={ivaMonto}
                onChange={(e) => handleIvaMontoChange(e.target.value)}
              />
            </label>
          </div>
          <div className="venta-form-row-2">
            <label>
              {t("ventaForm.retencionesLabel")}
              <input
                type="number"
                min={0}
                step="0.01"
                value={retencionesMonto}
                onChange={(e) => setRetencionesMonto(e.target.value)}
              />
            </label>
            <label>
              {t("ventaForm.arancelesLabel")}
              <input
                type="number"
                min={0}
                step="0.01"
                value={arancelesMonto}
                onChange={(e) => setArancelesMonto(e.target.value)}
              />
            </label>
          </div>

          <fieldset>
            <legend>{t("ventaForm.droitSuiteLegend")}</legend>
            <label>
              <input type="checkbox" checked={droitSuiteAplica} onChange={(e) => setDroitSuiteAplica(e.target.checked)} />
              {t("ventaForm.droitSuiteAplica")} <HelpIcon fieldKey="droit_suite" />
            </label>
            {droitSuiteAplica && (
              <div className="venta-form-row-2">
                <label>
                  {t("ventaForm.droitSuitePorcentajeLabel")}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={droitSuitePorcentaje}
                    onChange={(e) => handleDroitSuitePorcentajeChange(e.target.value)}
                  />
                </label>
                <label>
                  {t("ventaForm.droitSuiteMontoLabel")}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={droitSuiteMonto}
                    onChange={(e) => handleDroitSuiteMontoChange(e.target.value)}
                  />
                </label>
              </div>
            )}
          </fieldset>
        </>
      )}

      <div className="obra-form-saved-actions">
        <button type="submit" disabled={submitting}>
          {submitting
            ? t("common.saving")
            : existingVenta
              ? t("obraDetail.guardarCambios")
              : esVenta
                ? t("ventaForm.confirmarVenta")
                : esDonacion
                  ? t("ventaForm.confirmarDonacion")
                  : t("ventaForm.confirmarReserva")}
        </button>
        <button type="button" onClick={handleVolverClick} disabled={submitting}>
          {t("common.back")}
        </button>
      </div>

      {confirmandoSalir && (
        <div className="confirm-box">
          <p>{t("ventaForm.confirmarSalirSinGuardar")}</p>
          <div className="obra-form-saved-actions">
            <button type="button" onClick={onCancel}>
              {t("ventaForm.salirSinGuardar")}
            </button>
            <button type="button" onClick={() => setConfirmandoSalir(false)}>
              {t("ventaForm.seguirEditando")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          ⚠️ {t("obraForm.errorNoSePudoGuardar", { error })}
        </p>
      )}
    </form>
  );
}

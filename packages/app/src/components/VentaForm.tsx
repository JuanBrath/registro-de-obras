import { useEffect, useState, type FormEvent } from "react";
import { calcularPorcentajeComision, type Moneda, type TipoVenta } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { HelpIcon } from "./HelpIcon.js";
import { todayISO } from "../utils/today.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";

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
}

interface ClienteOption {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
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
  const [fechaVenta, setFechaVenta] = useState(existingVenta?.fechaVenta ?? todayISO());
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  useEffect(() => {
    if (!context) return;
    context.db
      .query<ClienteOption>("SELECT id, nombre, email, telefono FROM cliente ORDER BY nombre")
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
      const nuevoCliente: ClienteOption = { id: nuevoId, nombre, email, telefono };
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

      if (existingVenta) {
        await db.transaction(async (tx) => {
          await tx.execute(
            `UPDATE venta SET
               cliente_id = ?, comprador_nombre = ?, comprador_email = ?, comprador_telefono = ?, fecha_venta = ?,
               lugar_venta = ?, valor_venta = ?, moneda = ?, aplica_comision = ?, porcentaje_comision = ?,
               monto_comision = ?, monto_neto_artista = ?, iva_porcentaje = ?, iva_monto = ?
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
               monto_neto_artista, numero_certificado, iva_porcentaje, iva_monto
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    <form className="venta-form" onSubmit={handleSubmit}>
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
            <select value={clienteId ?? ""} onChange={(e) => handleClienteChange(e.target.value)}>
              <option value="">{t("ventaForm.clienteSinRegistrar")}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {!addingCliente && (
              <button type="button" className="link-button" onClick={() => setAddingCliente(true)}>
                {t("clientes.nuevoCliente")}
              </button>
            )}
          </div>
        </label>

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

      <label>
        {esDonacion ? t("ventaForm.destinatarioDonacion") : t("ventaForm.comprador")}
        <input
          type="text"
          required
          value={compradorNombre}
          onChange={(e) => {
            setCompradorNombre(e.target.value);
            setClienteId(null);
          }}
        />
      </label>

      <label>
        {t("ventaForm.mailComprador")}
        <input type="email" value={compradorEmail} onChange={(e) => setCompradorEmail(e.target.value)} />
      </label>

      <label>
        {t("ventaForm.telefonoComprador")}
        <input type="tel" value={compradorTelefono} onChange={(e) => setCompradorTelefono(e.target.value)} />
      </label>

      <label>
        {esVenta ? t("ventaForm.fechaVenta") : esDonacion ? t("ventaForm.fechaDonacion") : t("ventaForm.fechaReserva")}
        <input type="date" required value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} />
      </label>

      <label>
        {esVenta ? t("ventaForm.lugarVenta") : esDonacion ? t("ventaForm.lugarDonacion") : t("ventaForm.lugarReserva")}{" "}
        <HelpIcon fieldKey="lugar_venta" />
        <input type="text" value={lugarVenta} onChange={(e) => setLugarVenta(e.target.value)} />
      </label>

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
        <button type="button" onClick={onCancel} disabled={submitting}>
          {t("common.cancel")}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          ⚠️ {t("obraForm.errorNoSePudoGuardar", { error })}
        </p>
      )}
    </form>
  );
}

import { useState, type FormEvent } from "react";
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  if (!context) return null;

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

      if (existingVenta) {
        await db.transaction(async (tx) => {
          await tx.execute(
            `UPDATE venta SET comprador_nombre = ?, comprador_email = ?, comprador_telefono = ?, fecha_venta = ?, lugar_venta = ?, valor_venta = ?, moneda = ?, aplica_comision = ?, porcentaje_comision = ?, monto_comision = ?, monto_neto_artista = ? WHERE id = ?`,
            [
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
            `INSERT INTO venta (obra_id, ejemplar_id, tipo, comprador_nombre, comprador_email, comprador_telefono, fecha_venta, lugar_venta, valor_venta, moneda, aplica_comision, porcentaje_comision, monto_comision, monto_neto_artista, numero_certificado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              obraId,
              ejemplarId,
              tipo,
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

      <label>
        {esDonacion ? t("ventaForm.destinatarioDonacion") : t("ventaForm.comprador")}
        <input type="text" required value={compradorNombre} onChange={(e) => setCompradorNombre(e.target.value)} />
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

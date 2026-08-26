import { useEffect, useMemo, useState } from "react";
import type { Moneda } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { useLanguage } from "../i18n/LanguageContext.js";
import { savePdfWithDialog, saveXlsxWithDialog } from "../utils/savePdfDialog.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { todayISO } from "../utils/today.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { drawPdfHeader } from "../utils/pdfBranding.js";

interface VentaReportRow {
  id: number;
  fecha_venta: string;
  artista_id: number;
  artista: string;
  obra: string;
  serie: string | null;
  valor_venta: number;
  moneda: Moneda;
  monto_comision: number | null;
  monto_neto_artista: number | null;
  asesor_venta: string | null;
  tecnica: string | null;
  costos_asociados: number;
}

interface ClienteOption {
  id: number;
  nombre: string;
}

interface ArtistaOption {
  id: number;
  nombre: string;
}

interface ReservaResumenRow {
  resultado: "cumplida" | "caida";
  cantidad: number;
}

function primerDiaMesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonto(moneda: string, valor: number): string {
  return `${moneda} ${valor.toFixed(2)}`;
}

/** Clave compuesta moneda+entidad para agrupar resumenes (un artista/tecnica puede tener ventas en mas de una moneda). */
function claveResumen(entidad: string, moneda: string): string {
  return `${entidad}__${moneda}`;
}

interface Resumen {
  etiqueta: string;
  moneda: Moneda;
  bruto: number;
  neto: number;
  margen: number;
}

function acumularResumen(map: Map<string, Resumen>, etiqueta: string, moneda: Moneda, v: VentaReportRow) {
  const clave = claveResumen(etiqueta, moneda);
  const actual = map.get(clave) ?? { etiqueta, moneda, bruto: 0, neto: 0, margen: 0 };
  const neto = v.monto_neto_artista ?? v.valor_venta;
  actual.bruto += v.valor_venta;
  actual.neto += neto;
  actual.margen += neto - v.costos_asociados;
  map.set(clave, actual);
}

export function VentasReport({ onBack }: { onBack: () => void }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  // Las fechas arrancan precargadas (mes actual) pero atenuadas: son solo una
  // sugerencia, no una eleccion del usuario. En cuanto toca cualquiera de los
  // dos campos, esa fecha deja de estar atenuada.
  const [fechaDesde, setFechaDesde] = useState(primerDiaMesActual());
  const [fechaHasta, setFechaHasta] = useState(todayISO());
  const [fechaDesdeTocada, setFechaDesdeTocada] = useState(false);
  const [fechaHastaTocada, setFechaHastaTocada] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [artistas, setArtistas] = useState<ArtistaOption[]>([]);
  const [artistaId, setArtistaId] = useState("");
  const [tecnicas, setTecnicas] = useState<string[]>([]);
  const [tecnica, setTecnica] = useState("");
  const [asesores, setAsesores] = useState<string[]>([]);
  const [asesor, setAsesor] = useState("");
  const [ventas, setVentas] = useState<VentaReportRow[]>([]);
  const [antiguedadPromedioDias, setAntiguedadPromedioDias] = useState<number | null>(null);
  const [reservasCumplidas, setReservasCumplidas] = useState(0);
  const [reservasCaidas, setReservasCaidas] = useState(0);
  const [buscado, setBuscado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfMensaje, setPdfMensaje] = useState<string | null>(null);
  useEscapeToDismiss(pdfMensaje, setPdfMensaje);
  const [generandoPlanilla, setGenerandoPlanilla] = useState(false);
  const [planillaMensaje, setPlanillaMensaje] = useState<string | null>(null);
  useEscapeToDismiss(planillaMensaje, setPlanillaMensaje);

  useEffect(() => {
    if (!context) return;
    context.db
      .query<ClienteOption>("SELECT id, nombre FROM cliente ORDER BY nombre")
      .then(setClientes)
      .catch(() => {});
    context.db
      .query<ArtistaOption>(
        `SELECT DISTINCT artista.id, artista.nombre_completo as nombre
         FROM venta JOIN obra ON obra.id = venta.obra_id JOIN artista ON artista.id = obra.artista_id
         ORDER BY artista.nombre_completo`,
      )
      .then(setArtistas)
      .catch(() => {});
    context.db
      .query<{ tecnica: string }>(
        `SELECT DISTINCT COALESCE(obra_fotografia.tecnica, obra_detalle.tecnica) as tecnica
         FROM venta
         JOIN obra ON obra.id = venta.obra_id
         LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
         LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
         WHERE COALESCE(obra_fotografia.tecnica, obra_detalle.tecnica) IS NOT NULL
         ORDER BY tecnica`,
      )
      .then((rows) => setTecnicas(rows.map((r) => r.tecnica)))
      .catch(() => {});
    context.db
      .query<{ asesor_venta: string }>(
        `SELECT DISTINCT asesor_venta FROM venta WHERE asesor_venta IS NOT NULL AND asesor_venta != '' ORDER BY asesor_venta`,
      )
      .then((rows) => setAsesores(rows.map((r) => r.asesor_venta)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function cargar() {
    if (!context || !fechaDesde || !fechaHasta) return;
    setLoading(true);
    setError(null);
    setPdfMensaje(null);
    setPlanillaMensaje(null);
    setVentas([]);
    setBuscado(true);
    try {
      const params: unknown[] = [fechaDesde, fechaHasta];
      let filtros = "";
      if (clienteId) {
        filtros += " AND venta.cliente_id = ?";
        params.push(Number(clienteId));
      }
      if (artistaId) {
        filtros += " AND artista.id = ?";
        params.push(Number(artistaId));
      }
      if (tecnica) {
        filtros += " AND COALESCE(obra_fotografia.tecnica, obra_detalle.tecnica) = ?";
        params.push(tecnica);
      }
      if (asesor) {
        filtros += " AND venta.asesor_venta = ?";
        params.push(asesor);
      }
      const rows = await context.db.query<VentaReportRow>(
        `SELECT venta.id, venta.fecha_venta, artista.id as artista_id, artista.nombre_completo as artista,
                obra.titulo as obra, ejemplar.numero as serie, venta.valor_venta, venta.moneda,
                venta.monto_comision, venta.monto_neto_artista, venta.asesor_venta,
                COALESCE(obra_fotografia.tecnica, obra_detalle.tecnica) as tecnica,
                COALESCE(venta.costo_enmarcado,0) + COALESCE(venta.costo_peana,0) + COALESCE(venta.costo_embalaje,0)
                  + COALESCE(venta.costo_transporte,0) + COALESCE(venta.costo_seguro,0) as costos_asociados
         FROM venta
         JOIN obra ON obra.id = venta.obra_id
         JOIN artista ON artista.id = obra.artista_id
         LEFT JOIN ejemplar ON ejemplar.id = venta.ejemplar_id
         LEFT JOIN obra_detalle ON obra_detalle.obra_id = obra.id
         LEFT JOIN obra_fotografia ON obra_fotografia.obra_id = obra.id
         WHERE venta.tipo = 'venta' AND venta.fecha_venta >= ? AND venta.fecha_venta <= ?${filtros}
         ORDER BY venta.fecha_venta ASC`,
        params,
      );
      setVentas(rows);

      const antiguedadRows = await context.db.query<{ promedio_dias: number | null }>(
        `SELECT AVG(julianday('now') - julianday(fecha_alta_sistema)) as promedio_dias
         FROM obra WHERE estado IN ('disponible','en_stock','exhibicion','consignacion','en_produccion')`,
      );
      setAntiguedadPromedioDias(antiguedadRows[0]?.promedio_dias ?? null);

      const reservaRows = await context.db.query<ReservaResumenRow>(
        `SELECT resultado, COUNT(*) as cantidad FROM reserva_resultado
         WHERE date(fecha_resolucion) BETWEEN ? AND ? GROUP BY resultado`,
        [fechaDesde, fechaHasta],
      );
      setReservasCumplidas(reservaRows.find((r) => r.resultado === "cumplida")?.cantidad ?? 0);
      setReservasCaidas(reservaRows.find((r) => r.resultado === "caida")?.cantidad ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const totalesPorMoneda = useMemo(() => {
    const map = new Map<Moneda, { valor: number; comision: number; neto: number }>();
    for (const v of ventas) {
      const actual = map.get(v.moneda) ?? { valor: 0, comision: 0, neto: 0 };
      actual.valor += v.valor_venta;
      actual.comision += v.monto_comision ?? 0;
      actual.neto += v.monto_neto_artista ?? v.valor_venta;
      map.set(v.moneda, actual);
    }
    return Array.from(map.entries());
  }, [ventas]);

  const resumenPorArtista = useMemo(() => {
    const map = new Map<string, Resumen>();
    for (const v of ventas) acumularResumen(map, v.artista, v.moneda, v);
    return Array.from(map.values());
  }, [ventas]);

  const resumenPorTecnica = useMemo(() => {
    const map = new Map<string, Resumen>();
    for (const v of ventas) acumularResumen(map, v.tecnica ?? "—", v.moneda, v);
    return Array.from(map.values());
  }, [ventas]);

  async function handleGenerarPdf() {
    setGenerandoPdf(true);
    setError(null);
    setPdfMensaje(null);
    try {
      // jsPDF/autotable son pesados (arrastran html2canvas, dompurify, etc.)
      // y solo hacen falta al generar el PDF, asi que se cargan recien aca en
      // vez de en el bundle principal de la app.
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginLeft = 14;
      const headerBottom = await drawPdfHeader(doc, t("ventasReport.tituloPdf"), { marginLeft });
      doc.text(
        t("ventasReport.rangoPdf", {
          desde: formatFechaDDMMYYYY(fechaDesde),
          hasta: formatFechaDDMMYYYY(fechaHasta),
        }),
        marginLeft,
        headerBottom,
      );

      autoTable(doc, {
        startY: headerBottom + 6,
        styles: { font: "Inter" },
        headStyles: { fontStyle: "normal" },
        head: [
          [
            t("ventasReport.colFecha"),
            t("ventasReport.colArtista"),
            t("ventasReport.colObra"),
            t("ventasReport.colSerie"),
            t("ventasReport.colTecnica"),
            t("ventasReport.colAsesor"),
            t("ventasReport.colValorVenta"),
            t("ventasReport.colValorComision"),
            t("ventasReport.colValorNeto"),
            t("ventasReport.colMargen"),
          ],
        ],
        body: ventas.map((v) => [
          formatFechaDDMMYYYY(v.fecha_venta),
          v.artista,
          v.obra,
          v.serie ?? "—",
          v.tecnica ?? "—",
          v.asesor_venta ?? "—",
          formatMonto(v.moneda, v.valor_venta),
          v.monto_comision != null ? formatMonto(v.moneda, v.monto_comision) : "—",
          formatMonto(v.moneda, v.monto_neto_artista ?? v.valor_venta),
          formatMonto(v.moneda, (v.monto_neto_artista ?? v.valor_venta) - v.costos_asociados),
        ]),
        foot: totalesPorMoneda.map(([moneda, totales]) => [
          "",
          "",
          "",
          "",
          "",
          `${t("ventasReport.totalLabel")} (${moneda})`,
          formatMonto(moneda, totales.valor),
          formatMonto(moneda, totales.comision),
          formatMonto(moneda, totales.neto),
          "",
        ]),
      });

      const finalY1 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? headerBottom;
      if (resumenPorArtista.length > 0) {
        doc.text(t("ventasReport.resumenPorArtistaTitulo"), marginLeft, finalY1 + 10);
        autoTable(doc, {
          startY: finalY1 + 14,
          styles: { font: "Inter" },
          headStyles: { fontStyle: "normal" },
          head: [[t("ventasReport.colArtista"), t("ventasReport.brutoLabel"), t("ventasReport.netoLabel"), t("ventasReport.margenLabel")]],
          body: resumenPorArtista.map((r) => [
            r.etiqueta,
            formatMonto(r.moneda, r.bruto),
            formatMonto(r.moneda, r.neto),
            formatMonto(r.moneda, r.margen),
          ]),
        });
      }

      const finalY2 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? finalY1;
      if (resumenPorTecnica.length > 0) {
        doc.text(t("ventasReport.resumenPorTecnicaTitulo"), marginLeft, finalY2 + 10);
        autoTable(doc, {
          startY: finalY2 + 14,
          styles: { font: "Inter" },
          headStyles: { fontStyle: "normal" },
          head: [[t("ventasReport.colTecnica"), t("ventasReport.brutoLabel"), t("ventasReport.netoLabel"), t("ventasReport.margenLabel")]],
          body: resumenPorTecnica.map((r) => [
            r.etiqueta,
            formatMonto(r.moneda, r.bruto),
            formatMonto(r.moneda, r.neto),
            formatMonto(r.moneda, r.margen),
          ]),
        });
      }

      const finalY3 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? finalY2;
      let cursorY = finalY3 + 10;
      doc.text(
        antiguedadPromedioDias != null
          ? t("ventasReport.antiguedadInventarioValor", { dias: Math.round(antiguedadPromedioDias) })
          : t("ventasReport.antiguedadInventarioSinDatos"),
        marginLeft,
        cursorY,
      );
      cursorY += 6;
      doc.text(
        `${t("ventasReport.reservasTitulo")}: ${t("ventasReport.reservasCumplidas", { cantidad: reservasCumplidas })}, ${t("ventasReport.reservasCaidas", { cantidad: reservasCaidas })}`,
        marginLeft,
        cursorY,
      );

      const bytes = new Uint8Array(doc.output("arraybuffer"));
      const guardado = await savePdfWithDialog(bytes, `informe-ventas_${fechaDesde}_${fechaHasta}.pdf`);
      if (guardado) setPdfMensaje(t("ventasReport.pdfGenerado"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function handleGenerarPlanilla() {
    setGenerandoPlanilla(true);
    setError(null);
    setPlanillaMensaje(null);
    try {
      // xlsx (SheetJS) es pesado: se carga recien aca, no en el bundle
      // principal (mismo criterio que jsPDF). Se genera un .xlsx real en vez
      // de CSV porque un CSV separado por comas no abre bien en Excel con
      // configuracion regional es-AR (usa punto y coma como separador de
      // listas y coma como separador decimal); con .xlsx los valores quedan
      // como numeros de celda reales, sin ninguna ambiguedad de formato.
      const XLSX = await import("xlsx");

      const encabezados = [
        t("ventasReport.colFecha"),
        t("ventasReport.colArtista"),
        t("ventasReport.colObra"),
        t("ventasReport.colSerie"),
        t("ventasReport.colTecnica"),
        t("ventasReport.colAsesor"),
        t("ventasReport.colMoneda"),
        t("ventasReport.colValorVenta"),
        t("ventasReport.colValorComision"),
        t("ventasReport.colValorNeto"),
        t("ventasReport.colMargen"),
      ];
      // Valores numericos reales (no texto formateado) para que sirvan para
      // sumar/calcular directamente en la planilla.
      const filas = ventas.map((v) => [
        formatFechaDDMMYYYY(v.fecha_venta),
        v.artista,
        v.obra,
        v.serie ?? "",
        v.tecnica ?? "",
        v.asesor_venta ?? "",
        v.moneda,
        v.valor_venta,
        v.monto_comision ?? "",
        v.monto_neto_artista ?? v.valor_venta,
        (v.monto_neto_artista ?? v.valor_venta) - v.costos_asociados,
      ]);
      const filasTotales = totalesPorMoneda.map(([moneda, totales]) => [
        "",
        "",
        "",
        "",
        "",
        "",
        `${t("ventasReport.totalLabel")} (${moneda})`,
        totales.valor,
        totales.comision,
        totales.neto,
        "",
      ]);

      const aoa = [encabezados, ...filas, [], ...filasTotales];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t("ventasReport.title"));

      if (resumenPorArtista.length > 0) {
        const aoaArtista = [
          [t("ventasReport.colArtista"), t("ventasReport.colMoneda"), t("ventasReport.brutoLabel"), t("ventasReport.netoLabel"), t("ventasReport.margenLabel")],
          ...resumenPorArtista.map((r) => [r.etiqueta, r.moneda, r.bruto, r.neto, r.margen]),
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoaArtista), t("ventasReport.resumenPorArtistaTitulo").slice(0, 31));
      }
      if (resumenPorTecnica.length > 0) {
        const aoaTecnica = [
          [t("ventasReport.colTecnica"), t("ventasReport.colMoneda"), t("ventasReport.brutoLabel"), t("ventasReport.netoLabel"), t("ventasReport.margenLabel")],
          ...resumenPorTecnica.map((r) => [r.etiqueta, r.moneda, r.bruto, r.neto, r.margen]),
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoaTecnica), t("ventasReport.resumenPorTecnicaTitulo").slice(0, 31));
      }

      const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

      const guardado = await saveXlsxWithDialog(
        new Uint8Array(output),
        `informe-ventas_${fechaDesde}_${fechaHasta}.xlsx`,
      );
      if (guardado) setPlanillaMensaje(t("ventasReport.planillaGenerada"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoPlanilla(false);
    }
  }

  if (!context) return null;

  return (
    <div className="obras-list">
      <div className="obras-list-header">
        <h1>{t("ventasReport.title")}</h1>
        <button type="button" onClick={onBack}>
          {t("common.back")}
        </button>
      </div>

      <form
        className="ventas-report-filtros"
        onSubmit={(e) => {
          e.preventDefault();
          cargar();
        }}
      >
        <label>
          {t("ventasReport.desde")} <HelpIcon fieldKey="ventas_fechas" />
          <input
            type="date"
            required
            className={fechaDesdeTocada ? undefined : "ventas-fecha-default"}
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setFechaDesdeTocada(true);
            }}
          />
        </label>
        <label>
          {t("ventasReport.hasta")}
          <input
            type="date"
            required
            className={fechaHastaTocada ? undefined : "ventas-fecha-default"}
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setFechaHastaTocada(true);
            }}
          />
        </label>
        {clientes.length > 0 && (
          <label>
            {t("ventasReport.cliente")}
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">{t("ventasReport.todosLosClientes")}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {artistas.length > 0 && (
          <label>
            {t("ventasReport.artista")}
            <select value={artistaId} onChange={(e) => setArtistaId(e.target.value)}>
              <option value="">{t("ventasReport.todosLosArtistas")}</option>
              {artistas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {tecnicas.length > 0 && (
          <label>
            {t("ventasReport.tecnica")}
            <select value={tecnica} onChange={(e) => setTecnica(e.target.value)}>
              <option value="">{t("ventasReport.todasLasTecnicas")}</option>
              {tecnicas.map((tec) => (
                <option key={tec} value={tec}>
                  {tec}
                </option>
              ))}
            </select>
          </label>
        )}
        {asesores.length > 0 && (
          <label>
            {t("ventasReport.asesor")}
            <select value={asesor} onChange={(e) => setAsesor(e.target.value)}>
              <option value="">{t("ventasReport.todosLosAsesores")}</option>
              {asesores.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" disabled={loading || !fechaDesde || !fechaHasta}>
          {loading ? t("common.loading") : t("ventasReport.buscar")}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}

      {buscado && !loading && ventas.length === 0 && <p>{t("ventasReport.sinVentas")}</p>}

      {buscado && !loading && (
        <div className="ventas-report-tarjetas">
          <div className="ventas-report-tarjeta">
            <strong>{t("ventasReport.antiguedadInventarioTitulo")}</strong>
            <p>
              {antiguedadPromedioDias != null
                ? t("ventasReport.antiguedadInventarioValor", { dias: Math.round(antiguedadPromedioDias) })
                : t("ventasReport.antiguedadInventarioSinDatos")}
            </p>
          </div>
          <div className="ventas-report-tarjeta">
            <strong>{t("ventasReport.reservasTitulo")}</strong>
            <p>{t("ventasReport.reservasCumplidas", { cantidad: reservasCumplidas })}</p>
            <p>{t("ventasReport.reservasCaidas", { cantidad: reservasCaidas })}</p>
          </div>
        </div>
      )}

      {ventas.length > 0 && (
        <>
          <div className="ventas-report-tabla-wrapper">
            <table className="ventas-report-tabla">
              <thead>
                <tr>
                  <th>{t("ventasReport.colFecha")}</th>
                  <th>{t("ventasReport.colArtista")}</th>
                  <th>{t("ventasReport.colObra")}</th>
                  <th>{t("ventasReport.colSerie")}</th>
                  <th>{t("ventasReport.colTecnica")}</th>
                  <th>{t("ventasReport.colAsesor")}</th>
                  <th>{t("ventasReport.colValorVenta")}</th>
                  <th>{t("ventasReport.colValorComision")}</th>
                  <th>{t("ventasReport.colValorNeto")}</th>
                  <th>{t("ventasReport.colMargen")}</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td>{formatFechaDDMMYYYY(v.fecha_venta)}</td>
                    <td>{v.artista}</td>
                    <td>{v.obra}</td>
                    <td>{v.serie ?? "—"}</td>
                    <td>{v.tecnica ?? "—"}</td>
                    <td>{v.asesor_venta ?? "—"}</td>
                    <td>{formatMonto(v.moneda, v.valor_venta)}</td>
                    <td>{v.monto_comision != null ? formatMonto(v.moneda, v.monto_comision) : "—"}</td>
                    <td>{formatMonto(v.moneda, v.monto_neto_artista ?? v.valor_venta)}</td>
                    <td>{formatMonto(v.moneda, (v.monto_neto_artista ?? v.valor_venta) - v.costos_asociados)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {totalesPorMoneda.map(([moneda, totales]) => (
                  <tr key={moneda}>
                    <td colSpan={6}>
                      {t("ventasReport.totalLabel")} ({moneda})
                    </td>
                    <td>{formatMonto(moneda, totales.valor)}</td>
                    <td>{formatMonto(moneda, totales.comision)}</td>
                    <td>{formatMonto(moneda, totales.neto)}</td>
                    <td></td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>

          {resumenPorArtista.length > 0 && (
            <div className="ventas-report-tabla-wrapper">
              <h2>{t("ventasReport.resumenPorArtistaTitulo")}</h2>
              <table className="ventas-report-tabla">
                <thead>
                  <tr>
                    <th>{t("ventasReport.colArtista")}</th>
                    <th>{t("ventasReport.brutoLabel")}</th>
                    <th>{t("ventasReport.netoLabel")}</th>
                    <th>{t("ventasReport.margenLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorArtista.map((r) => (
                    <tr key={claveResumen(r.etiqueta, r.moneda)}>
                      <td>{r.etiqueta}</td>
                      <td>{formatMonto(r.moneda, r.bruto)}</td>
                      <td>{formatMonto(r.moneda, r.neto)}</td>
                      <td>{formatMonto(r.moneda, r.margen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resumenPorTecnica.length > 0 && (
            <div className="ventas-report-tabla-wrapper">
              <h2>{t("ventasReport.resumenPorTecnicaTitulo")}</h2>
              <table className="ventas-report-tabla">
                <thead>
                  <tr>
                    <th>{t("ventasReport.colTecnica")}</th>
                    <th>{t("ventasReport.brutoLabel")}</th>
                    <th>{t("ventasReport.netoLabel")}</th>
                    <th>{t("ventasReport.margenLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorTecnica.map((r) => (
                    <tr key={claveResumen(r.etiqueta, r.moneda)}>
                      <td>{r.etiqueta}</td>
                      <td>{formatMonto(r.moneda, r.bruto)}</td>
                      <td>{formatMonto(r.moneda, r.neto)}</td>
                      <td>{formatMonto(r.moneda, r.margen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="obra-form-saved-actions">
            <button type="button" onClick={handleGenerarPdf} disabled={generandoPdf}>
              {generandoPdf ? t("common.saving") : t("ventasReport.generarPdf")}
            </button>
            <button type="button" onClick={handleGenerarPlanilla} disabled={generandoPlanilla}>
              {generandoPlanilla ? t("common.saving") : t("ventasReport.generarPlanilla")}
            </button>
          </div>
          {pdfMensaje && (
            <p className="success" role="status">
              ✅ {pdfMensaje}
            </p>
          )}
          {planillaMensaje && (
            <p className="success" role="status">
              ✅ {planillaMensaje}
            </p>
          )}
        </>
      )}
    </div>
  );
}

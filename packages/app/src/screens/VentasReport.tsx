import { useMemo, useState } from "react";
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
  artista: string;
  obra: string;
  serie: string | null;
  valor_venta: number;
  moneda: Moneda;
  monto_comision: number | null;
}

function primerDiaMesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonto(moneda: string, valor: number): string {
  return `${moneda} ${valor.toFixed(2)}`;
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
  const [ventas, setVentas] = useState<VentaReportRow[]>([]);
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

  async function cargar() {
    if (!context || !fechaDesde || !fechaHasta) return;
    setLoading(true);
    setError(null);
    setPdfMensaje(null);
    setPlanillaMensaje(null);
    setVentas([]);
    setBuscado(true);
    try {
      const rows = await context.db.query<VentaReportRow>(
        `SELECT venta.id, venta.fecha_venta, artista.nombre_completo as artista, obra.titulo as obra,
                ejemplar.numero as serie, venta.valor_venta, venta.moneda, venta.monto_comision
         FROM venta
         JOIN obra ON obra.id = venta.obra_id
         JOIN artista ON artista.id = obra.artista_id
         LEFT JOIN ejemplar ON ejemplar.id = venta.ejemplar_id
         WHERE venta.tipo = 'venta' AND venta.fecha_venta >= ? AND venta.fecha_venta <= ?
         ORDER BY venta.fecha_venta ASC`,
        [fechaDesde, fechaHasta],
      );
      setVentas(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const totalesPorMoneda = useMemo(() => {
    const map = new Map<Moneda, { valor: number; comision: number }>();
    for (const v of ventas) {
      const actual = map.get(v.moneda) ?? { valor: 0, comision: 0 };
      actual.valor += v.valor_venta;
      actual.comision += v.monto_comision ?? 0;
      map.set(v.moneda, actual);
    }
    return Array.from(map.entries());
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
            t("ventasReport.colValorVenta"),
            t("ventasReport.colValorComision"),
          ],
        ],
        body: ventas.map((v) => [
          formatFechaDDMMYYYY(v.fecha_venta),
          v.artista,
          v.obra,
          v.serie ?? "—",
          formatMonto(v.moneda, v.valor_venta),
          v.monto_comision != null ? formatMonto(v.moneda, v.monto_comision) : "—",
        ]),
        foot: totalesPorMoneda.map(([moneda, totales]) => [
          "",
          "",
          "",
          `${t("ventasReport.totalLabel")} (${moneda})`,
          formatMonto(moneda, totales.valor),
          formatMonto(moneda, totales.comision),
        ]),
      });

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
        t("ventasReport.colMoneda"),
        t("ventasReport.colValorVenta"),
        t("ventasReport.colValorComision"),
      ];
      // Valores numericos reales (no texto formateado) para que sirvan para
      // sumar/calcular directamente en la planilla.
      const filas = ventas.map((v) => [
        formatFechaDDMMYYYY(v.fecha_venta),
        v.artista,
        v.obra,
        v.serie ?? "",
        v.moneda,
        v.valor_venta,
        v.monto_comision ?? "",
      ]);
      const filasTotales = totalesPorMoneda.map(([moneda, totales]) => [
        "",
        "",
        "",
        "",
        `${t("ventasReport.totalLabel")} (${moneda})`,
        totales.valor,
        totales.comision,
      ]);

      const aoa = [encabezados, ...filas, [], ...filasTotales];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t("ventasReport.title"));
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
                  <th>{t("ventasReport.colValorVenta")}</th>
                  <th>{t("ventasReport.colValorComision")}</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td>{formatFechaDDMMYYYY(v.fecha_venta)}</td>
                    <td>{v.artista}</td>
                    <td>{v.obra}</td>
                    <td>{v.serie ?? "—"}</td>
                    <td>{formatMonto(v.moneda, v.valor_venta)}</td>
                    <td>{v.monto_comision != null ? formatMonto(v.moneda, v.monto_comision) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {totalesPorMoneda.map(([moneda, totales]) => (
                  <tr key={moneda}>
                    <td colSpan={4}>
                      {t("ventasReport.totalLabel")} ({moneda})
                    </td>
                    <td>{formatMonto(moneda, totales.valor)}</td>
                    <td>{formatMonto(moneda, totales.comision)}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>

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

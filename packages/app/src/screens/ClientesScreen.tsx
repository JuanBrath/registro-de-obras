import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TipoCliente } from "@registro/core";
import { useWorkspace } from "../state/WorkspaceContext.js";
import { LinkField } from "../components/LinkField.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { InformesModal } from "../components/InformesModal.js";
import { useLanguage, type TranslationKey } from "../i18n/LanguageContext.js";
import { useEscapeToDismiss } from "../utils/useEscapeToDismiss.js";
import { buildMailtoUrl } from "../utils/socialLinks.js";
import { focusNextOnEnter } from "../utils/focusNextOnEnter.js";
import { formatFechaDDMMYYYY } from "../utils/formatFecha.js";
import { todayISO } from "../utils/today.js";
import { savePdfWithDialog } from "../utils/savePdfDialog.js";
import type { FirmaEleccion } from "../utils/pdfBranding.js";
import { tInforme, type InformeIdioma } from "../reports/informeIdioma.js";
import { resolveFirmaBytes, resolveMembreteLogoBytes, resolveLocalidad } from "../reports/reportBranding.js";
import {
  buildClienteConDatosPdfBytes,
  buildClienteEnBlancoPdfBytes,
  buildClienteHistorialPdfBytes,
  buildClientesFichaPdfBytes,
  type ClienteHistorialVentaRow,
  type ClienteReporteDatos,
} from "../reports/clienteReports.js";
import { buildObrasListadoPdfBytes } from "../reports/obrasListadoReports.js";

function primerDiaMesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}

const TIPOS_CLIENTE: { value: TipoCliente; labelKey: TranslationKey }[] = [
  { value: "ColeccionistaPrivado", labelKey: "clientes.tipoColeccionistaPrivado" },
  { value: "GaleriaDealer", labelKey: "clientes.tipoGaleriaDealer" },
  { value: "EmpresaInstitucion", labelKey: "clientes.tipoEmpresaInstitucion" },
  { value: "DecoradorArquitecto", labelKey: "clientes.tipoDecoradorArquitecto" },
];

interface ClienteRow {
  id: number;
  nombre: string;
  tipo_cliente: string | null;
  domicilio: string | null;
  ciudad: string | null;
  pais: string | null;
  email: string | null;
  telefono: string | null;
  cuit: string | null;
  perfil_intereses: string | null;
  notas: string | null;
}

export interface ClienteFields {
  nombre: string;
  tipoCliente: string;
  domicilio: string;
  ciudad: string;
  pais: string;
  email: string;
  telefono: string;
  cuit: string;
  perfilIntereses: string;
  notas: string;
}

export function ClientesScreen({ onBack }: { onBack: () => void }) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [nombre, setNombre] = useState("");
  const [tipoCliente, setTipoCliente] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cuit, setCuit] = useState("");
  const [perfilIntereses, setPerfilIntereses] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEscapeToDismiss(formError, setFormError);
  const [mostrandoAlta, setMostrandoAlta] = useState(false);
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [fichaModo, setFichaModo] = useState<"consultar" | "editar">("consultar");

  const [informesListaAbierta, setInformesListaAbierta] = useState(false);
  const [informeListaSeleccionId, setInformeListaSeleccionId] = useState("blanco");
  const [informeListaIdioma, setInformeListaIdioma] = useState<InformeIdioma>("es");
  const [informeListaIncluirLogo, setInformeListaIncluirLogo] = useState(true);
  const [informeListaIncluirFecha, setInformeListaIncluirFecha] = useState(true);
  const [informeListaFirma, setInformeListaFirma] = useState<FirmaEleccion>("ninguna");
  const [informeListaFirmaBytes, setInformeListaFirmaBytes] = useState<Uint8Array | null>(null);
  const [informeListaGenerando, setInformeListaGenerando] = useState(false);
  const [informeListaMensaje, setInformeListaMensaje] = useState<string | null>(null);
  useEscapeToDismiss(informeListaMensaje, setInformeListaMensaje);

  async function handleAbrirInformesLista() {
    setInformeListaSeleccionId("blanco");
    setInformeListaIdioma(idioma);
    setInformeListaIncluirLogo(true);
    setInformeListaIncluirFecha(true);
    setInformeListaFirma("ninguna");
    setInformeListaMensaje(null);
    setInformeListaFirmaBytes(context ? await resolveFirmaBytes(context, personalArtista, galeriaPerfil) : null);
    setInformesListaAbierta(true);
  }

  function clienteRowAReporteDatos(c: ClienteRow): ClienteReporteDatos {
    return {
      nombre: c.nombre,
      tipoCliente: c.tipo_cliente ?? "",
      domicilio: c.domicilio ?? "",
      ciudad: c.ciudad ?? "",
      pais: c.pais ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      cuit: c.cuit ?? "",
      perfilIntereses: c.perfil_intereses ?? "",
      notas: c.notas ?? "",
    };
  }

  async function handleGenerarInformeLista() {
    if (!context) return;
    setInformeListaGenerando(true);
    setError(null);
    try {
      const logoBytes = await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil);
      const localidad = resolveLocalidad(context, personalArtista, galeriaPerfil);
      const opts = {
        idioma: informeListaIdioma,
        logoBytes,
        incluirLogo: informeListaIncluirLogo,
        incluirFecha: informeListaIncluirFecha,
        firma: informeListaFirma,
        firmaBytes: informeListaFirmaBytes,
        localidad,
      };

      let bytes: Uint8Array;
      let nombreArchivo: string;

      if (informeListaSeleccionId === "listado") {
        const tr = (key: TranslationKey, vars?: Record<string, string | number>) => tInforme(informeListaIdioma, key, vars);
        const headers = [
          tr("clientes.colNombre"),
          tr("clientes.colTipoCliente"),
          tr("clientes.colTelefono"),
          tr("clientes.colEmail"),
          tr("clientes.colCiudad"),
          tr("clientes.colPais"),
        ];
        const items = filteredClientes.map((c) => {
          const tipoKey = TIPOS_CLIENTE.find((tc) => tc.value === c.tipo_cliente)?.labelKey;
          return {
            celdas: [
              c.nombre,
              tipoKey ? tInforme("es", tipoKey) : "—",
              c.telefono ?? "—",
              c.email ?? "—",
              c.ciudad ?? "—",
              c.pais ?? "—",
            ],
          };
        });
        bytes = await buildObrasListadoPdfBytes(t("clientes.title"), headers, items, false, opts);
        nombreArchivo = "listado_clientes.pdf";
      } else if (informeListaSeleccionId === "ficha_busqueda") {
        bytes = await buildClientesFichaPdfBytes(filteredClientes.map(clienteRowAReporteDatos), opts);
        nombreArchivo = "ficha_clientes.pdf";
      } else {
        bytes = await buildClienteEnBlancoPdfBytes("", false, opts);
        nombreArchivo = "ficha_cliente_en_blanco.pdf";
      }

      const guardado = await savePdfWithDialog(bytes, nombreArchivo);
      if (guardado) {
        setInformesListaAbierta(false);
        setInformeListaMensaje(t("clientes.informeGenerado"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInformeListaGenerando(false);
    }
  }

  function resetForm() {
    setNombre("");
    setTipoCliente("");
    setDomicilio("");
    setCiudad("");
    setPais("");
    setEmail("");
    setTelefono("");
    setCuit("");
    setPerfilIntereses("");
    setNotas("");
    setFormError(null);
  }

  async function reload() {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await context.db.query<ClienteRow>(
        "SELECT id, nombre, tipo_cliente, domicilio, ciudad, pais, email, telefono, cuit, perfil_intereses, notas FROM cliente ORDER BY nombre",
      );
      setClientes(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await context!.db.execute(
        `INSERT INTO cliente (nombre, tipo_cliente, domicilio, ciudad, pais, email, telefono, cuit, perfil_intereses, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          tipoCliente || null,
          domicilio || null,
          ciudad || null,
          pais || null,
          email || null,
          telefono || null,
          cuit || null,
          perfilIntereses || null,
          notas || null,
        ],
      );
      resetForm();
      setMostrandoAlta(false);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelarAlta() {
    resetForm();
    setMostrandoAlta(false);
  }

  function handleVolver() {
    if (mostrandoAlta) {
      handleCancelarAlta();
      return;
    }
    if (fichaId !== null) {
      setFichaId(null);
      return;
    }
    onBack();
  }

  async function handleDeleteCliente(id: number) {
    if (!context) return;
    await context.db.execute("DELETE FROM cliente WHERE id = ?", [id]);
    await reload();
  }

  async function handleUpdateCliente(id: number, fields: ClienteFields) {
    if (!context) return;
    await context.db.execute(
      `UPDATE cliente SET nombre = ?, tipo_cliente = ?, domicilio = ?, ciudad = ?, pais = ?, email = ?, telefono = ?, cuit = ?, perfil_intereses = ?, notas = ? WHERE id = ?`,
      [
        fields.nombre,
        fields.tipoCliente || null,
        fields.domicilio || null,
        fields.ciudad || null,
        fields.pais || null,
        fields.email || null,
        fields.telefono || null,
        fields.cuit || null,
        fields.perfilIntereses || null,
        fields.notas || null,
        id,
      ],
    );
    setFichaId(null);
    await reload();
  }

  const filteredClientes = useMemo(() => {
    const busquedaNorm = busqueda.trim().toLowerCase();
    if (!busquedaNorm) return clientes;
    return clientes.filter((c) =>
      [c.nombre, c.email, c.telefono, c.domicilio, c.ciudad, c.pais, c.cuit, c.perfil_intereses, c.notas].some((campo) =>
        (campo ?? "").toLowerCase().includes(busquedaNorm),
      ),
    );
  }, [clientes, busqueda]);

  if (!context) return null;

  return (
    <div>
      <div className="obras-list-header">
        <h1>{t("clientes.title")}</h1>
        <div className="header-actions">
          {!mostrandoAlta && fichaId === null && (
            <>
              <button type="button" onClick={() => setMostrandoAlta(true)}>
                {t("clientes.nuevoCliente")}
              </button>
              <button type="button" onClick={handleAbrirInformesLista}>
                {t("clientes.generarInformes")}
              </button>
            </>
          )}
          <button type="button" onClick={handleVolver}>
            {t("common.back")}
          </button>
        </div>
      </div>

      {informeListaMensaje && fichaId === null && !mostrandoAlta && (
        <p className="success" role="status">
          ✅ {informeListaMensaje}
        </p>
      )}

      {informesListaAbierta && (
        <InformesModal
          titulo={t("clientes.generarInformes")}
          opciones={[
            { id: "blanco", label: t("clientes.informeOpcionBlancoCliente") },
            { id: "listado", label: t("clientes.informeOpcionListado") },
            {
              id: "ficha_busqueda",
              label: t("clientes.informeOpcionFichaBusqueda"),
              extra:
                filteredClientes.length === 0 ? (
                  <p className="field-note">{t("clientes.fichaBusquedaSinResultados")}</p>
                ) : (
                  <p className="field-note">
                    {t("clientes.fichaBusquedaCantidad", { cantidad: filteredClientes.length })}
                  </p>
                ),
            },
          ]}
          selectedId={informeListaSeleccionId}
          onSelectId={setInformeListaSeleccionId}
          idioma={informeListaIdioma}
          onIdiomaChange={setInformeListaIdioma}
          incluirLogo={informeListaIncluirLogo}
          onIncluirLogoChange={setInformeListaIncluirLogo}
          incluirFecha={informeListaIncluirFecha}
          onIncluirFechaChange={setInformeListaIncluirFecha}
          firma={informeListaFirma}
          onFirmaChange={setInformeListaFirma}
          firmaDigitalDisponible={informeListaFirmaBytes !== null}
          onGenerar={handleGenerarInformeLista}
          generando={informeListaGenerando}
          disabled={informeListaSeleccionId === "ficha_busqueda" && filteredClientes.length === 0}
          onClose={() => setInformesListaAbierta(false)}
        />
      )}

      {mostrandoAlta && (
        <form className="obra-form" onSubmit={handleSubmit} onKeyDown={focusNextOnEnter}>
          <h2>{t("clientes.nuevoClienteTitulo")}</h2>

          <label>
            <span className="field-label">{t("clientes.nombreLabel")}</span>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("clientes.tipoClienteLabel")}</span>
            <select value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)}>
              <option value="">—</option>
              {TIPOS_CLIENTE.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {t(tipo.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("clientes.domicilioLabel")}</span>
              <input type="text" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} />
            </label>

            <label>
              <span className="field-label">{t("clientes.ciudadLabel")}</span>
              <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </label>
          </div>

          <label>
            <span className="field-label">{t("clientes.paisLabel")}</span>
            <input type="text" value={pais} onChange={(e) => setPais(e.target.value)} />
          </label>

          <div className="form-row-2">
            <label>
              <span className="field-label">{t("profile.mail")}</span>
              <LinkField type="email" value={email} onChange={setEmail} buildUrl={buildMailtoUrl} />
            </label>

            <label>
              <span className="field-label">{t("artistas.telefono")}</span>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>
          </div>

          <label>
            <span className="field-label">{t("common.cuit")}</span>
            <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </label>

          <label>
            <span className="field-label">
              {t("clientes.perfilInteresesLabel")} <HelpIcon fieldKey="perfil_intereses" />
            </span>
            <textarea rows={3} value={perfilIntereses} onChange={(e) => setPerfilIntereses(e.target.value)} />
          </label>

          <label>
            <span className="field-label">{t("artistas.notas")}</span>
            <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </label>

          <div className="obra-form-saved-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? t("common.saving") : t("clientes.agregarCliente")}
            </button>
            <button type="button" onClick={handleCancelarAlta} disabled={submitting}>
              {t("common.cancel")}
            </button>
          </div>

          {formError && (
            <p className="error" role="alert">
              ⚠️ {t("obraForm.errorNoSePudoGuardar", { error: formError })}
            </p>
          )}
        </form>
      )}

      {!mostrandoAlta && (
        <div className="obras-list">
          {fichaId === null && <h2>{t("clientes.clientesRegistrados")}</h2>}
          {loading && <p>{t("common.loading")}</p>}
          {error && (
            <p className="error" role="alert">
              ⚠️ {error}
            </p>
          )}
          {!loading && clientes.length === 0 && <p>{t("clientes.sinClientes")}</p>}

          {clientes.length > 0 && fichaId === null && (
            <div className="buscador-con-ayuda">
              <input type="search" className="obras-list-buscador" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <HelpIcon fieldKey="busqueda_general" />
            </div>
          )}

          {!loading && clientes.length > 0 && filteredClientes.length === 0 && <p>{t("artistas.sinResultados")}</p>}

          <div className="artistas-list">
            {filteredClientes
              .filter((c) => fichaId === null || c.id === fichaId)
              .map((c) => (
                <ClienteRowView
                  key={c.id}
                  cliente={c}
                  modo={fichaId === c.id ? fichaModo : "compacto"}
                  onConsultar={() => {
                    setFichaId(c.id);
                    setFichaModo("consultar");
                  }}
                  onEditar={() => {
                    setFichaId(c.id);
                    setFichaModo("editar");
                  }}
                  onCerrarFicha={() => setFichaId(null)}
                  onDelete={() => handleDeleteCliente(c.id)}
                  onSave={(fields) => handleUpdateCliente(c.id, fields)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteRowView({
  cliente,
  modo,
  onConsultar,
  onEditar,
  onCerrarFicha,
  onDelete,
  onSave,
}: {
  cliente: ClienteRow;
  modo: "compacto" | "consultar" | "editar";
  onConsultar: () => void;
  onEditar: () => void;
  onCerrarFicha: () => void;
  onDelete: () => Promise<void>;
  onSave: (fields: ClienteFields) => Promise<void>;
}) {
  const { context, personalArtista, galeriaPerfil } = useWorkspace();
  const { t, idioma } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeToDismiss(error, setError);

  const [informesMenuAbierto, setInformesMenuAbierto] = useState(false);
  const [informeSeleccionId, setInformeSeleccionId] = useState("conDatos");
  const [informeIdioma, setInformeIdioma] = useState<InformeIdioma>("es");
  const [informeIncluirLogo, setInformeIncluirLogo] = useState(true);
  const [informeFirma, setInformeFirma] = useState<FirmaEleccion>("ninguna");
  const [firmaBytesDisponibles, setFirmaBytesDisponibles] = useState<Uint8Array | null>(null);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [informeMensaje, setInformeMensaje] = useState<string | null>(null);
  useEscapeToDismiss(informeMensaje, setInformeMensaje);
  const [historialFechaDesde, setHistorialFechaDesde] = useState(primerDiaMesActual());
  const [historialFechaHasta, setHistorialFechaHasta] = useState(todayISO());

  const [activeTab, setActiveTab] = useState<"datos" | "historial">("datos");
  const [nombre, setNombre] = useState(cliente.nombre);
  const [tipoCliente, setTipoCliente] = useState(cliente.tipo_cliente ?? "");
  const [domicilio, setDomicilio] = useState(cliente.domicilio ?? "");
  const [ciudad, setCiudad] = useState(cliente.ciudad ?? "");
  const [pais, setPais] = useState(cliente.pais ?? "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [cuit, setCuit] = useState(cliente.cuit ?? "");
  const [perfilIntereses, setPerfilIntereses] = useState(cliente.perfil_intereses ?? "");
  const [notas, setNotas] = useState(cliente.notas ?? "");

  async function handleGuardar() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nombre, tipoCliente, domicilio, ciudad, pais, email, telefono, cuit, perfilIntereses, notas });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  async function handleAbrirInformesMenu() {
    setInformeSeleccionId("conDatos");
    setInformeIdioma(idioma);
    setInformeIncluirLogo(true);
    setInformeFirma("ninguna");
    setHistorialFechaDesde(primerDiaMesActual());
    setHistorialFechaHasta(todayISO());
    setInformeMensaje(null);
    setFirmaBytesDisponibles(context ? await resolveFirmaBytes(context, personalArtista, galeriaPerfil) : null);
    setInformesMenuAbierto(true);
  }

  async function handleGenerarInforme() {
    if (!context) return;
    setGenerandoInforme(true);
    setError(null);
    setInformeMensaje(null);
    try {
      const logoBytes = await resolveMembreteLogoBytes(context, personalArtista, galeriaPerfil);
      const brandOpts = {
        idioma: informeIdioma,
        logoBytes,
        incluirLogo: informeIncluirLogo,
        firma: informeFirma,
        firmaBytes: firmaBytesDisponibles,
      };
      const base = cliente.nombre.trim().replace(/[^a-zA-Z0-9]+/g, "_") || "cliente";
      let bytes: Uint8Array;
      let nombreArchivo: string;

      if (informeSeleccionId === "conDatos") {
        bytes = await buildClienteConDatosPdfBytes(
          {
            nombre: cliente.nombre,
            tipoCliente: cliente.tipo_cliente ?? "",
            domicilio: cliente.domicilio ?? "",
            ciudad: cliente.ciudad ?? "",
            pais: cliente.pais ?? "",
            email: cliente.email ?? "",
            telefono: cliente.telefono ?? "",
            cuit: cliente.cuit ?? "",
            perfilIntereses: cliente.perfil_intereses ?? "",
            notas: cliente.notas ?? "",
          },
          brandOpts,
        );
        nombreArchivo = `cliente_${base}.pdf`;
      } else if (informeSeleccionId === "blancoInterno") {
        bytes = await buildClienteEnBlancoPdfBytes(cliente.nombre, true, brandOpts);
        nombreArchivo = `cliente_${base}_completar.pdf`;
      } else if (informeSeleccionId === "blancoCliente") {
        bytes = await buildClienteEnBlancoPdfBytes(cliente.nombre, false, brandOpts);
        nombreArchivo = "ficha_cliente_completar.pdf";
      } else {
        const rows = await context.db.query<ClienteHistorialVentaRow>(
          `SELECT venta.fecha_venta, obra.titulo as obra_titulo, ejemplar.numero as ejemplar_numero,
                  ejemplar.soporte_impresion, ejemplar.dimensiones, venta.valor_venta, venta.moneda, venta.numero_certificado
           FROM venta
           JOIN obra ON obra.id = venta.obra_id
           LEFT JOIN ejemplar ON ejemplar.id = venta.ejemplar_id
           WHERE venta.cliente_id = ? AND venta.fecha_venta BETWEEN ? AND ?
           ORDER BY venta.fecha_venta DESC`,
          [cliente.id, historialFechaDesde, historialFechaHasta],
        );
        bytes = await buildClienteHistorialPdfBytes(cliente.nombre, rows, historialFechaDesde, historialFechaHasta, brandOpts);
        nombreArchivo = `historial_compras_${base}.pdf`;
      }

      const guardado = await savePdfWithDialog(bytes, nombreArchivo);
      if (guardado) {
        setInformesMenuAbierto(false);
        setInformeMensaje(t("clientes.informeGenerado"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoInforme(false);
    }
  }

  const informeOpciones = [
    { id: "conDatos", label: t("clientes.informeOpcionConDatos") },
    { id: "blancoInterno", label: t("clientes.informeOpcionBlancoInterno") },
    { id: "blancoCliente", label: t("clientes.informeOpcionBlancoCliente") },
    {
      id: "historial",
      label: t("clientes.informeOpcionHistorial"),
      extra: (
        <div className="form-row-2">
          <label>
            <span className="field-label">{t("clientes.historialFechasDesde")}</span>
            <input type="date" value={historialFechaDesde} onChange={(e) => setHistorialFechaDesde(e.target.value)} />
          </label>
          <label>
            <span className="field-label">{t("clientes.historialFechasHasta")}</span>
            <input type="date" value={historialFechaHasta} onChange={(e) => setHistorialFechaHasta(e.target.value)} />
          </label>
        </div>
      ),
    },
  ];

  if (modo !== "compacto") {
    const soloLectura = modo === "consultar";
    return (
      <div className="ejemplar-row ejemplar-row-editing" onKeyDown={focusNextOnEnter}>
        <h2>{cliente.nombre}</h2>

        <div className="cliente-tabs">
          <button
            type="button"
            className={`cliente-tab-button${activeTab === "datos" ? " cliente-tab-button-active" : ""}`}
            onClick={() => setActiveTab("datos")}
          >
            {t("clientes.datosTab")}
          </button>
          <button
            type="button"
            className={`cliente-tab-button${activeTab === "historial" ? " cliente-tab-button-active" : ""}`}
            onClick={() => setActiveTab("historial")}
          >
            {t("clientes.historialTab")}
          </button>
        </div>

        {activeTab === "historial" && (
          <>
            <HistorialCompras clienteId={cliente.id} />
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleAbrirInformesMenu}>
                {t("common.generarInforme")}
              </button>
              <button type="button" onClick={onCerrarFicha}>
                {t("common.close")}
              </button>
            </div>
          </>
        )}

        {activeTab === "datos" && (
          <>
            <label>
              <span className="field-label">{t("clientes.nombreLabel")}</span>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("clientes.tipoClienteLabel")}</span>
              <select value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)} disabled={soloLectura}>
                <option value="">—</option>
                {TIPOS_CLIENTE.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {t(tipo.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row-2">
              <label>
                <span className="field-label">{t("clientes.domicilioLabel")}</span>
                <input
                  type="text"
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  disabled={soloLectura}
                />
              </label>
              <label>
                <span className="field-label">{t("clientes.ciudadLabel")}</span>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  disabled={soloLectura}
                />
              </label>
            </div>
            <label>
              <span className="field-label">{t("clientes.paisLabel")}</span>
              <input type="text" value={pais} onChange={(e) => setPais(e.target.value)} disabled={soloLectura} />
            </label>
            <div className="form-row-2">
              <label>
                <span className="field-label">{t("profile.mail")}</span>
                <LinkField
                  type="email"
                  value={email}
                  onChange={setEmail}
                  buildUrl={buildMailtoUrl}
                  disabled={soloLectura}
                />
              </label>
              <label>
                <span className="field-label">{t("artistas.telefono")}</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={soloLectura}
                />
              </label>
            </div>
            <label>
              <span className="field-label">{t("common.cuit")}</span>
              <input type="text" value={cuit} onChange={(e) => setCuit(e.target.value)} disabled={soloLectura} />
            </label>
            <label>
              <span className="field-label">
                {t("clientes.perfilInteresesLabel")} <HelpIcon fieldKey="perfil_intereses" />
              </span>
              <textarea
                rows={3}
                value={perfilIntereses}
                onChange={(e) => setPerfilIntereses(e.target.value)}
                disabled={soloLectura}
              />
            </label>
            <label>
              <span className="field-label">{t("artistas.notas")}</span>
              <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} disabled={soloLectura} />
            </label>
            <div className="obra-form-saved-actions">
              <button type="button" onClick={handleAbrirInformesMenu}>
                {t("common.generarInforme")}
              </button>
              {soloLectura ? (
                <button type="button" onClick={onCerrarFicha}>
                  {t("common.close")}
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleGuardar} disabled={saving}>
                    {saving ? t("common.saving") : t("common.save")}
                  </button>
                  <button type="button" onClick={onCerrarFicha} disabled={saving}>
                    {t("common.cancel")}
                  </button>
                </>
              )}
            </div>
            {informeMensaje && (
              <p className="success" role="status">
                ✅ {informeMensaje}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                ⚠️ {error}
              </p>
            )}
          </>
        )}

        {informesMenuAbierto && (
          <InformesModal
            titulo={t("informes.tituloDe", { nombre: cliente.nombre })}
            opciones={informeOpciones}
            selectedId={informeSeleccionId}
            onSelectId={setInformeSeleccionId}
            idioma={informeIdioma}
            onIdiomaChange={setInformeIdioma}
            incluirLogo={informeIncluirLogo}
            onIncluirLogoChange={setInformeIncluirLogo}
            firma={informeFirma}
            onFirmaChange={setInformeFirma}
            firmaDigitalDisponible={firmaBytesDisponibles !== null}
            onGenerar={handleGenerarInforme}
            generando={generandoInforme}
            onClose={() => setInformesMenuAbierto(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="ejemplar-row">
      <strong>{cliente.nombre}</strong>
      {cliente.tipo_cliente && (
        <span>{t(TIPOS_CLIENTE.find((tipo) => tipo.value === cliente.tipo_cliente)?.labelKey ?? "clientes.tipoClienteLabel")}</span>
      )}
      {cliente.telefono && (
        <span>
          <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>
        </span>
      )}
      <div className="obra-form-saved-actions cliente-compacto-acciones">
        <button type="button" onClick={onConsultar}>
          {t("common.consultar")}
        </button>
        <button type="button" onClick={onEditar}>
          {t("common.edit")}
        </button>
        <button type="button" onClick={() => setConfirming(true)}>
          {t("common.delete")}
        </button>
      </div>
      {confirming && (
        <div className="confirm-box">
          <p>{t("clientes.confirmarEliminar")}</p>
          <div className="obra-form-saved-actions">
            <button type="button" onClick={handleEliminar} disabled={deleting}>
              {deleting ? t("common.deleting") : t("common.siEliminar")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
              {t("common.no")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

interface VentaHistorialRow {
  id: number;
  fecha_venta: string;
  obra_titulo: string;
  ejemplar_numero: string | null;
  soporte_impresion: string | null;
  dimensiones: string | null;
  valor_venta: number;
  moneda: string;
  numero_certificado: number | null;
}

function formatMontoHistorial(moneda: string, valor: number): string {
  return `${moneda} ${valor.toFixed(2)}`;
}

function HistorialCompras({ clienteId }: { clienteId: number }) {
  const { context } = useWorkspace();
  const { t } = useLanguage();
  const [ventas, setVentas] = useState<VentaHistorialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    setLoading(true);
    context.db
      .query<VentaHistorialRow>(
        `SELECT venta.id, venta.fecha_venta, obra.titulo as obra_titulo, ejemplar.numero as ejemplar_numero,
                ejemplar.soporte_impresion, ejemplar.dimensiones, venta.valor_venta, venta.moneda, venta.numero_certificado
         FROM venta
         JOIN obra ON obra.id = venta.obra_id
         LEFT JOIN ejemplar ON ejemplar.id = venta.ejemplar_id
         WHERE venta.cliente_id = ?
         ORDER BY venta.fecha_venta DESC`,
        [clienteId],
      )
      .then((rows) => {
        if (!cancelled) setVentas(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [context, clienteId]);

  if (loading) return <p>{t("common.loading")}</p>;
  if (ventas.length === 0) return <p>{t("clientes.historialSinCompras")}</p>;

  return (
    <div className="ventas-report-tabla-wrapper">
      <table className="ventas-report-tabla">
        <thead>
          <tr>
            <th>{t("clientes.historialColFecha")}</th>
            <th>{t("clientes.historialColObra")}</th>
            <th>{t("clientes.historialColEjemplar")}</th>
            <th>{t("clientes.historialColFormatoSoporte")}</th>
            <th>{t("clientes.historialColMontoFinal")}</th>
            <th>{t("clientes.historialColEstadoCoa")}</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td>{formatFechaDDMMYYYY(v.fecha_venta)}</td>
              <td>{v.obra_titulo}</td>
              <td>{v.ejemplar_numero ?? "—"}</td>
              <td>{[v.soporte_impresion, v.dimensiones].filter(Boolean).join(" — ") || "—"}</td>
              <td>{formatMontoHistorial(v.moneda, v.valor_venta)}</td>
              <td>
                {v.numero_certificado != null
                  ? t("clientes.certificadoEmitido", { numero: v.numero_certificado })
                  : t("clientes.certificadoPendiente")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

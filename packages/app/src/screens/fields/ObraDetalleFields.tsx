import { derivarEsSeriadaObraGrafica, type CategoriaObra, type SubtipoObraGrafica } from "@registro/core";
import { HelpIcon } from "../../components/HelpIcon.js";
import { todayISO } from "../../utils/today.js";
import { useLanguage, type TranslationKey } from "../../i18n/LanguageContext.js";

export type CategoriaObraDetalle = Exclude<CategoriaObra, "Fotografia">;

export interface ObraDetalleFieldsState {
  subtipo: string;
  /** Solo aplica a Pintura/TecnicasTradicionales: Oleo, Acrilico o Temple. */
  tecnicaMaterial: string;
  /** Solo aplica a Pintura/TecnicasTradicionales: Lienzo, Lino, Tabla, Cobre o Aluminio. */
  soporte: string;
  tecnica: string;
  dimensiones: string;
  peso: string;
  fechaCreacion: string;
  esSeriada: boolean | null;
  /** Los siguientes campos solo se muestran para categoria Pintura. */
  materialesMixtura: string;
  tipoBastidor: string;
  imprimacionBase: string;
  profundidadRelieve: string;
  configuracionPanel: string;
  estabilidadCapas: string;
  barnizProteccion: string;
  sensibilidadAmbiental: string;
  estadoCantos: string;
  /** Los siguientes campos solo se muestran para categoria ObraGrafica. */
  matrizMaterial: string;
  matrizEstado: string;
  papelMarca: string;
  papelGramaje: string;
  papelCaracteristicas: string;
  editorPublicador: string;
  /** Los siguientes campos solo se muestran para categoria Escultura. */
  materialesPrincipales: string;
  acabadoPatina: string;
  elementosComplementarios: string;
  aptaExterior: string;
  requisitosInstalacion: string;
  /** Los siguientes campos solo se muestran para categoria Dibujo. */
  fijacionAcabado: string;
  elementosAdicionales: string;
  /** Los siguientes campos solo se muestran para categoria TextilCeramica/TapiceriaFibra. */
  composicionFibras: string;
  tintesColoracion: string;
  estructuraTejido: string;
  /** Los siguientes campos solo se muestran para categoria TextilCeramica/CeramicaEscultorica. */
  tipoArcilla: string;
  metodoConformado: string;
  tratamientoSuperficie: string;
  tipoCoccion: string;
  /** Los siguientes campos solo se muestran para categoria NuevosMedios. */
  naturalezaObra: string;
  componentesEntregados: string;
  planPreservacionDigital: string;
  instruccionesReinstalacion: string;
  derechosExhibicion: string;
  /** Los siguientes campos solo se muestran para categoria NuevosMedios/VideoartFilmes. */
  duracionLoop: string;
  especificacionesVideo: string;
  audioCanales: string;
  /** Los siguientes campos solo se muestran para categoria NuevosMedios/ArteDigitalGenerativo. */
  entornoLenguaje: string;
  hardwareRequerido: string;
  conectividad: string;
  /** Los siguientes campos solo se muestran para categoria NuevosMedios/InstalacionesSiteSpecific. */
  dimensionesEspaciales: string;
  condicionesIluminacion: string;
  acondicionamientoAcustico: string;
  equipamientoExhibicion: string;
}

export const initialObraDetalleFieldsState: ObraDetalleFieldsState = {
  subtipo: "",
  tecnicaMaterial: "",
  soporte: "",
  tecnica: "",
  dimensiones: "",
  peso: "",
  fechaCreacion: todayISO(),
  esSeriada: null,
  materialesMixtura: "",
  tipoBastidor: "",
  imprimacionBase: "",
  profundidadRelieve: "",
  configuracionPanel: "",
  estabilidadCapas: "",
  barnizProteccion: "",
  sensibilidadAmbiental: "",
  estadoCantos: "",
  matrizMaterial: "",
  matrizEstado: "",
  papelMarca: "",
  papelGramaje: "",
  papelCaracteristicas: "",
  editorPublicador: "",
  materialesPrincipales: "",
  acabadoPatina: "",
  elementosComplementarios: "",
  aptaExterior: "",
  requisitosInstalacion: "",
  fijacionAcabado: "",
  elementosAdicionales: "",
  composicionFibras: "",
  tintesColoracion: "",
  estructuraTejido: "",
  tipoArcilla: "",
  metodoConformado: "",
  tratamientoSuperficie: "",
  tipoCoccion: "",
  naturalezaObra: "",
  componentesEntregados: "",
  planPreservacionDigital: "",
  instruccionesReinstalacion: "",
  derechosExhibicion: "",
  duracionLoop: "",
  especificacionesVideo: "",
  audioCanales: "",
  entornoLenguaje: "",
  hardwareRequerido: "",
  conectividad: "",
  dimensionesEspaciales: "",
  condicionesIluminacion: "",
  acondicionamientoAcustico: "",
  equipamientoExhibicion: "",
};

interface CategoriaConfig {
  legendKey: TranslationKey;
  subtipoHelpKey: string;
  subtipos: { value: string; labelKey: TranslationKey }[];
}

const CATEGORIA_CONFIG: Record<CategoriaObraDetalle, CategoriaConfig> = {
  Pintura: {
    legendKey: "fields.pintura.legend",
    subtipoHelpKey: "subtipo_pintura",
    subtipos: [
      { value: "TecnicasTradicionales", labelKey: "fields.pintura.subtipoTecnicasTradicionales" },
      { value: "TecnicasMixtas", labelKey: "fields.pintura.subtipoTecnicasMixtas" },
      { value: "Murales", labelKey: "fields.pintura.subtipoMurales" },
    ],
  },
  ObraGrafica: {
    legendKey: "fields.obraGrafica.legend",
    subtipoHelpKey: "subtipo_obra_grafica",
    subtipos: [
      { value: "GrabadoRelieve", labelKey: "fields.obraGrafica.subtipoGrabadoRelieve" },
      { value: "GrabadoHueco", labelKey: "fields.obraGrafica.subtipoGrabadoHueco" },
      { value: "GrabadoPlanografico", labelKey: "fields.obraGrafica.subtipoGrabadoPlanografico" },
      { value: "Monotipos", labelKey: "fields.obraGrafica.subtipoMonotipos" },
    ],
  },
  Escultura: {
    legendKey: "fields.escultura.legend",
    subtipoHelpKey: "subtipo_escultura",
    subtipos: [
      { value: "TallaDirecta", labelKey: "fields.escultura.subtipoTallaDirecta" },
      { value: "FundicionMetal", labelKey: "fields.escultura.subtipoFundicionMetal" },
      { value: "EsculturaContemporanea", labelKey: "fields.escultura.subtipoEsculturaContemporanea" },
    ],
  },
  Dibujo: {
    legendKey: "fields.dibujo.legend",
    subtipoHelpKey: "subtipo_dibujo",
    subtipos: [
      { value: "TecnicasSecas", labelKey: "fields.dibujo.subtipoTecnicasSecas" },
      { value: "TecnicasHumedas", labelKey: "fields.dibujo.subtipoTecnicasHumedas" },
      { value: "EstudiosPreparatorios", labelKey: "fields.dibujo.subtipoEstudiosPreparatorios" },
    ],
  },
  TextilCeramica: {
    legendKey: "fields.textilCeramica.legend",
    subtipoHelpKey: "subtipo_textil_ceramica",
    subtipos: [
      { value: "TapiceriaFibra", labelKey: "fields.textilCeramica.subtipoTapiceriaFibra" },
      { value: "CeramicaEscultorica", labelKey: "fields.textilCeramica.subtipoCeramicaEscultorica" },
    ],
  },
  NuevosMedios: {
    legendKey: "fields.nuevosMedios.legend",
    subtipoHelpKey: "subtipo_nuevos_medios",
    subtipos: [
      { value: "VideoartFilmes", labelKey: "fields.nuevosMedios.subtipoVideoartFilmes" },
      { value: "InstalacionesSiteSpecific", labelKey: "fields.nuevosMedios.subtipoInstalacionesSiteSpecific" },
      { value: "ArteDigitalGenerativo", labelKey: "fields.nuevosMedios.subtipoArteDigitalGenerativo" },
    ],
  },
};

export function subtipoLabelKey(categoria: CategoriaObraDetalle, subtipo: string): TranslationKey | undefined {
  return CATEGORIA_CONFIG[categoria].subtipos.find((s) => s.value === subtipo)?.labelKey;
}

const CATEGORIA_I18N_NAMESPACE: Record<CategoriaObra, string> = {
  Fotografia: "fotografia",
  Pintura: "pintura",
  ObraGrafica: "obraGrafica",
  Escultura: "escultura",
  Dibujo: "dibujo",
  TextilCeramica: "textilCeramica",
  NuevosMedios: "nuevosMedios",
};

export function subtipoTranslationKey(categoria: CategoriaObra, subtipo: string): TranslationKey {
  return `fields.${CATEGORIA_I18N_NAMESPACE[categoria]}.subtipo${subtipo}` as TranslationKey;
}

export function ObraDetalleFields({
  categoria,
  value,
  onChange,
  mostrarEsSeriada = true,
}: {
  categoria: CategoriaObraDetalle;
  value: ObraDetalleFieldsState;
  onChange: (next: ObraDetalleFieldsState) => void;
  mostrarEsSeriada?: boolean;
}) {
  const { t } = useLanguage();
  const config = CATEGORIA_CONFIG[categoria];
  const esTecnicasTradicionales = categoria === "Pintura" && value.subtipo === "TecnicasTradicionales";

  return (
    <fieldset>
      <legend>{t(config.legendKey)}</legend>

      <label>
        {t("field.subtipo")} <HelpIcon fieldKey={config.subtipoHelpKey} />
        <select value={value.subtipo} onChange={(e) => onChange({ ...value, subtipo: e.target.value })}>
          <option value="" disabled>
            {t("obraForm.elegirSubtipo")}
          </option>
          {config.subtipos.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.labelKey)}
            </option>
          ))}
        </select>
      </label>

      {esTecnicasTradicionales ? (
        <>
          <label>
            {t("field.tecnica")} <HelpIcon fieldKey="tecnica_material" />
            <select
              value={value.tecnicaMaterial}
              onChange={(e) => onChange({ ...value, tecnicaMaterial: e.target.value })}
            >
              <option value="">—</option>
              <option value="Oleo">{t("fields.pintura.tecnicaMaterialOleo")}</option>
              <option value="Acrilico">{t("fields.pintura.tecnicaMaterialAcrilico")}</option>
              <option value="Temple">{t("fields.pintura.tecnicaMaterialTemple")}</option>
            </select>
          </label>
          <label>
            {t("fields.pintura.soporteLabel")} <HelpIcon fieldKey="soporte_pintura" />
            <select value={value.soporte} onChange={(e) => onChange({ ...value, soporte: e.target.value })}>
              <option value="">—</option>
              <option value="Lienzo">{t("fields.pintura.soporteLienzo")}</option>
              <option value="Lino">{t("fields.pintura.soporteLino")}</option>
              <option value="Tabla">{t("fields.pintura.soporteTabla")}</option>
              <option value="Cobre">{t("fields.pintura.soporteCobre")}</option>
              <option value="Aluminio">{t("fields.pintura.soporteAluminio")}</option>
            </select>
          </label>
        </>
      ) : (
        <label>
          {t("field.tecnica")} <HelpIcon fieldKey="tecnica" />
          <textarea
            rows={2}
            value={value.tecnica}
            onChange={(e) => onChange({ ...value, tecnica: e.target.value })}
          />
        </label>
      )}

      <label>
        {t("field.dimensiones")}
        <input
          type="text"
          value={value.dimensiones}
          onChange={(e) => onChange({ ...value, dimensiones: e.target.value })}
        />
      </label>

      <label>
        {t("field.peso")}
        <input type="text" value={value.peso} onChange={(e) => onChange({ ...value, peso: e.target.value })} />
      </label>

      <label>
        {t("field.fechaCreacion")}
        <input
          type="date"
          value={value.fechaCreacion}
          onChange={(e) => onChange({ ...value, fechaCreacion: e.target.value })}
        />
      </label>

      {categoria === "Pintura" && (
        <fieldset>
          <legend>{t("fields.pintura.rigurosaLegend")}</legend>

          <label>
            {t("fields.pintura.materialesMixturaLabel")} <HelpIcon fieldKey="materiales_mixtura" />
            <textarea
              rows={2}
              value={value.materialesMixtura}
              onChange={(e) => onChange({ ...value, materialesMixtura: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.tipoBastidorLabel")} <HelpIcon fieldKey="tipo_bastidor" />
            <input
              type="text"
              value={value.tipoBastidor}
              onChange={(e) => onChange({ ...value, tipoBastidor: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.imprimacionBaseLabel")} <HelpIcon fieldKey="imprimacion_base" />
            <input
              type="text"
              value={value.imprimacionBase}
              onChange={(e) => onChange({ ...value, imprimacionBase: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.profundidadRelieveLabel")} <HelpIcon fieldKey="profundidad_relieve" />
            <input
              type="text"
              value={value.profundidadRelieve}
              onChange={(e) => onChange({ ...value, profundidadRelieve: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.configuracionPanelLabel")} <HelpIcon fieldKey="configuracion_panel" />
            <textarea
              rows={2}
              value={value.configuracionPanel}
              onChange={(e) => onChange({ ...value, configuracionPanel: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.estabilidadCapasLabel")} <HelpIcon fieldKey="estabilidad_capas" />
            <textarea
              rows={2}
              value={value.estabilidadCapas}
              onChange={(e) => onChange({ ...value, estabilidadCapas: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.barnizProteccionLabel")} <HelpIcon fieldKey="barniz_proteccion" />
            <input
              type="text"
              value={value.barnizProteccion}
              onChange={(e) => onChange({ ...value, barnizProteccion: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.sensibilidadAmbientalLabel")} <HelpIcon fieldKey="sensibilidad_ambiental" />
            <textarea
              rows={2}
              value={value.sensibilidadAmbiental}
              onChange={(e) => onChange({ ...value, sensibilidadAmbiental: e.target.value })}
            />
          </label>

          <label>
            {t("fields.pintura.estadoCantosLabel")} <HelpIcon fieldKey="estado_cantos" />
            <input
              type="text"
              value={value.estadoCantos}
              onChange={(e) => onChange({ ...value, estadoCantos: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {categoria === "ObraGrafica" && (
        <fieldset>
          <legend>{t("fields.obraGrafica.rigurosaLegend")}</legend>

          <label>
            {t("fields.obraGrafica.matrizMaterialLabel")} <HelpIcon fieldKey="matriz_material" />
            <select
              value={value.matrizMaterial}
              onChange={(e) => onChange({ ...value, matrizMaterial: e.target.value })}
            >
              <option value="">—</option>
              <option value="Cobre">{t("fields.obraGrafica.matrizMaterialCobre")}</option>
              <option value="Zinc">{t("fields.obraGrafica.matrizMaterialZinc")}</option>
              <option value="Madera">{t("fields.obraGrafica.matrizMaterialMadera")}</option>
              <option value="PiedraLitografica">{t("fields.obraGrafica.matrizMaterialPiedraLitografica")}</option>
              <option value="MallaSerigrafica">{t("fields.obraGrafica.matrizMaterialMallaSerigrafica")}</option>
              <option value="Otro">{t("fields.obraGrafica.matrizMaterialOtro")}</option>
            </select>
          </label>

          <label>
            {t("fields.obraGrafica.matrizEstadoLabel")} <HelpIcon fieldKey="matriz_estado" />
            <select value={value.matrizEstado} onChange={(e) => onChange({ ...value, matrizEstado: e.target.value })}>
              <option value="">—</option>
              <option value="Conservada">{t("fields.obraGrafica.matrizEstadoConservada")}</option>
              <option value="Cancelada">{t("fields.obraGrafica.matrizEstadoCancelada")}</option>
              <option value="Destruida">{t("fields.obraGrafica.matrizEstadoDestruida")}</option>
            </select>
          </label>

          <label>
            {t("fields.obraGrafica.papelMarcaLabel")} <HelpIcon fieldKey="papel_marca" />
            <input type="text" value={value.papelMarca} onChange={(e) => onChange({ ...value, papelMarca: e.target.value })} />
          </label>

          <label>
            {t("fields.obraGrafica.papelGramajeLabel")} <HelpIcon fieldKey="papel_gramaje" />
            <input
              type="text"
              value={value.papelGramaje}
              onChange={(e) => onChange({ ...value, papelGramaje: e.target.value })}
            />
          </label>

          <label>
            {t("fields.obraGrafica.papelCaracteristicasLabel")} <HelpIcon fieldKey="papel_caracteristicas" />
            <textarea
              rows={2}
              value={value.papelCaracteristicas}
              onChange={(e) => onChange({ ...value, papelCaracteristicas: e.target.value })}
            />
          </label>

          <label>
            {t("fields.obraGrafica.editorPublicadorLabel")} <HelpIcon fieldKey="editor_publicador" />
            <input
              type="text"
              value={value.editorPublicador}
              onChange={(e) => onChange({ ...value, editorPublicador: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {categoria === "Escultura" && (
        <fieldset>
          <legend>{t("fields.escultura.rigurosaLegend")}</legend>

          <label>
            {t("fields.escultura.materialesPrincipalesLabel")} <HelpIcon fieldKey="materiales_principales" />
            <textarea
              rows={2}
              value={value.materialesPrincipales}
              onChange={(e) => onChange({ ...value, materialesPrincipales: e.target.value })}
            />
          </label>

          <label>
            {t("fields.escultura.acabadoPatinaLabel")} <HelpIcon fieldKey="acabado_patina" />
            <input
              type="text"
              value={value.acabadoPatina}
              onChange={(e) => onChange({ ...value, acabadoPatina: e.target.value })}
            />
          </label>

          <label>
            {t("fields.escultura.elementosComplementariosLabel")} <HelpIcon fieldKey="elementos_complementarios" />
            <input
              type="text"
              value={value.elementosComplementarios}
              onChange={(e) => onChange({ ...value, elementosComplementarios: e.target.value })}
            />
          </label>

          <label>
            {t("fields.escultura.aptaExteriorLabel")} <HelpIcon fieldKey="apta_exterior" />
            <select value={value.aptaExterior} onChange={(e) => onChange({ ...value, aptaExterior: e.target.value })}>
              <option value="">—</option>
              <option value="Exterior">{t("fields.escultura.aptaExteriorExterior")}</option>
              <option value="Interior">{t("fields.escultura.aptaExteriorInterior")}</option>
              <option value="Ambos">{t("fields.escultura.aptaExteriorAmbos")}</option>
            </select>
          </label>

          <label>
            {t("fields.escultura.requisitosInstalacionLabel")} <HelpIcon fieldKey="requisitos_instalacion" />
            <textarea
              rows={2}
              value={value.requisitosInstalacion}
              onChange={(e) => onChange({ ...value, requisitosInstalacion: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {categoria === "Dibujo" && (
        <fieldset>
          <legend>{t("fields.dibujo.rigurosaLegend")}</legend>

          <label>
            {t("fields.obraGrafica.papelMarcaLabel")} <HelpIcon fieldKey="papel_marca" />
            <input
              type="text"
              value={value.papelMarca}
              onChange={(e) => onChange({ ...value, papelMarca: e.target.value })}
            />
          </label>

          <label>
            {t("fields.obraGrafica.papelGramajeLabel")} <HelpIcon fieldKey="papel_gramaje" />
            <input
              type="text"
              value={value.papelGramaje}
              onChange={(e) => onChange({ ...value, papelGramaje: e.target.value })}
            />
          </label>

          <label>
            {t("fields.obraGrafica.papelCaracteristicasLabel")} <HelpIcon fieldKey="papel_caracteristicas" />
            <textarea
              rows={2}
              value={value.papelCaracteristicas}
              onChange={(e) => onChange({ ...value, papelCaracteristicas: e.target.value })}
            />
          </label>

          <label>
            {t("fields.dibujo.fijacionAcabadoLabel")} <HelpIcon fieldKey="fijacion_acabado" />
            <input
              type="text"
              value={value.fijacionAcabado}
              onChange={(e) => onChange({ ...value, fijacionAcabado: e.target.value })}
            />
          </label>

          <label>
            {t("fields.dibujo.elementosAdicionalesLabel")} <HelpIcon fieldKey="elementos_adicionales" />
            <textarea
              rows={2}
              value={value.elementosAdicionales}
              onChange={(e) => onChange({ ...value, elementosAdicionales: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {categoria === "TextilCeramica" && (
        <fieldset>
          <legend>{t("fields.textilCeramica.rigurosaLegend")}</legend>

          {value.subtipo === "TapiceriaFibra" && (
            <>
              <label>
                {t("fields.textilCeramica.composicionFibrasLabel")} <HelpIcon fieldKey="composicion_fibras" />
                <textarea
                  rows={2}
                  value={value.composicionFibras}
                  onChange={(e) => onChange({ ...value, composicionFibras: e.target.value })}
                />
              </label>

              <label>
                {t("fields.textilCeramica.tintesColoracionLabel")} <HelpIcon fieldKey="tintes_coloracion" />
                <input
                  type="text"
                  value={value.tintesColoracion}
                  onChange={(e) => onChange({ ...value, tintesColoracion: e.target.value })}
                />
              </label>

              <label>
                {t("fields.textilCeramica.estructuraTejidoLabel")} <HelpIcon fieldKey="estructura_tejido" />
                <input
                  type="text"
                  value={value.estructuraTejido}
                  onChange={(e) => onChange({ ...value, estructuraTejido: e.target.value })}
                />
              </label>
            </>
          )}

          {value.subtipo === "CeramicaEscultorica" && (
            <>
              <label>
                {t("fields.textilCeramica.tipoArcillaLabel")} <HelpIcon fieldKey="tipo_arcilla" />
                <input
                  type="text"
                  value={value.tipoArcilla}
                  onChange={(e) => onChange({ ...value, tipoArcilla: e.target.value })}
                />
              </label>

              <label>
                {t("fields.textilCeramica.metodoConformadoLabel")} <HelpIcon fieldKey="metodo_conformado" />
                <input
                  type="text"
                  value={value.metodoConformado}
                  onChange={(e) => onChange({ ...value, metodoConformado: e.target.value })}
                />
              </label>

              <label>
                {t("fields.textilCeramica.tratamientoSuperficieLabel")}{" "}
                <HelpIcon fieldKey="tratamiento_superficie" />
                <textarea
                  rows={2}
                  value={value.tratamientoSuperficie}
                  onChange={(e) => onChange({ ...value, tratamientoSuperficie: e.target.value })}
                />
              </label>

              <label>
                {t("fields.textilCeramica.tipoCoccionLabel")} <HelpIcon fieldKey="tipo_coccion" />
                <textarea
                  rows={2}
                  value={value.tipoCoccion}
                  onChange={(e) => onChange({ ...value, tipoCoccion: e.target.value })}
                />
              </label>
            </>
          )}

          <label>
            {t("fields.escultura.elementosComplementariosLabel")} <HelpIcon fieldKey="elementos_complementarios" />
            <input
              type="text"
              value={value.elementosComplementarios}
              onChange={(e) => onChange({ ...value, elementosComplementarios: e.target.value })}
            />
          </label>

          <label>
            {t("fields.escultura.requisitosInstalacionLabel")} <HelpIcon fieldKey="requisitos_instalacion" />
            <textarea
              rows={2}
              value={value.requisitosInstalacion}
              onChange={(e) => onChange({ ...value, requisitosInstalacion: e.target.value })}
            />
          </label>
        </fieldset>
      )}

      {categoria === "NuevosMedios" && (
        <fieldset>
          <legend>{t("fields.nuevosMedios.rigurosaLegend")}</legend>

          <label>
            {t("fields.nuevosMedios.naturalezaObraLabel")} <HelpIcon fieldKey="naturaleza_obra" />
            <textarea
              rows={2}
              value={value.naturalezaObra}
              onChange={(e) => onChange({ ...value, naturalezaObra: e.target.value })}
            />
          </label>

          <label>
            {t("fields.nuevosMedios.componentesEntregadosLabel")} <HelpIcon fieldKey="componentes_entregados" />
            <textarea
              rows={2}
              value={value.componentesEntregados}
              onChange={(e) => onChange({ ...value, componentesEntregados: e.target.value })}
            />
          </label>

          <label>
            {t("fields.nuevosMedios.planPreservacionDigitalLabel")}{" "}
            <HelpIcon fieldKey="plan_preservacion_digital" />
            <textarea
              rows={2}
              value={value.planPreservacionDigital}
              onChange={(e) => onChange({ ...value, planPreservacionDigital: e.target.value })}
            />
          </label>

          <label>
            {t("fields.nuevosMedios.instruccionesReinstalacionLabel")}{" "}
            <HelpIcon fieldKey="instrucciones_reinstalacion" />
            <textarea
              rows={2}
              value={value.instruccionesReinstalacion}
              onChange={(e) => onChange({ ...value, instruccionesReinstalacion: e.target.value })}
            />
          </label>

          <label>
            {t("fields.nuevosMedios.derechosExhibicionLabel")} <HelpIcon fieldKey="derechos_exhibicion" />
            <textarea
              rows={2}
              value={value.derechosExhibicion}
              onChange={(e) => onChange({ ...value, derechosExhibicion: e.target.value })}
            />
          </label>

          {value.subtipo === "VideoartFilmes" && (
            <>
              <label>
                {t("fields.nuevosMedios.duracionLoopLabel")} <HelpIcon fieldKey="duracion_loop" />
                <input
                  type="text"
                  value={value.duracionLoop}
                  onChange={(e) => onChange({ ...value, duracionLoop: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.especificacionesVideoLabel")}{" "}
                <HelpIcon fieldKey="especificaciones_video" />
                <textarea
                  rows={3}
                  value={value.especificacionesVideo}
                  onChange={(e) => onChange({ ...value, especificacionesVideo: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.audioCanalesLabel")} <HelpIcon fieldKey="audio_canales" />
                <input
                  type="text"
                  value={value.audioCanales}
                  onChange={(e) => onChange({ ...value, audioCanales: e.target.value })}
                />
              </label>
            </>
          )}

          {value.subtipo === "ArteDigitalGenerativo" && (
            <>
              <label>
                {t("fields.nuevosMedios.entornoLenguajeLabel")} <HelpIcon fieldKey="entorno_lenguaje" />
                <input
                  type="text"
                  value={value.entornoLenguaje}
                  onChange={(e) => onChange({ ...value, entornoLenguaje: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.hardwareRequeridoLabel")} <HelpIcon fieldKey="hardware_requerido" />
                <textarea
                  rows={2}
                  value={value.hardwareRequerido}
                  onChange={(e) => onChange({ ...value, hardwareRequerido: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.conectividadLabel")} <HelpIcon fieldKey="conectividad" />
                <input
                  type="text"
                  value={value.conectividad}
                  onChange={(e) => onChange({ ...value, conectividad: e.target.value })}
                />
              </label>
            </>
          )}

          {value.subtipo === "InstalacionesSiteSpecific" && (
            <>
              <label>
                {t("fields.nuevosMedios.dimensionesEspacialesLabel")}{" "}
                <HelpIcon fieldKey="dimensiones_espaciales" />
                <input
                  type="text"
                  value={value.dimensionesEspaciales}
                  onChange={(e) => onChange({ ...value, dimensionesEspaciales: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.condicionesIluminacionLabel")}{" "}
                <HelpIcon fieldKey="condiciones_iluminacion" />
                <input
                  type="text"
                  value={value.condicionesIluminacion}
                  onChange={(e) => onChange({ ...value, condicionesIluminacion: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.acondicionamientoAcusticoLabel")}{" "}
                <HelpIcon fieldKey="acondicionamiento_acustico" />
                <input
                  type="text"
                  value={value.acondicionamientoAcustico}
                  onChange={(e) => onChange({ ...value, acondicionamientoAcustico: e.target.value })}
                />
              </label>

              <label>
                {t("fields.nuevosMedios.equipamientoExhibicionLabel")}{" "}
                <HelpIcon fieldKey="equipamiento_exhibicion" />
                <textarea
                  rows={2}
                  value={value.equipamientoExhibicion}
                  onChange={(e) => onChange({ ...value, equipamientoExhibicion: e.target.value })}
                />
              </label>

              <label>
                {t("fields.escultura.requisitosInstalacionLabel")} <HelpIcon fieldKey="requisitos_instalacion" />
                <textarea
                  rows={2}
                  value={value.requisitosInstalacion}
                  onChange={(e) => onChange({ ...value, requisitosInstalacion: e.target.value })}
                />
              </label>
            </>
          )}
        </fieldset>
      )}

      {mostrarEsSeriada &&
        (categoria === "ObraGrafica" ? (
          value.subtipo && (
            <p className="field-note">
              {t("fields.pintura.esSeriadaPrefix")}{" "}
              <strong>
                {derivarEsSeriadaObraGrafica(value.subtipo as SubtipoObraGrafica) ? t("common.yes") : t("common.no")}
              </strong>{" "}
              {t("fields.pintura.esSeriadaSuffix")} <HelpIcon fieldKey="es_seriada" />
            </p>
          )
        ) : (
          <label>
            <input
              type="checkbox"
              checked={value.esSeriada === true}
              onChange={(e) => onChange({ ...value, esSeriada: e.target.checked })}
            />
            {t("field.esSeriada")} <HelpIcon fieldKey="es_seriada" />
          </label>
        ))}
    </fieldset>
  );
}

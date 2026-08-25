import { createContext, useContext, useState, type ReactNode } from "react";
import {
  openWorkspace,
  type Artista,
  type GaleriaPerfil,
  type WorkspaceContext as CoreWorkspaceContext,
  type WorkspaceId,
} from "@registro/core";
import { createPlatformAdapterFactory } from "../adapters/createPlatformAdapterFactory.js";

export interface HelpText {
  es: string;
  en: string | null;
}

interface WorkspaceState {
  context: CoreWorkspaceContext | null;
  helpTexts: Record<string, HelpText>;
  personalArtista: Artista | null;
  galeriaPerfil: GaleriaPerfil | null;
  loading: boolean;
  error: string | null;
  open: (workspace: WorkspaceId) => Promise<void>;
  close: () => Promise<void>;
  reloadPersonalArtista: () => Promise<void>;
  reloadGaleriaPerfil: () => Promise<void>;
}

const WorkspaceReactContext = createContext<WorkspaceState | null>(null);

async function loadHelpTexts(context: CoreWorkspaceContext): Promise<Record<string, HelpText>> {
  const rows = await context.db.query<{ field_key: string; texto_es: string; texto_en: string | null }>(
    "SELECT field_key, texto_es, texto_en FROM texto_ayuda",
  );
  return Object.fromEntries(rows.map((row) => [row.field_key, { es: row.texto_es, en: row.texto_en }]));
}

interface ArtistaRow {
  id: number;
  numero_artista: string | null;
  nombre_completo: string;
  es_propio: number;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  direccion: string | null;
  x: string | null;
  facebook: string | null;
  linkedin: string | null;
  foto_path: string | null;
  logo_path: string | null;
  firma_path: string | null;
  cuit: string | null;
  notas: string | null;
  fecha_nacimiento: string | null;
  bio: string | null;
  bio_en: string | null;
  nombre_artistico: string | null;
  nacionalidad: string | null;
  lugar_nacimiento: string | null;
  lugar_fallecimiento: string | null;
  fecha_fallecimiento: string | null;
  lugar_residencia_trabajo: string | null;
  declaracion_artista: string | null;
  formacion_academica: string | null;
  exposiciones_individuales: string | null;
  exposiciones_colectivas: string | null;
  premios_becas_reconocimientos: string | null;
  colecciones: string | null;
  publicaciones_prensa: string | null;
  fecha_alta_sistema: string;
}

function mapArtistaRow(row: ArtistaRow): Artista {
  return {
    id: row.id,
    numeroArtista: row.numero_artista,
    nombreCompleto: row.nombre_completo,
    esPropio: row.es_propio === 1,
    contacto: row.contacto,
    telefono: row.telefono,
    email: row.email,
    web: row.web,
    instagram: row.instagram,
    direccion: row.direccion,
    x: row.x,
    facebook: row.facebook,
    linkedin: row.linkedin,
    fotoPath: row.foto_path,
    logoPath: row.logo_path,
    firmaPath: row.firma_path,
    cuit: row.cuit,
    notas: row.notas,
    fechaNacimiento: row.fecha_nacimiento,
    bio: row.bio,
    bioEn: row.bio_en,
    nombreArtistico: row.nombre_artistico,
    nacionalidad: row.nacionalidad,
    lugarNacimiento: row.lugar_nacimiento,
    lugarFallecimiento: row.lugar_fallecimiento,
    fechaFallecimiento: row.fecha_fallecimiento,
    lugarResidenciaTrabajo: row.lugar_residencia_trabajo,
    declaracionArtista: row.declaracion_artista,
    formacionAcademica: row.formacion_academica,
    exposicionesIndividuales: row.exposiciones_individuales,
    exposicionesColectivas: row.exposiciones_colectivas,
    premiosBecasReconocimientos: row.premios_becas_reconocimientos,
    colecciones: row.colecciones,
    publicacionesPrensa: row.publicaciones_prensa,
    fechaAltaSistema: row.fecha_alta_sistema,
  };
}

async function loadPersonalArtista(context: CoreWorkspaceContext): Promise<Artista | null> {
  if (context.workspace !== "personal") return null;
  const rows = await context.db.query<ArtistaRow>("SELECT * FROM artista WHERE es_propio = 1 LIMIT 1");
  return rows.length > 0 ? mapArtistaRow(rows[0]) : null;
}

interface GaleriaPerfilRow {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  facebook: string | null;
  x: string | null;
  notas: string | null;
  logo_path: string | null;
  firma_path: string | null;
  cuit: string | null;
}

function mapGaleriaPerfilRow(row: GaleriaPerfilRow): GaleriaPerfil {
  return {
    nombre: row.nombre,
    direccion: row.direccion,
    telefono: row.telefono,
    email: row.email,
    web: row.web,
    instagram: row.instagram,
    facebook: row.facebook,
    x: row.x,
    notas: row.notas,
    logoPath: row.logo_path,
    firmaPath: row.firma_path,
    cuit: row.cuit,
  };
}

async function loadGaleriaPerfil(context: CoreWorkspaceContext): Promise<GaleriaPerfil | null> {
  if (context.workspace !== "galeria") return null;
  const rows = await context.db.query<GaleriaPerfilRow>(
    "SELECT nombre, direccion, telefono, email, web, instagram, facebook, x, notas, logo_path, firma_path, cuit FROM galeria_perfil WHERE id = 1",
  );
  return rows.length > 0 ? mapGaleriaPerfilRow(rows[0]) : null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<CoreWorkspaceContext | null>(null);
  const [helpTexts, setHelpTexts] = useState<Record<string, HelpText>>({});
  const [personalArtista, setPersonalArtista] = useState<Artista | null>(null);
  const [galeriaPerfil, setGaleriaPerfil] = useState<GaleriaPerfil | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (workspace: WorkspaceId) => {
    setLoading(true);
    setError(null);
    try {
      // Cierra la conexion anterior (si habia una) antes de abrir la nueva,
      // sin pasar por "context = null" en el medio: asi cambiar de modulo no
      // hace parpadear la pantalla de seleccion, solo reemplaza el contexto.
      if (context) await context.db.close();
      const factory = await createPlatformAdapterFactory();
      const ctx = await openWorkspace(workspace, factory);
      setContext(ctx);
      setHelpTexts(await loadHelpTexts(ctx));
      setPersonalArtista(await loadPersonalArtista(ctx));
      setGaleriaPerfil(await loadGaleriaPerfil(ctx));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const close = async () => {
    if (context) await context.db.close();
    setContext(null);
    setHelpTexts({});
    setPersonalArtista(null);
    setGaleriaPerfil(null);
    setError(null);
  };

  const reloadPersonalArtista = async () => {
    if (!context) return;
    setPersonalArtista(await loadPersonalArtista(context));
  };

  const reloadGaleriaPerfil = async () => {
    if (!context) return;
    setGaleriaPerfil(await loadGaleriaPerfil(context));
  };

  const value: WorkspaceState = {
    context,
    helpTexts,
    personalArtista,
    galeriaPerfil,
    loading,
    error,
    open,
    close,
    reloadPersonalArtista,
    reloadGaleriaPerfil,
  };

  return <WorkspaceReactContext.Provider value={value}>{children}</WorkspaceReactContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceReactContext);
  if (!ctx) throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  return ctx;
}

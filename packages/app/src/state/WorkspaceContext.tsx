import { createContext, useContext, useState, type ReactNode } from "react";
import { openWorkspace, type Artista, type WorkspaceContext as CoreWorkspaceContext, type WorkspaceId } from "@registro/core";
import { createPlatformAdapterFactory } from "../adapters/createPlatformAdapterFactory.js";

export interface HelpText {
  es: string;
  en: string | null;
}

interface WorkspaceState {
  context: CoreWorkspaceContext | null;
  helpTexts: Record<string, HelpText>;
  personalArtista: Artista | null;
  loading: boolean;
  error: string | null;
  open: (workspace: WorkspaceId) => Promise<void>;
  close: () => Promise<void>;
  reloadPersonalArtista: () => Promise<void>;
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
  foto_path: string | null;
  logo_path: string | null;
  notas: string | null;
  fecha_nacimiento: string | null;
  bio: string | null;
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
    fotoPath: row.foto_path,
    logoPath: row.logo_path,
    notas: row.notas,
    fechaNacimiento: row.fecha_nacimiento,
    bio: row.bio,
    fechaAltaSistema: row.fecha_alta_sistema,
  };
}

async function loadPersonalArtista(context: CoreWorkspaceContext): Promise<Artista | null> {
  if (context.workspace !== "personal") return null;
  const rows = await context.db.query<ArtistaRow>("SELECT * FROM artista WHERE es_propio = 1 LIMIT 1");
  return rows.length > 0 ? mapArtistaRow(rows[0]) : null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<CoreWorkspaceContext | null>(null);
  const [helpTexts, setHelpTexts] = useState<Record<string, HelpText>>({});
  const [personalArtista, setPersonalArtista] = useState<Artista | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (workspace: WorkspaceId) => {
    setLoading(true);
    setError(null);
    try {
      const factory = await createPlatformAdapterFactory();
      const ctx = await openWorkspace(workspace, factory);
      setContext(ctx);
      setHelpTexts(await loadHelpTexts(ctx));
      setPersonalArtista(await loadPersonalArtista(ctx));
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
    setError(null);
  };

  const reloadPersonalArtista = async () => {
    if (!context) return;
    setPersonalArtista(await loadPersonalArtista(context));
  };

  const value: WorkspaceState = {
    context,
    helpTexts,
    personalArtista,
    loading,
    error,
    open,
    close,
    reloadPersonalArtista,
  };

  return <WorkspaceReactContext.Provider value={value}>{children}</WorkspaceReactContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceReactContext);
  if (!ctx) throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  return ctx;
}

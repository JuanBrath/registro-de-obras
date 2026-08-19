export interface Artista {
  id: number;
  numeroArtista: string | null;
  nombreCompleto: string;
  esPropio: boolean;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  instagram: string | null;
  direccion: string | null;
  x: string | null;
  facebook: string | null;
  fotoPath: string | null;
  logoPath: string | null;
  notas: string | null;
  fechaNacimiento: string | null;
  bio: string | null;
  fechaAltaSistema: string;
}

export interface NuevoArtista {
  numeroArtista?: string | null;
  nombreCompleto: string;
  esPropio: boolean;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  instagram?: string | null;
  direccion?: string | null;
  x?: string | null;
  facebook?: string | null;
  fotoPath?: string | null;
  logoPath?: string | null;
  notas?: string | null;
  fechaNacimiento?: string | null;
  bio?: string | null;
}

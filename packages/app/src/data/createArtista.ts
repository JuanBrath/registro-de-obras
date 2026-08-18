import type { DatabaseAdapter } from "@registro/core";

export interface NuevoArtistaFields {
  nombreCompleto: string;
  fechaNacimiento?: string | null;
  bio?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  instagram?: string | null;
  direccion?: string | null;
  x?: string | null;
  facebook?: string | null;
  notas?: string | null;
}

/** Asigna el próximo número de artista_contador y crea el artista en una sola transacción. */
export async function createArtista(
  db: DatabaseAdapter,
  fields: NuevoArtistaFields,
): Promise<{ id: number; numeroArtista: string }> {
  return db.transaction(async (tx) => {
    const counter = await tx.query<{ siguiente_numero: number }>(
      "SELECT siguiente_numero FROM artista_contador WHERE id = 1",
    );
    const numeroArtista = String(counter[0].siguiente_numero);
    await tx.execute("UPDATE artista_contador SET siguiente_numero = siguiente_numero + 1 WHERE id = 1");

    const result = await tx.execute(
      `INSERT INTO artista (numero_artista, nombre_completo, es_propio, fecha_nacimiento, bio, telefono, email, web, instagram, direccion, x, facebook, notas)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroArtista,
        fields.nombreCompleto,
        fields.fechaNacimiento ?? null,
        fields.bio ?? null,
        fields.telefono ?? null,
        fields.email ?? null,
        fields.web ?? null,
        fields.instagram ?? null,
        fields.direccion ?? null,
        fields.x ?? null,
        fields.facebook ?? null,
        fields.notas ?? null,
      ],
    );
    if (!result.lastInsertId) throw new Error("No se pudo crear el artista");

    return { id: result.lastInsertId, numeroArtista };
  });
}

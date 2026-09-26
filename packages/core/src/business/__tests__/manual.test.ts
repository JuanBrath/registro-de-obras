import { readdirSync, readFileSync } from "node:fs";
import type { IdiomaManual } from "../manual.js";
import { describe, expect, it } from "vitest";
import {
  buscarEnManual,
  normalizar,
  parsearCapitulo,
  parsearInline,
  resaltar,
  terminosDeBusqueda,
  textoParaPdf,
  textoSinFormato,
} from "../manual.js";

const EJEMPLO = `# Ventas de prueba

Un resumen corto del capitulo.

## Registrar una venta

Primero abrí la obra.

1. Tocá **Venta / Reserva**.
2. Completá los datos:
   - **Nombre** del comprador.
   - **Fecha**.
3. Tocá **Confirmar venta**.

> Ojo: sin la fecha de impresión no se puede vender.

### Detalle

- Un punto.
- Otro punto con [copias](cap:copias).

## Anular una venta

Se usa **Anular venta**. Sirve para arrepentirse.
`;

describe("parsearCapitulo", () => {
  const cap = parsearCapitulo("ventas", EJEMPLO);

  it("saca el titulo, el resumen y las secciones", () => {
    expect(cap.id).toBe("ventas");
    expect(cap.titulo).toBe("Ventas de prueba");
    expect(cap.resumen).toBe("Un resumen corto del capitulo.");
    expect(cap.secciones.map((s) => [s.id, s.titulo])).toEqual([
      ["registrar-una-venta", "Registrar una venta"],
      ["anular-una-venta", "Anular una venta"],
    ]);
  });

  it("arma parrafos, pasos numerados con subpuntos, notas, subtitulos y listas", () => {
    const tipos = cap.secciones[0].bloques.map((b) => b.tipo);
    expect(tipos).toEqual(["parrafo", "lista", "nota", "subtitulo", "lista"]);

    const pasos = cap.secciones[0].bloques[1];
    expect(pasos).toMatchObject({ tipo: "lista", ordenada: true });
    if (pasos.tipo !== "lista") throw new Error("se esperaba una lista");
    expect(pasos.items.map((i) => i.texto)).toEqual(["Tocá **Venta / Reserva**.", "Completá los datos:", "Tocá **Confirmar venta**."]);
    expect(pasos.items[1].subitems).toEqual(["**Nombre** del comprador.", "**Fecha**."]);

    expect(cap.secciones[0].bloques[2]).toEqual({ tipo: "nota", texto: "Ojo: sin la fecha de impresión no se puede vender." });
    const puntos = cap.secciones[0].bloques[4];
    if (puntos.tipo !== "lista") throw new Error("se esperaba una lista");
    expect(puntos.ordenada).toBe(false);
  });

  it("el texto plano no tiene marcas de formato", () => {
    expect(cap.secciones[0].textoPlano).toContain("Tocá Venta / Reserva.");
    expect(cap.secciones[0].textoPlano).toContain("Otro punto con copias.");
    expect(cap.secciones[0].textoPlano).not.toContain("**");
    expect(cap.secciones[0].textoPlano).not.toContain("cap:");
  });

  it("dos secciones con el mismo titulo tienen ids distintos", () => {
    const repetido = parsearCapitulo("x", "# X\n\nresumen\n\n## Igual\n\na\n\n## Igual\n\nb\n");
    expect(repetido.secciones.map((s) => s.id)).toEqual(["igual", "igual-2"]);
  });

  it("lo que hay antes de la primera seccion, mas alla del resumen, va en una Introduccion", () => {
    const cap2 = parsearCapitulo("x", "# X\n\nresumen\n\notro parrafo\n\n## Uno\n\ntexto\n");
    expect(cap2.resumen).toBe("resumen");
    expect(cap2.secciones.map((s) => s.titulo)).toEqual(["Introducción", "Uno"]);
  });
});

describe("parsearInline", () => {
  it("separa negritas, codigo y enlaces", () => {
    expect(parsearInline("Tocá **Guardar** y mirá `archivo.pdf`; ver [Ventas](cap:ventas).")).toEqual([
      { tipo: "texto", texto: "Tocá " },
      { tipo: "negrita", texto: "Guardar" },
      { tipo: "texto", texto: " y mirá " },
      { tipo: "codigo", texto: "archivo.pdf" },
      { tipo: "texto", texto: "; ver " },
      { tipo: "enlace", texto: "Ventas", capitulo: "ventas" },
      { tipo: "texto", texto: "." },
    ]);
    expect(textoSinFormato("**a** [b](cap:c) `d`")).toBe("a b d");
  });
});

describe("buscador", () => {
  const capitulos = [
    parsearCapitulo("ventas", EJEMPLO),
    parsearCapitulo(
      "clientes",
      "# Clientes\n\nTus compradores.\n\n## Cargar un cliente nuevo\n\nTocá **Nuevo cliente**.\n\n## Eliminar\n\nUn cliente con ventas no se elimina.\n",
    ),
  ];

  it("normaliza sin tildes ni mayusculas y conserva el largo", () => {
    expect(normalizar("Señal Único ÁÉÍÓÚ")).toBe("senal unico aeiou");
    expect(normalizar("¿Qué?")).toHaveLength("¿Qué?".length);
  });

  it("saca el plural de las palabras buscadas", () => {
    expect(terminosDeBusqueda("Copias CLIENTES pruebas de autor")).toEqual(["copia", "clien", "prueb", "autor"]);
    expect(terminosDeBusqueda("a")).toEqual([]);
  });

  it("encuentra sin importar tildes ni plurales", () => {
    const r = buscarEnManual(capitulos, "impresion");
    expect(r.map((x) => x.seccionId)).toEqual(["registrar-una-venta"]);
    const clientes = buscarEnManual(capitulos, "clientes");
    expect(clientes.map((x) => x.seccionId)).toContain("cargar-un-cliente-nuevo");
  });

  it("si algo tiene todas las palabras, muestra solo eso", () => {
    const r = buscarEnManual(capitulos, "anular venta");
    expect(r.map((x) => x.seccionId)).toEqual(["anular-una-venta"]);
    expect(r[0].completo).toBe(true);
  });

  it("si nada tiene todas las palabras, muestra lo mas parecido, marcado como parcial", () => {
    const r = buscarEnManual(capitulos, "anular cliente");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => !x.completo)).toBe(true);
  });

  it("entiende una pregunta escrita como se habla", () => {
    const r = buscarEnManual(capitulos, "como hago para anular una venta");
    expect(r[0].seccionId).toBe("anular-una-venta");
    expect(terminosDeBusqueda("como hago para anular una venta")).toEqual(["anula", "venta"]);
  });

  it("pone primero lo que tiene la palabra en el titulo", () => {
    const r = buscarEnManual(capitulos, "venta");
    expect(r[0].seccionTitulo).toMatch(/venta/i);
  });

  it("no devuelve nada si la busqueda es vacia o no hay coincidencias", () => {
    expect(buscarEnManual(capitulos, "   ")).toEqual([]);
    expect(buscarEnManual(capitulos, "zzzzzz")).toEqual([]);
  });

  it("muestra un fragmento donde aparece lo buscado", () => {
    const [r] = buscarEnManual(capitulos, "arrepentirse");
    expect(r.capituloId).toBe("ventas");
    expect(r.fragmento).toContain("arrepentirse");
  });
});

describe("buscador en ingles", () => {
  const capitulos = [
    parsearCapitulo(
      "sales",
      "# Sales\n\nSelling your artworks.\n\n## Register a sale\n\nOpen the artwork and tap **Sale / Reservation**.\n\n## Cancel a sale\n\nUse **Cancel sale** if the buyer changes their mind.\n",
    ),
    parsearCapitulo(
      "clients",
      "# Clients\n\nYour buyers.\n\n## Add a new client\n\nTap **New client**.\n\n## Delete a client\n\nA client with sales cannot be deleted.\n",
    ),
  ];

  it("ignora las palabras de relleno y saca plurales y terminaciones", () => {
    expect(terminosDeBusqueda("how do I cancel a sale", "en")).toEqual(["cance", "sale"]);
    expect(terminosDeBusqueda("cancelled sales", "en")).toEqual(["cancel", "sal"]);
    expect(terminosDeBusqueda("registering clients", "en")).toEqual(["regist", "clien"]);
    expect(terminosDeBusqueda("what is the", "en")).toEqual([]);
  });

  it("entiende una pregunta escrita como se habla", () => {
    const r = buscarEnManual(capitulos, "how can I cancel a sale?", 30, "en");
    expect(r[0].seccionId).toBe("cancel-a-sale");
    expect(r[0].completo).toBe(true);
  });

  it("encuentra sin importar mayusculas ni plurales", () => {
    const r = buscarEnManual(capitulos, "Clients", 30, "en");
    expect(r.map((x) => x.seccionId)).toContain("add-a-new-client");
  });

  it("no devuelve nada si no hay coincidencias", () => {
    expect(buscarEnManual(capitulos, "zzzzzz", 30, "en")).toEqual([]);
  });
});

describe("resaltar", () => {
  it("marca las coincidencias sin tildes ni mayusculas", () => {
    expect(resaltar("La Impresión y la impresora", ["impresion"])).toEqual([
      { texto: "La ", coincide: false },
      { texto: "Impresión", coincide: true },
      { texto: " y la impresora", coincide: false },
    ]);
    // Marca la palabra entera aunque se haya buscado solo su raiz.
    expect(resaltar("Podés cambiar la carpeta", ["cambi"])).toEqual([
      { texto: "Podés ", coincide: false },
      { texto: "cambiar", coincide: true },
      { texto: " la carpeta", coincide: false },
    ]);
    expect(resaltar("nada", [])).toEqual([{ texto: "nada", coincide: false }]);
  });
});

describe("textoParaPdf", () => {
  it("cambia los simbolos que la tipografia del PDF no tiene", () => {
    expect(textoParaPdf("Ajustes → Privacidad → Archivos")).toBe("Ajustes › Privacidad › Archivos");
    expect(textoParaPdf("Tocá la ✕ de arriba y el botón ⓘ")).toBe("Tocá la X de arriba y el botón (i)");
    expect(textoParaPdf("Tocá el engranaje ⚙ de arriba")).toBe("Tocá el engranaje de arriba");
    expect(textoParaPdf("Guardado ✅ y ⚠️ aviso")).toBe("Guardado y aviso");
  });

  it("deja igual los acentos, la eñe y los signos comunes", () => {
    const texto = "¿Qué pasó? «Sí» — “ok” … 40 × 60 cm · €5 ‹a› ñandú";
    expect(textoParaPdf(texto)).toBe(texto);
  });
});

// El manual de verdad, en cada idioma: que este bien armado y que no tenga enlaces rotos.
const RAIZ_MANUAL = new URL("../../../../app/src/manual/contenido/", import.meta.url);
const IDIOMAS: IdiomaManual[] = ["es", "en"];

function leerManual(idioma: IdiomaManual) {
  const carpeta = new URL(`${idioma}/`, RAIZ_MANUAL);
  const archivos = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const markdown = archivos.map((f) => readFileSync(new URL(f, carpeta), "utf-8"));
  const capitulos = archivos.map((f, i) => parsearCapitulo(f.replace(/^\d+-/, "").replace(/\.md$/, ""), markdown[i]));
  return { archivos, markdown, capitulos };
}

describe.each(IDIOMAS)("el manual del usuario (%s)", (idioma) => {
  const { archivos, markdown, capitulos } = leerManual(idioma);

  it("tiene capitulos, y cada uno con titulo, resumen y secciones", () => {
    expect(capitulos.length).toBeGreaterThanOrEqual(10);
    for (const c of capitulos) {
      expect(c.titulo, c.id).not.toBe(c.id);
      expect(c.resumen, `resumen de ${c.id}`).not.toBe("");
      expect(c.secciones.length, `secciones de ${c.id}`).toBeGreaterThan(0);
      for (const s of c.secciones) expect(s.bloques.length, `${c.id} / ${s.titulo}`).toBeGreaterThan(0);
    }
  });

  it("todos los enlaces entre capitulos apuntan a un capitulo que existe", () => {
    const ids = new Set(capitulos.map((c) => c.id));
    const rotos: string[] = [];
    archivos.forEach((archivo, i) => {
      for (const m of markdown[i].matchAll(/\]\(cap:([a-z0-9-]+)\)/g)) {
        if (!ids.has(m[1])) rotos.push(`${archivo} -> ${m[1]}`);
      }
    });
    expect(rotos).toEqual([]);
  });

  it("no hay dos capitulos con el mismo id", () => {
    expect(new Set(capitulos.map((c) => c.id)).size).toBe(capitulos.length);
  });

  it("todo su texto se puede imprimir en PDF (no queda ningun simbolo sin tipografia)", () => {
    const permitido = /^[\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2039\u203A\u2122\n]*$/;
    archivos.forEach((archivo, i) => {
      const raros = Array.from(textoParaPdf(markdown[i])).filter((c) => !permitido.test(c));
      expect(raros, archivo).toEqual([]);
    });
  });
});

describe("el buscador con el manual de verdad", () => {
  it("en espanol encuentra los temas principales", () => {
    const { capitulos } = leerManual("es");
    const primero = (consulta: string) => buscarEnManual(capitulos, consulta, 30, "es")[0];
    expect(primero("certificado")).toBeDefined();
    expect(primero("como cambio la carpeta de datos")?.capituloId).toBe("configuracion");
    expect(primero("firma digital")).toBeDefined();
    expect(primero("anular venta")?.capituloId).toBe("ventas");
    expect(primero("prueba de autor")).toBeDefined();
  });

  it("en ingles encuentra los temas principales", () => {
    const { capitulos } = leerManual("en");
    const primero = (consulta: string) => buscarEnManual(capitulos, consulta, 30, "en")[0];
    expect(primero("certificate")).toBeDefined();
    expect(primero("how do I change the data folder")?.capituloId).toBe("configuracion");
    expect(primero("digital signature")).toBeDefined();
    expect(primero("cancel sale")?.capituloId).toBe("ventas");
    expect(primero("artist's proof")).toBeDefined();
  });
});

describe("el manual en espanol y en ingles", () => {
  const es = leerManual("es");
  const en = leerManual("en");

  it("tienen los mismos archivos, en el mismo orden", () => {
    expect(en.archivos).toEqual(es.archivos);
  });

  it("cada capitulo tiene las mismas secciones y los mismos enlaces en los dos idiomas", () => {
    es.capitulos.forEach((c, i) => {
      const otro = en.capitulos[i];
      expect(otro.id).toBe(c.id);
      expect(otro.secciones.length, `secciones de ${c.id}`).toBe(c.secciones.length);
      const enlaces = (md: string) => Array.from(md.matchAll(/\]\(cap:([a-z0-9-]+)\)/g), (m) => m[1]);
      expect(enlaces(en.markdown[i]), `enlaces de ${c.id}`).toEqual(enlaces(es.markdown[i]));
    });
  });

  it("cada capitulo tiene la misma cantidad de pasos y notas en los dos idiomas", () => {
    const conteo = (md: string) => ({
      pasos: (md.match(/^\d+\. /gm) ?? []).length,
      notas: (md.match(/^> /gm) ?? []).length,
      subtitulos: (md.match(/^### /gm) ?? []).length,
    });
    es.markdown.forEach((md, i) => expect(conteo(en.markdown[i]), es.archivos[i]).toEqual(conteo(md)));
  });
});

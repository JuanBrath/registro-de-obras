import { readdirSync, readFileSync } from "node:fs";
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

// El manual de verdad: que este bien armado y que no tenga enlaces rotos.
describe("el manual del usuario", () => {
  const carpeta = new URL("../../../../app/src/manual/contenido/", import.meta.url);
  const archivos = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const capitulos = archivos.map((f) =>
    parsearCapitulo(f.replace(/^\d+-/, "").replace(/\.md$/, ""), readFileSync(new URL(f, carpeta), "utf-8")),
  );

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
    for (const archivo of archivos) {
      const md = readFileSync(new URL(archivo, carpeta), "utf-8");
      for (const m of md.matchAll(/\]\(cap:([a-z0-9-]+)\)/g)) {
        if (!ids.has(m[1])) rotos.push(`${archivo} -> ${m[1]}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  it("no hay dos capitulos con el mismo id", () => {
    expect(new Set(capitulos.map((c) => c.id)).size).toBe(capitulos.length);
  });

  it("el buscador encuentra los temas principales", () => {
    const primero = (consulta: string) => buscarEnManual(capitulos, consulta)[0];
    expect(primero("certificado")).toBeDefined();
    expect(primero("como cambio la carpeta de datos")?.capituloId).toBe("configuracion");
    expect(primero("firma digital")).toBeDefined();
    expect(primero("anular venta")?.capituloId).toBe("ventas");
    expect(primero("prueba de autor")).toBeDefined();
  });

  it("todo su texto se puede imprimir en PDF (no queda ningun simbolo sin tipografia)", () => {
    const permitido = /^[\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\u2039\u203A\u2122\n]*$/;
    for (const archivo of archivos) {
      const original = readFileSync(new URL(archivo, carpeta), "utf-8");
      const paraPdf = textoParaPdf(original);
      const raros = Array.from(paraPdf).filter((c) => !permitido.test(c));
      expect(raros, archivo).toEqual([]);
    }
  });
});

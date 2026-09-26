import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buscarEnManual,
  parsearInline,
  resaltar,
  terminosDeBusqueda,
  type BloqueManual,
  type CapituloManual,
  type ResultadoBusqueda,
} from "@registro/core";
import { useLanguage } from "../i18n/LanguageContext.js";
import { CAPITULOS } from "./cargarManual.js";

/** Texto con las palabras buscadas marcadas. */
function Resaltado({ texto, terminos }: { texto: string; terminos: string[] }) {
  return (
    <>
      {resaltar(texto, terminos).map((tramo, i) => (tramo.coincide ? <mark key={i}>{tramo.texto}</mark> : tramo.texto))}
    </>
  );
}

/** Un texto del manual con su formato (negritas, codigo, enlaces a otros capitulos). */
function Inline({ texto, terminos, onEnlace }: { texto: string; terminos: string[]; onEnlace: (capitulo: string) => void }) {
  return (
    <>
      {parsearInline(texto).map((s, i) => {
        const contenido = <Resaltado texto={s.texto} terminos={terminos} />;
        if (s.tipo === "negrita") return <strong key={i}>{contenido}</strong>;
        if (s.tipo === "codigo") return <code key={i}>{contenido}</code>;
        if (s.tipo === "enlace") {
          return (
            <button key={i} type="button" className="link-button" onClick={() => onEnlace(s.capitulo)}>
              {contenido}
            </button>
          );
        }
        return <span key={i}>{contenido}</span>;
      })}
    </>
  );
}

function Bloque({ bloque, terminos, onEnlace }: { bloque: BloqueManual; terminos: string[]; onEnlace: (capitulo: string) => void }) {
  const inline = (texto: string): ReactNode => <Inline texto={texto} terminos={terminos} onEnlace={onEnlace} />;
  switch (bloque.tipo) {
    case "parrafo":
      return <p>{inline(bloque.texto)}</p>;
    case "subtitulo":
      return <h3>{inline(bloque.texto)}</h3>;
    case "nota":
      return <blockquote className="manual-nota">{inline(bloque.texto)}</blockquote>;
    case "lista": {
      const Lista = bloque.ordenada ? "ol" : "ul";
      return (
        <Lista>
          {bloque.items.map((item, i) => (
            <li key={i}>
              {inline(item.texto)}
              {item.subitems.length > 0 && (
                <ul>
                  {item.subitems.map((sub, j) => (
                    <li key={j}>{inline(sub)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </Lista>
      );
    }
  }
}

const idSeccion = (capituloId: string, seccionId: string) => `manual-${capituloId}-${seccionId}`;

/**
 * El manual del usuario: un indice de capitulos, el capitulo que se esta
 * leyendo y un buscador. El contenido sale de los archivos de
 * manual/contenido/ (ver cargarManual.ts).
 */
export function ManualScreen({ onBack }: { onBack: () => void }) {
  const { t, idioma } = useLanguage();
  const [capituloId, setCapituloId] = useState(CAPITULOS[0]?.id ?? "");
  const [consulta, setConsulta] = useState("");
  // Palabras que se marcan en el capitulo abierto (las de la busqueda desde la que se llego).
  const [resaltadas, setResaltadas] = useState<string[]>([]);
  const [irASeccion, setIrASeccion] = useState<string | null>(null);
  const primeraVez = useRef(true);

  const terminos = useMemo(() => terminosDeBusqueda(consulta), [consulta]);
  const buscando = terminos.length > 0;
  const resultados = useMemo(() => buscarEnManual(CAPITULOS, consulta), [consulta]);
  const indice = CAPITULOS.findIndex((c) => c.id === capituloId);
  const capitulo: CapituloManual | undefined = CAPITULOS[indice];

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Al abrir el manual no se mueve nada. Al pasar a otro capitulo se vuelve arriba, salvo que se
  // haya llegado desde un resultado de busqueda: en ese caso se lleva la vista hasta la seccion.
  const destinoPendiente = useRef<string | null>(null);
  destinoPendiente.current = irASeccion;
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (destinoPendiente.current === null) window.scrollTo(0, 0);
  }, [capituloId]);

  // Abrir una seccion (desde un resultado o desde "En este capitulo").
  useEffect(() => {
    if (irASeccion === null || buscando) return;
    document.getElementById(idSeccion(capituloId, irASeccion))?.scrollIntoView({ block: "start" });
    setIrASeccion(null);
  }, [irASeccion, buscando, capituloId]);

  function abrirCapitulo(id: string) {
    if (!CAPITULOS.some((c) => c.id === id)) return;
    setConsulta("");
    setResaltadas([]);
    setIrASeccion(null);
    setCapituloId(id);
  }

  function abrirResultado(r: ResultadoBusqueda) {
    setResaltadas(terminos);
    setConsulta("");
    setCapituloId(r.capituloId);
    setIrASeccion(r.seccionId);
  }

  return (
    <div className="manual">
      <div className="obras-list-header">
        <h1>{t("manual.titulo")}</h1>
        <button type="button" className="header-close-button" onClick={onBack} aria-label={t("common.back")} title={t("common.back")}>
          ✕
        </button>
      </div>

      {idioma !== "es" && <p className="field-note">{t("manual.soloEspanol")}</p>}

      <div className="manual-buscador">
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={t("manual.buscarPlaceholder")}
          aria-label={t("manual.buscarPlaceholder")}
          autoFocus
        />
      </div>

      <div className="manual-cuerpo">
        <nav className="manual-indice" aria-label={t("manual.indice")}>
          <h2>{t("manual.indice")}</h2>
          <ol>
            {CAPITULOS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`manual-indice-boton${!buscando && c.id === capituloId ? " activo" : ""}`}
                  onClick={() => abrirCapitulo(c.id)}
                >
                  {c.titulo}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="manual-contenido">
          {buscando ? (
            <div className="manual-resultados" role="region" aria-live="polite">
              {resultados.length === 0 ? (
                <p>{t("manual.sinResultados", { consulta: consulta.trim() })}</p>
              ) : (
                <>
                  <p className="manual-cantidad">
                    {resultados.length === 1 ? t("manual.resultadosUno") : t("manual.resultadosVarios", { n: resultados.length })}
                  </p>
                  {!resultados.some((r) => r.completo) && <p className="field-note">{t("manual.resultadosParciales")}</p>}
                  <ul>
                    {resultados.map((r) => (
                      <li key={`${r.capituloId}/${r.seccionId}`}>
                        <button type="button" className="manual-resultado" onClick={() => abrirResultado(r)}>
                          <strong>
                            {r.capituloTitulo} › {r.seccionTitulo}
                          </strong>
                          <span>
                            <Resaltado texto={r.fragmento} terminos={terminos} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" className="manual-limpiar" onClick={() => setConsulta("")}>
                {t("manual.limpiarBusqueda")}
              </button>
            </div>
          ) : (
            capitulo && (
              <article className="manual-capitulo">
                <h2 className="manual-capitulo-titulo">{capitulo.titulo}</h2>
                {capitulo.resumen && <p className="manual-resumen">{capitulo.resumen}</p>}

                {resaltadas.length > 0 && (
                  <button type="button" className="manual-limpiar" onClick={() => setResaltadas([])}>
                    {t("manual.quitarResaltado")}
                  </button>
                )}

                {capitulo.secciones.length > 1 && (
                  <div className="manual-en-este-capitulo">
                    <strong>{t("manual.enEsteCapitulo")}</strong>
                    <ul>
                      {capitulo.secciones.map((s) => (
                        <li key={s.id}>
                          <button type="button" className="link-button" onClick={() => setIrASeccion(s.id)}>
                            {s.titulo}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {capitulo.secciones.map((s) => (
                  <section key={s.id} id={idSeccion(capitulo.id, s.id)} className="manual-seccion">
                    <h3 className="manual-seccion-titulo">
                      <Resaltado texto={s.titulo} terminos={resaltadas} />
                    </h3>
                    {s.bloques.map((b, i) => (
                      <Bloque key={i} bloque={b} terminos={resaltadas} onEnlace={abrirCapitulo} />
                    ))}
                  </section>
                ))}

                <div className="manual-anterior-siguiente">
                  {indice > 0 ? (
                    <button type="button" onClick={() => abrirCapitulo(CAPITULOS[indice - 1].id)}>
                      {t("manual.capituloAnterior")}
                    </button>
                  ) : (
                    <span />
                  )}
                  {indice < CAPITULOS.length - 1 && (
                    <button type="button" onClick={() => abrirCapitulo(CAPITULOS[indice + 1].id)}>
                      {t("manual.capituloSiguiente")}
                    </button>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      </div>

      <div className="screen-footer-back">
        <button type="button" onClick={onBack}>
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}

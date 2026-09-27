import { useEffect, type RefObject } from "react";

/**
 * Convierte una grilla CSS de columnas fijas (".obras-grid") en una grilla "masonry" (tipo Pinterest): cada
 * tarjeta ocupa solo el alto que necesita, en vez de que toda la fila quede tan alta como la tarjeta más alta
 * (lo que antes dejaba un hueco debajo de las tarjetas más bajas cuando había una foto vertical al lado).
 *
 * El truco es CSS puro: la grilla define filas muy finas (`grid-auto-rows: var(--masonry-row)`, ver App.css)
 * y cada tarjeta ocupa tantas filas finas como haga falta para llegar a su alto real, calculado acá. A
 * diferencia de `grid-auto-flow: dense`, esto no reordena las tarjetas: el orden de lectura (izquierda a
 * derecha, arriba a abajo, según "Ordenar por") no cambia.
 *
 * Un ResizeObserver por tarjeta se encarga de recalcular su lugar cada vez que cambia su alto (imagen que
 * termina de cargar, ventana que cambia de ancho, más o menos columnas, letra más grande...), y un
 * MutationObserver detecta cuándo se agregan o sacan tarjetas (nuevo filtro, más obras cargadas) para
 * empezar a observarlas o dejar de hacerlo.
 */
export function useMasonryGrid(gridRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const filaPx = parseFloat(getComputedStyle(grid).getPropertyValue("--masonry-row")) || 1;

    function ubicar(tarjeta: Element) {
      const gapPx = parseFloat(getComputedStyle(grid!).rowGap) || 0;
      const alto = tarjeta.getBoundingClientRect().height;
      const span = Math.max(1, Math.ceil((alto + gapPx) / (filaPx + gapPx)));
      (tarjeta as HTMLElement).style.gridRowEnd = `span ${span}`;
    }

    const resize = new ResizeObserver((entradas) => {
      for (const entrada of entradas) ubicar(entrada.target);
    });
    for (const tarjeta of grid.children) resize.observe(tarjeta);

    const mutacion = new MutationObserver((registros) => {
      for (const registro of registros) {
        registro.removedNodes.forEach((n) => n instanceof Element && resize.unobserve(n));
        registro.addedNodes.forEach((n) => n instanceof Element && resize.observe(n));
      }
    });
    mutacion.observe(grid, { childList: true });

    return () => {
      resize.disconnect();
      mutacion.disconnect();
    };
  }, [gridRef]);
}

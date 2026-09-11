import { useEffect, useState } from "react";

const DURACION_POR_MINIATURA_MS = 3000;

/**
 * Cuando "activo", va marcando una miniatura del collage a la vez (en orden,
 * en bucle) como si el cursor estuviera posado sobre ella, para que la
 * ampliacion al pasar el mouse (ver ".workspace-picker-collage-thumb:hover"
 * en App.css) tambien se vea sola, sin necesidad de mover el cursor —
 * pensado para las pantallas de presentacion/inicio cuando nadie esta
 * interactuando con la app en ese momento. Devuelve el indice actualmente
 * "abierto", o null si esta desactivado o no hay miniaturas.
 */
export function useAutoHoverCollage(cantidad: number, activo: boolean): number | null {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!activo || cantidad === 0) return;
    setIndice(0);
    const id = window.setInterval(() => {
      setIndice((prev) => (prev + 1) % cantidad);
    }, DURACION_POR_MINIATURA_MS);
    return () => window.clearInterval(id);
  }, [activo, cantidad]);

  return activo && cantidad > 0 ? indice : null;
}

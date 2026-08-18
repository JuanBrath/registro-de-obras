import { useEffect } from "react";
import { isTauri } from "../adapters/detectPlatform.js";

// Al maximizar o pasar a pantalla completa, el webview a veces no repinta el
// contenido al tamaño real de la nueva ventana (queda con el layout viejo,
// mas chico, hasta que algo fuerza un reflow). Forzarlo explicitamente en
// cada evento de resize de la ventana nativa evita que la app se vea "trabada"
// en un tamaño anterior.
export function useForceReflowOnResize(): void {
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      if (cancelled) return;
      getCurrentWindow()
        .onResized(() => {
          const root = document.getElementById("root");
          if (!root) return;
          const previousDisplay = root.style.display;
          root.style.display = "none";
          void root.offsetHeight;
          root.style.display = previousDisplay;
        })
        .then((fn) => {
          if (cancelled) {
            fn();
          } else {
            unlisten = fn;
          }
        });
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

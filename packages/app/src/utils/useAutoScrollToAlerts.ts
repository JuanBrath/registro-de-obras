import { useEffect } from "react";

/**
 * Observa el contenido de la app y, cada vez que aparece un aviso de exito o
 * error (clases .success/.error), lo lleva a la vista con un scroll suave.
 * En pantallas largas esos avisos suelen aparecer despues del contenido
 * visible (por ejemplo, al guardar un formulario largo) y quedaban tapados
 * por el borde de la ventana sin que se notara que habia un mensaje nuevo.
 */
export function useAutoScrollToAlerts(rootSelector = "#root"): void {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    function llevarAVista(node: Node) {
      if (!(node instanceof HTMLElement)) return;
      const objetivo = node.matches(".success, .error") ? node : node.querySelector<HTMLElement>(".success, .error");
      objetivo?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(llevarAVista);
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rootSelector]);
}

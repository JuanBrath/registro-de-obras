// El webview a veces sigue mostrando el pintado anterior (una version vieja
// del contenido) por un instante despues de que el DOM ya cambio, hasta que
// algo fuerza un recalculo de layout genuino. Alternar "display" y leer
// "offsetHeight" en el medio obliga a ese recalculo inmediatamente.
export function forzarReflowDelRoot(): void {
  const root = document.getElementById("root");
  if (!root) return;
  const previousDisplay = root.style.display;
  root.style.display = "none";
  void root.offsetHeight;
  root.style.display = previousDisplay;
}

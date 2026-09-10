// Al cargar una miniatura de Obras o Galería de obras, si es mucho más alta
// que ancha se le agrega esta clase (ver App.css: .miniatura-muy-vertical)
// para que se acote su alto sin deformarla, en vez de estirarla a
// width:100% como el resto de las miniaturas.
const RATIO_MUY_VERTICAL = 1.5;
const CLASE_MUY_VERTICAL = "miniatura-muy-vertical";

export function marcarSiMiniaturaMuyVertical(img: HTMLImageElement): void {
  if (img.naturalWidth > 0 && img.naturalHeight / img.naturalWidth > RATIO_MUY_VERTICAL) {
    img.classList.add(CLASE_MUY_VERTICAL);
  } else {
    img.classList.remove(CLASE_MUY_VERTICAL);
  }
}

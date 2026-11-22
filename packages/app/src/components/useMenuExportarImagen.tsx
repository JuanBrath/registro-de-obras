import { useState, type MouseEvent, type ReactNode } from "react";
import { useLanguage } from "../i18n/LanguageContext.js";
import { MenuContextual } from "./MenuContextual.js";
import { ExportarImagenModal } from "./ExportarImagenModal.js";

export interface ObraExportable {
  titulo: string;
  nombre_completo: string | null;
  ubicacion_fisica_actual: string | null;
}

/**
 * Click derecho sobre la imagen de una obra en una lista (tarjetas o columnas): abre un menú con "Exportar imagen…",
 * que usa la misma ventana y el mismo criterio que la ficha de la obra. `onError` recibe el aviso cuando la obra no
 * tiene archivo original cargado. Devuelve `abrirMenu` (para el onContextMenu de la imagen) y `elementos` (el menú y la
 * ventana, que hay que dibujar una vez en la pantalla).
 */
export function useMenuExportarImagen(onError: (mensaje: string) => void): {
  abrirMenu: (e: MouseEvent, obra: ObraExportable) => void;
  elementos: ReactNode;
} {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<{ x: number; y: number; obra: ObraExportable } | null>(null);
  const [exportar, setExportar] = useState<ObraExportable | null>(null);

  const abrirMenu = (e: MouseEvent, obra: ObraExportable) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, obra });
  };

  const elementos = (
    <>
      {menu && (
        <MenuContextual
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: t("obraDetail.exportarImagen"),
              onClick: () => {
                if (!menu.obra.ubicacion_fisica_actual) onError(t("obraDetail.errorExportarSinArchivo"));
                else setExportar(menu.obra);
              },
            },
          ]}
        />
      )}
      {exportar?.ubicacion_fisica_actual && (
        <ExportarImagenModal
          titulo={exportar.titulo}
          nombreArtista={exportar.nombre_completo ?? ""}
          rutaOriginal={exportar.ubicacion_fisica_actual}
          onClose={() => setExportar(null)}
        />
      )}
    </>
  );

  return { abrirMenu, elementos };
}

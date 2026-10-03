import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { useWorkspace, WorkspaceProvider } from "./state/WorkspaceContext.js";
import { EdicionProvider, useEdicion } from "./state/EdicionContext.js";
import { ThemeProvider } from "./state/ThemeContext.js";
import { FontSizeProvider } from "./state/FontSizeContext.js";
import { MiniaturasModoProvider } from "./state/MiniaturasModoContext.js";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext.js";
import { useForceReflowOnResize } from "./utils/useForceReflowOnResize.js";
import { forzarReflowDelRoot } from "./utils/forzarReflowDelRoot.js";
import { useAutoScrollToAlerts } from "./utils/useAutoScrollToAlerts.js";
import { BrandHeader } from "./components/BrandHeader.js";
import { ActivarLicencia } from "./screens/ActivarLicencia.js";
import { WorkspacePicker } from "./screens/WorkspacePicker.js";
import { WorkspaceHome } from "./screens/WorkspaceHome.js";
import { ObraForm } from "./screens/ObraForm.js";
import { ObrasList, type ObrasListFiltros } from "./screens/ObrasList.js";
import { ObraDetail } from "./screens/ObraDetail.js";
import { PersonalProfileForm } from "./screens/PersonalProfileForm.js";
import { ArtistasScreen } from "./screens/ArtistasScreen.js";
import { GaleriaFotos } from "./screens/GaleriaFotos.js";
import { SettingsModal } from "./screens/SettingsModal.js";
import { VentasReport } from "./screens/VentasReport.js";
import { GaleriaProfileForm } from "./screens/GaleriaProfileForm.js";
import { ClientesScreen } from "./screens/ClientesScreen.js";
import { ManualScreen } from "./manual/ManualScreen.js";
import { isTauri } from "./adapters/detectPlatform.js";
import { borrarEnvioLightroom, leerEnvioLightroom, type RecibidoDeLightroom } from "./lightroom/lightroom.js";

type Screen =
  | { name: "home" }
  | { name: "profile" }
  | { name: "nueva-obra" }
  | { name: "obras" }
  // `volverA`: a que pantalla vuelve el boton "Volver" (por defecto, "obras") — permite abrir la ficha
  // desde Galeria de obras y que el boton de volver regrese ahi, a la misma foto, en vez de a Obras.
  | { name: "obra-detail"; obraId: number; volverA?: Screen }
  | { name: "artistas" }
  | { name: "galeria-fotos"; filtros?: ObrasListFiltros; fotoIdInicial?: number }
  | { name: "ventas" }
  | { name: "galeria-perfil" }
  | { name: "clientes" };

function WorkspaceScreens({ onManual }: { onManual: () => void }) {
  const { context, personalArtista, close } = useWorkspace();
  const { t } = useLanguage();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  // Obra que llego desde Lightroom Classic y todavia no se guardo (ver lightroom/lightroom.ts).
  const [precarga, setPrecarga] = useState<RecibidoDeLightroom | null>(null);
  const pantallaActual = useRef(screen.name);
  pantallaActual.current = screen.name;
  const revisandoLightroom = useRef(false);

  // Al salir de "Nueva obra" se olvida la precarga, para que no se vuelva a cargar al abrirla de nuevo a mano.
  useEffect(() => {
    if (screen.name !== "nueva-obra") setPrecarga(null);
  }, [screen.name]);

  // Vinculacion opcional con Lightroom Classic: al abrir el registro y cada vez que la ventana vuelve a primer
  // plano (el complemento abre Galeris Studio justo despues de dejar la foto), se revisa si llego una obra.
  // Si todavia falta el perfil, se espera: la obra queda en la carpeta hasta que se pueda cargar.
  const faltaPerfil = context?.workspace === "personal" && !personalArtista;
  useEffect(() => {
    if (!isTauri() || !context || faltaPerfil) return;
    async function revisarLightroom() {
      if (revisandoLightroom.current) return;
      revisandoLightroom.current = true;
      try {
        const recibido = await leerEnvioLightroom();
        if (!recibido) return;
        const abiertaConCambios = pantallaActual.current === "nueva-obra" || pantallaActual.current === "obra-detail";
        if (
          abiertaConCambios &&
          !(await ask(t("lightroom.confirmar"), {
            title: "Lightroom Classic",
            kind: "warning",
            okLabel: t("lightroom.cargarLaObra"),
            cancelLabel: t("common.cancel"),
          }))
        ) {
          await borrarEnvioLightroom();
          return;
        }
        await borrarEnvioLightroom();

        // Si el archivo original ya se habia cargado antes (misma ruta guardada en otra obra),
        // se abre esa ficha en vez de armar una obra nueva y duplicada.
        const ruta = recibido.envio.rutaOriginal;
        if (ruta && context!.workspace === "personal") {
          const existentes = await context!.db.query<{ id: number }>(
            `SELECT id FROM obra WHERE ubicacion_fisica_actual = ? LIMIT 1`,
            [ruta],
          );
          if (existentes.length > 0) {
            setScreen({ name: "obra-detail", obraId: existentes[0].id });
            return;
          }
        }

        setPrecarga(recibido);
        setScreen({ name: "nueva-obra" });
      } catch {
        // Si no se pudo leer lo que mando Lightroom, no pasa nada: se puede volver a mandar.
      } finally {
        revisandoLightroom.current = false;
      }
    }
    void revisarLightroom();
    window.addEventListener("focus", revisarLightroom);
    return () => window.removeEventListener("focus", revisarLightroom);
  }, [context, faltaPerfil, t]);

  // Sin esto, cambiar de pantalla arrastra el scroll de la pantalla
  // anterior a la nueva: entre dos pantallas largas como Obras y Galeria de
  // obras, si la anterior estaba scrolleada hacia abajo, por una fraccion
  // de segundo se sigue viendo su contenido en esa posicion antes de que la
  // pantalla nueva la corrija — un destello que parece que "la pantalla
  // anterior se reabre" antes de mostrar la de destino.
  //
  // Usa useLayoutEffect (no useEffect) a proposito: corre de forma
  // sincronica justo despues de que React cambia el DOM pero ANTES de que
  // el navegador pinte esa pantalla — si fuera useEffect (que corre
  // despues del primer pintado), el destello ya se habria visto una vez
  // antes de corregirse. forzarReflowDelRoot ataca la otra mitad del mismo
  // sintoma: el webview a veces sigue mostrando un pintado viejo de la
  // pantalla anterior superpuesto un instante hasta que algo lo obliga a
  // recalcular — el mismo problema que ya se resolvia al cambiar el tamano
  // de la ventana (ver useForceReflowOnResize), ahora tambien al cambiar
  // de pantalla.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    forzarReflowDelRoot();
  }, [screen.name]);

  if (!context) return null;

  // Si ya estamos en "home", no dispara un cambio de estado: evita un
  // re-render innecesario cuando algun "Volver" lo llama estando ya ahi.
  const goHome = () => setScreen((prev) => (prev.name === "home" ? prev : { name: "home" }));
  const needsPersonalProfile = context.workspace === "personal" && !personalArtista;
  const activeScreen: Screen = needsPersonalProfile ? { name: "profile" } : screen;

  let content: ReactNode;
  switch (activeScreen.name) {
    case "profile":
      // Sin perfil todavia no hay "home" al que volver dentro del workspace
      // (needsPersonalProfile fuerza esta pantalla): la unica salida real es
      // cerrar el workspace y volver al selector Personal/Galeria.
      content = <PersonalProfileForm onExit={needsPersonalProfile ? close : goHome} />;
      break;
    case "nueva-obra":
      content = (
        <ObraForm
          key={precarga?.envio.id || "nueva"}
          precarga={precarga ?? undefined}
          onCancel={() => setScreen({ name: "obras" })}
          onViewObra={(obraId) => setScreen({ name: "obra-detail", obraId })}
          onVerObras={() => setScreen({ name: "obras" })}
          onEditProfile={context.workspace === "personal" ? () => setScreen({ name: "profile" }) : undefined}
        />
      );
      break;
    case "obras":
      content = (
        <ObrasList
          onBack={goHome}
          onOpenObra={(obraId) => setScreen({ name: "obra-detail", obraId })}
          onNuevaObra={() => setScreen({ name: "nueva-obra" })}
          onVerGaleria={(filtros) => setScreen({ name: "galeria-fotos", filtros })}
        />
      );
      break;
    case "obra-detail":
      content = (
        <ObraDetail
          obraId={activeScreen.obraId}
          onBack={() => setScreen(activeScreen.volverA ?? { name: "obras" })}
          volverALabel={activeScreen.volverA?.name === "galeria-fotos" ? t("obraDetail.volverAGaleria") : undefined}
        />
      );
      break;
    case "artistas":
      content = <ArtistasScreen onBack={goHome} />;
      break;
    case "galeria-fotos":
      content = (
        <GaleriaFotos
          onBack={() => setScreen({ name: "obras" })}
          filtrosIniciales={activeScreen.filtros}
          fotoIdInicial={activeScreen.fotoIdInicial}
          onOpenObra={(obraId, filtros) =>
            setScreen({ name: "obra-detail", obraId, volverA: { name: "galeria-fotos", filtros, fotoIdInicial: obraId } })
          }
        />
      );
      break;
    case "ventas":
      content = <VentasReport onBack={goHome} />;
      break;
    case "galeria-perfil":
      content = <GaleriaProfileForm onBack={goHome} />;
      break;
    case "clientes":
      content = <ClientesScreen onBack={goHome} />;
      break;
    case "home":
    default:
      content = (
        <WorkspaceHome
          onEditProfile={() => setScreen({ name: "profile" })}
          onVerObras={() => setScreen({ name: "obras" })}
          onArtistas={() => setScreen({ name: "artistas" })}
          onVentas={() => setScreen({ name: "ventas" })}
          onGaleriaPerfil={() => setScreen({ name: "galeria-perfil" })}
          onClientes={() => setScreen({ name: "clientes" })}
          onManual={onManual}
        />
      );
  }

  return content;
}

function AppShell() {
  const { context, close } = useWorkspace();
  const { edicion, estadoLicencia } = useEdicion();
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  // El manual se lee tanto desde la pantalla de presentacion como desde el
  // inicio de un registro abierto: al cerrarlo se vuelve a donde se estaba.
  const [showManual, setShowManual] = useState(false);
  useForceReflowOnResize();
  useAutoScrollToAlerts();

  // La edicion depende de la licencia activa (ver EdicionContext.tsx): si
  // cambia mientras hay un workspace abierto (por ejemplo, se cargo una
  // licencia distinta desde Configuracion al renovar o cambiar de plan),
  // conviene volver a la pantalla de seleccion en vez de dejar abierto un
  // workspace que la nueva licencia podria ya no habilitar.
  useEffect(() => {
    if (context) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicion]);

  return (
    <>
      <div className="app-topbar">
        <BrandHeader size="navbar" />
        <button
          type="button"
          className="settings-gear-button"
          onClick={() => setShowSettings(true)}
          aria-label={t("common.settings")}
        >
          ⚙
        </button>
      </div>
      {showManual ? (
        <ManualScreen onBack={() => setShowManual(false)} />
      ) : estadoLicencia.estado === "cargando" ? null : estadoLicencia.estado !== "valida" ? (
        <ActivarLicencia />
      ) : context ? (
        <WorkspaceScreens key={context.workspace} onManual={() => setShowManual(true)} />
      ) : (
        <WorkspacePicker onManual={() => setShowManual(true)} />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <FontSizeProvider>
          <MiniaturasModoProvider>
            <EdicionProvider>
              <WorkspaceProvider>
                <AppShell />
              </WorkspaceProvider>
            </EdicionProvider>
          </MiniaturasModoProvider>
        </FontSizeProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

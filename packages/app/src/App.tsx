import { useEffect, useState, type ReactNode } from "react";
import "./App.css";
import { useWorkspace, WorkspaceProvider } from "./state/WorkspaceContext.js";
import { EdicionProvider, useEdicion } from "./state/EdicionContext.js";
import { ThemeProvider } from "./state/ThemeContext.js";
import { FontSizeProvider } from "./state/FontSizeContext.js";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext.js";
import { useForceReflowOnResize } from "./utils/useForceReflowOnResize.js";
import { BrandHeader } from "./components/BrandHeader.js";
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

type Screen =
  | { name: "home" }
  | { name: "profile" }
  | { name: "nueva-obra" }
  | { name: "obras" }
  | { name: "obra-detail"; obraId: number }
  | { name: "artistas" }
  | { name: "galeria-fotos"; filtros?: ObrasListFiltros }
  | { name: "ventas" }
  | { name: "galeria-perfil" }
  | { name: "clientes" };

function WorkspaceScreens() {
  const { context, personalArtista, close } = useWorkspace();
  const [screen, setScreen] = useState<Screen>({ name: "home" });

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
      content = (
        <PersonalProfileForm
          onExit={needsPersonalProfile ? close : goHome}
          onCancel={needsPersonalProfile ? close : goHome}
        />
      );
      break;
    case "nueva-obra":
      content = (
        <ObraForm
          onCancel={goHome}
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
      content = <ObraDetail obraId={activeScreen.obraId} onBack={() => setScreen({ name: "obras" })} />;
      break;
    case "artistas":
      content = <ArtistasScreen onBack={goHome} />;
      break;
    case "galeria-fotos":
      content = (
        <GaleriaFotos onBack={() => setScreen({ name: "obras" })} filtrosIniciales={activeScreen.filtros} />
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
        />
      );
  }

  return content;
}

function AppShell() {
  const { context, close } = useWorkspace();
  const { edicion } = useEdicion();
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  useForceReflowOnResize();

  // El menú "Edición (prueba)" es solo para previsualizar que mostraría cada
  // nivel de suscripción — cambiarlo mientras hay un workspace abierto tiene
  // que devolver a la pantalla de selección para ver el efecto ahí mismo, ya
  // que ningún otro lugar de la app lee "edicion".
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
      {context ? <WorkspaceScreens key={context.workspace} /> : <WorkspacePicker />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <FontSizeProvider>
          <EdicionProvider>
            <WorkspaceProvider>
              <AppShell />
            </WorkspaceProvider>
          </EdicionProvider>
        </FontSizeProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

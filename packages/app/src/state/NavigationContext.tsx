import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface NavigationContextValue {
  goHome: () => void;
  setGoHome: (fn: (() => void) | null) => void;
}

const NavigationReactContext = createContext<NavigationContextValue | null>(null);

// El provider vive arriba de todo (junto a la franja fija con BrandHeader),
// pero "a donde ir" lo define la pantalla activa (WorkspaceScreens) via
// useRegisterGoHome — asi BrandHeader puede navegar "a inicio" desde
// cualquier lugar sin que la franja fija tenga que conocer el router interno.
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [goHomeFn, setGoHomeFn] = useState<(() => void) | null>(null);

  const value = useMemo<NavigationContextValue>(
    () => ({
      goHome: () => goHomeFn?.(),
      setGoHome: setGoHomeFn,
    }),
    [goHomeFn],
  );

  return <NavigationReactContext.Provider value={value}>{children}</NavigationReactContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationReactContext);
  if (!ctx) throw new Error("useNavigation debe usarse dentro de NavigationProvider");
  return ctx;
}

// Registra el "goHome" de la pantalla activa. Sin workspace abierto (en
// WorkspacePicker) nadie lo registra, asi que BrandHeader.goHome() queda en
// no-op: correcto, ahi ya se esta "en el inicio".
export function useRegisterGoHome(goHome: () => void): void {
  const { setGoHome } = useNavigation();
  useEffect(() => {
    setGoHome(() => goHome);
    return () => setGoHome(null);
  }, [goHome, setGoHome]);
}

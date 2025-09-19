import { createContext, useContext, useState, ReactNode } from "react";

interface TopBarConfig {
  showSearchBar?: boolean;
  showActionButtons?: boolean;
}

interface TopBarContextType {
  config: TopBarConfig;
  setConfig: (config: TopBarConfig) => void;
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined);

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TopBarConfig>({});

  return (
    <TopBarContext.Provider value={{ config, setConfig }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  const context = useContext(TopBarContext);
  if (!context) {
    throw new Error("useTopBar must be used within TopBarProvider");
  }
  return context;
}

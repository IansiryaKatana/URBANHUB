import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SeoFlags = {
  isNotFound: boolean;
  setIsNotFound: (value: boolean) => void;
};

const SeoFlagsContext = createContext<SeoFlags>({
  isNotFound: false,
  setIsNotFound: () => {},
});

export function SeoFlagsProvider({ children }: { children: ReactNode }) {
  const [isNotFound, setIsNotFound] = useState(false);
  const value = useMemo(() => ({ isNotFound, setIsNotFound }), [isNotFound]);
  return <SeoFlagsContext.Provider value={value}>{children}</SeoFlagsContext.Provider>;
}

export function useSeoFlags() {
  return useContext(SeoFlagsContext);
}

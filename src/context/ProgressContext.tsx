"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ProgressStore } from "@/lib/progress-store";

const ProgressStoreContext = createContext<ProgressStore | null>(null);

interface ProgressStoreProviderProps {
  readonly store: ProgressStore;
  readonly children: ReactNode;
}

export function ProgressStoreProvider({ store, children }: ProgressStoreProviderProps) {
  return (
    <ProgressStoreContext.Provider value={store}>{children}</ProgressStoreContext.Provider>
  );
}

export function useProgressStore(): ProgressStore {
  const store = useContext(ProgressStoreContext);
  if (!store) {
    throw new Error("useProgressStore must be used inside <ProgressStoreProvider>");
  }
  return store;
}

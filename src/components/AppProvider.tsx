"use client";

import { createContext, useContext } from "react";
import type { Family, FamilyMember } from "@/lib/types";

interface AppContextValue {
  userId: string;
  family: Family;
  member: FamilyMember;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

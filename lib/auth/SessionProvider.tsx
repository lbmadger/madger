"use client";

import { createContext, useContext, type ReactNode } from "react";

// Expose l'utilisateur connecté (résolu côté serveur dans le layout) aux
// composants client du dashboard, sans refaire d'appel réseau ni flash.

export type SessionUser = {
  email: string;
  slug: string | null;
};

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionUser {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession doit être utilisé dans un <SessionProvider>.");
  }
  return ctx;
}

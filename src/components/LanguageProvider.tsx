"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { LanguageMode } from "@/lib/membrane";

interface LanguageContextValue {
  mode: LanguageMode;
}

const LanguageContext = createContext<LanguageContextValue>({ mode: "REAL" });

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/**
 * LanguageProvider — wraps the app to provide REAL vs TRUE language mode.
 *
 * Rules:
 * - Default: REAL (public, unauthenticated)
 * - contributor/admin: TRUE (internal terms visible)
 * - Can be overridden with `forceMode` prop for testing
 */
export function LanguageProvider({
  children,
  forceMode,
}: {
  children: ReactNode;
  forceMode?: LanguageMode;
}) {
  const { accessRole } = useAuth();

  const mode = useMemo<LanguageMode>(() => {
    if (forceMode) return forceMode;
    // Only contributors and admins see TRUE language
    if (accessRole === "contributor" || accessRole === "admin") {
      return "TRUE";
    }
    return "REAL";
  }, [forceMode, accessRole]);

  return (
    <LanguageContext.Provider value={{ mode }}>
      {children}
    </LanguageContext.Provider>
  );
}

import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Centre } from "../types/centre";
import { initDatabase, saveCentre, getCentreByCode } from "../db/database";

const ACTIVE_CENTRE_KEY = "active_centre_code";

// ── Code generator ────────────────────────────────────────────────────────────
// 32-char alphabet without I/O/0/1 to avoid visual confusion
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
  return `${seg()}-${seg()}`;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CentreContextValue {
  centre: Centre | null;
  loading: boolean;
  registerCentre: (name: string) => Promise<string>; // returns generated code
  loginWithCode: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const CentreContext = createContext<CentreContextValue | null>(null);

export function useCentre(): CentreContextValue {
  const ctx = useContext(CentreContext);
  if (!ctx) throw new Error("useCentre must be used inside CentreProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CentreProvider({ children }: { children: React.ReactNode }) {
  const [centre, setCentre] = useState<Centre | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialise DB and restore last active centre on startup
  useEffect(() => {
    (async () => {
      try {
        initDatabase();
        const stored = await SecureStore.getItemAsync(ACTIVE_CENTRE_KEY);
        if (stored) {
          const found = getCentreByCode(stored);
          if (found) setCentre(found);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const registerCentre = async (name: string): Promise<string> => {
    const code = generateCode();
    const newCentre: Centre = { code, name: name.trim(), createdAt: new Date().toISOString() };
    saveCentre(newCentre);
    await SecureStore.setItemAsync(ACTIVE_CENTRE_KEY, code);
    setCentre(newCentre);
    return code;
  };

  const loginWithCode = async (code: string): Promise<boolean> => {
    const found = getCentreByCode(code.trim().toUpperCase());
    if (!found) return false;
    await SecureStore.setItemAsync(ACTIVE_CENTRE_KEY, found.code);
    setCentre(found);
    return true;
  };

  const logout = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(ACTIVE_CENTRE_KEY);
    setCentre(null);
  };

  return (
    <CentreContext.Provider value={{ centre, loading, registerCentre, loginWithCode, logout }}>
      {children}
    </CentreContext.Provider>
  );
}

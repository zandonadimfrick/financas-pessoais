import { create } from "zustand";

export type Escopo = "PF" | "PJ" | "ALL";

interface EscopoState {
  escopo: Escopo;
  setEscopo: (escopo: Escopo) => void;
}

/**
 * Store global do escopo ativo (Pessoa Física / Pessoa Jurídica / Todos).
 * Consumido pela Topbar e por qualquer página/hook que precise filtrar
 * dados por escopo.
 */
export const useEscopoStore = create<EscopoState>((set) => ({
  escopo: "ALL",
  setEscopo: (escopo) => set({ escopo }),
}));

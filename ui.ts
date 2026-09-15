"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SortKey } from "@/lib/utils";

export type Language = "fr" | "en" | "ar";

export interface SectionFilter {
  category: string;
  sort: SortKey;
  query: string;
  view: "grid" | "list";
  mode: "cat" | "country";
  country: string;
}

export const DEFAULT_FILTER: SectionFilter = {
  category: "",
  sort: "added",
  query: "",
  view: "grid",
  mode: "cat",
  country: "us",
};

interface UIState {
  filters: Record<string, SectionFilter>;
  searchQuery: string;
  language: Language;
  patchFilter: (key: string, patch: Partial<SectionFilter>) => void;
  setSearchQuery: (q: string) => void;
  setLanguage: (lang: Language) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      filters: {},
      searchQuery: "",
      language: "fr",
      patchFilter: (key, patch) =>
        set((s) => ({
          filters: { ...s.filters, [key]: { ...DEFAULT_FILTER, ...s.filters[key], ...patch } },
        })),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: "G-Player-ui" },
  ),
);
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Profile, StreamKind } from "@/lib/xtream/types";

export interface WatchProgress {
  key: string;
  kind: StreamKind;
  id: string;
  seriesId?: string;
  title: string;
  poster?: string;
  ext: string;
  position: number;
  duration: number;
  updatedAt: number;
}

export interface FavItem {
  id: number;
  name: string;
  poster?: string;
  ext?: string;
}

interface FavSets {
  live: FavItem[];
  movie: FavItem[];
  series: FavItem[];
}

export interface FreeFavItem {
  url: string;
  name: string;
  logo?: string;
}

interface LibraryState {
  profiles: Profile[];
  favourites: FavSets;
  freeFavourites: FreeFavItem[];
  progress: Record<string, WatchProgress>;
  recentLive: number[];

  addProfile: (p: Profile) => void;
  removeProfile: (id: string) => void;
  toggleFav: (kind: keyof FavSets, item: FavItem) => void;
  isFav: (kind: keyof FavSets, id: number) => boolean;
  toggleFreeFav: (item: FreeFavItem) => void;
  isFreeFav: (url: string) => boolean;
  saveProgress: (p: WatchProgress) => void;
  clearProgress: (key: string) => void;
  pushRecentLive: (id: number) => void;
}

// Storage factice pour le serveur SSR qui n'émet aucun warning
const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const safeStorage = createJSONStorage(() => {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return window.localStorage;
  }
  return dummyStorage;
});

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      profiles: [],
      favourites: { live: [], movie: [], series: [] },
      freeFavourites: [],
      progress: {},
      recentLive: [],

      addProfile: (p) =>
        set((s) => ({
          profiles: [p, ...s.profiles.filter((x) => x.id !== p.id)].slice(0, 8),
        })),
      removeProfile: (id) => set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),

      toggleFav: (kind, item) =>
        set((s) => {
          const list = s.favourites?.[kind] || [];
          const has = list.some((x) => x.id === item.id);
          return {
            favourites: {
              ...s.favourites,
              [kind]: has ? list.filter((x) => x.id !== item.id) : [item, ...list],
            },
          };
        }),
      isFav: (kind, id) => (get().favourites?.[kind] || []).some((x) => x.id === id),

      toggleFreeFav: (item) =>
        set((s) => {
          const list = s.freeFavourites || [];
          const has = list.some((x) => x.url === item.url);
          return {
            freeFavourites: has ? list.filter((x) => x.url !== item.url) : [item, ...list],
          };
        }),
      isFreeFav: (url) => (get().freeFavourites || []).some((x) => x.url === url),

      saveProgress: (p) =>
        set((s) => {
          if (p.duration > 0 && p.position / p.duration > 0.95) {
            const next = { ...s.progress };
            delete next[p.key];
            return { progress: next };
          }
          return { progress: { ...s.progress, [p.key]: p } };
        }),
      clearProgress: (key) =>
        set((s) => {
          const next = { ...s.progress };
          delete next[key];
          return { progress: next };
        }),

      pushRecentLive: (id) =>
        set((s) => ({
          recentLive: [id, ...(s.recentLive || []).filter((x) => x !== id)].slice(0, 24),
        })),
    }),
    {
      name: "G-Player-library",
      version: 3,
      storage: safeStorage,
      skipHydration: true,
    }
  )
);

export function continueWatching(progress: Record<string, WatchProgress>): WatchProgress[] {
  if (!progress) return [];
  return Object.values(progress)
    .filter(
      (p) => (p.kind === "movie" || p.kind === "series") && p.duration > 0 && p.position > 5
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

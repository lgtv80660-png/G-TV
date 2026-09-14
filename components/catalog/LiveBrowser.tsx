"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tv, Maximize } from "lucide-react";
import { useLiveCategories, useLiveStreams } from "@/lib/hooks";
import { SmartImage } from "@/components/ui/SmartImage";
import { useUI, DEFAULT_FILTER } from "@/store/ui";
import { sortItems, cleanName, cn } from "@/lib/utils";
import type { LiveStream } from "@/lib/xtream/types";

export function LiveBrowser() {
  // 1. Récupération et filtrage des catégories (Exclusion de "Free TV")
  const { data: allCats = [] } = useLiveCategories();
  const cats = useMemo(() => {
    return allCats.filter(c => !c.category_name.toLowerCase().includes('free'));
  }, [allCats]);

  // 2. Gestion de l'état (Filtres et sélection)
  const filter = useUI((s) => s.filters.live ?? DEFAULT_FILTER);
  const patchFilter = useUI((s) => s.patchFilter);
  const category = filter.category || "all";
  const { sort, query } = filter;

  const setCategory = (id: string) => patchFilter("live", { category: id });

  // État local pour la chaîne sélectionnée dans l'aperçu
  const [activeChannel, setActiveChannel] = useState<LiveStream | null>(null);

  // 3. Récupération et filtrage des chaînes
  const { data, isLoading } = useLiveStreams(category === "all" ? undefined : category);

  const filtered = useMemo(() => {
    let items = data ?? [];
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((c) => cleanName(c.name).toLowerCase().includes(q));
    return sortItems(items, sort);
  }, [data, query, sort]);

  // Génération de l'URL du lecteur G-Player
  const watchUrl = activeChannel 
    ? `/watch?type=live&id=${activeChannel.stream_id}&ext=ts&title=${encodeURIComponent(cleanName(activeChannel.name))}`
    : null;

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden border-t border-white/5">
      
      {/* COLONNE 1 : Catégories (Fixe et verticale) */}
      <div className="w-1/4 max-w-[280px] shrink-0 border-r border-white/5 bg-ink-900/50 flex flex-col">
        <div className="p-4 border-b border-white/5 font-semibold text-fog-200">Catégories</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setCategory("all")}
            className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", category === "all" ? "bg-iris-500/20 text-iris-400" : "hover:bg-ink-800 text-fog-400")}
          >
            Toutes les chaînes
          </button>
          {cats.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setCategory(c.category_id)}
              className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate", category === c.category_id ? "bg-iris-500/20 text-iris-400" : "hover:bg-ink-800 text-fog-400")}
            >
              {c.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* COLONNE 2 : Chaînes (Liste verticale) */}
      <div className="w-1/3 min-w-[300px] shrink-0 border-r border-white/5 bg-ink-900/30 flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="font-semibold text-fog-200">Chaînes</span>
          <span className="text-xs text-fog-500">{filtered.length} chaînes</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <p className="text-center text-sm text-fog-500 mt-10">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-fog-500 mt-10">Aucune chaîne</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.stream_id}
                onClick={() => setActiveChannel(c)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                  activeChannel?.stream_id === c.stream_id ? "bg-ink-800" : "hover:bg-ink-850"
                )}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink-950 overflow-hidden">
                  {c.stream_icon ? (
                    <SmartImage src={c.stream_icon} alt={c.name} className="h-10 w-10" />
                  ) : (
                    <Tv className="h-5 w-5 text-fog-600" />
                  )}
                </div>
                <span className="truncate text-sm font-medium text-fog-200 flex-1">{cleanName(c.name)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* COLONNE 3 : Aperçu du Player */}
      <div className="flex-1 bg-ink-950 flex flex-col p-6">
        {activeChannel ? (
          <div className="w-full max-w-5xl mx-auto space-y-4">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative border border-white/10 shadow-2xl group">
              
              {/* Le lecteur vidéo s'affiche ici */}
              <iframe 
                src={watchUrl!} 
                className="w-full h-full pointer-events-none"
                allow="autoplay; fullscreen"
              />
              
              {/* Overlay cliquable pour passer en plein écran */}
              <Link 
                href={watchUrl!}
                className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <div className="bg-iris-500 text-ink-950 px-6 py-3 rounded-full font-bold flex items-center gap-2 transform hover:scale-105 transition-transform">
                  <Maximize className="h-5 w-5" />
                  Regarder en plein écran
                </div>
              </Link>
            </div>
            
            <div className="px-2">
              <h2 className="text-2xl font-bold text-white">{cleanName(activeChannel.name)}</h2>
              <p className="text-fog-400 mt-1 text-sm">Cliquez sur la vidéo pour basculer vers le lecteur complet.</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-fog-500 space-y-4">
            <Tv className="h-16 w-16 opacity-20" />
            <p>Sélectionnez une chaîne dans la liste pour afficher l'aperçu</p>
          </div>
        )}
      </div>

    </div>
  );
}

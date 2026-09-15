"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Maximize, X } from "lucide-react";
import { useSeriesInfo } from "@/lib/hooks";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { cleanName, cn } from "@/lib/utils";
import type { Episode } from "@/lib/xtream/types";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSeriesInfo(id);

  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);

  // Normalisation des métadonnées (info vs series_info vs racine)
  const info = data?.info || data?.series_info || data || {};
  const episodesBySeason = data?.episodes ?? {};
  const seasons = Object.keys(episodesBySeason);

  // Auto-sélection de la première saison disponible
  useEffect(() => {
    if (seasons.length > 0 && (!selectedSeason || !episodesBySeason[selectedSeason])) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason, episodesBySeason]);

  const currentSeasonKey = selectedSeason || (seasons.length > 0 ? seasons[0] : "");
  const currentEpisodes = episodesBySeason[currentSeasonKey] ?? [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-12 w-1/3 rounded-xl" />
      </div>
    );
  }

  if (isError || !data || Object.keys(info).length === 0) {
    return (
      <div className="p-16 text-center text-red-400 space-y-4">
        <p>{(error as Error)?.message || "Impossible de charger la série."}</p>
        <Link href="/series" className="inline-block px-4 py-2 bg-white/10 rounded-xl text-xs text-white">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover;

  const watchUrl = activeEpisode
    ? `/watch?type=series&id=${activeEpisode.id}&ext=${activeEpisode.container_extension || "mp4"}&title=${encodeURIComponent(cleanName(activeEpisode.title))}`
    : null;

  return (
    <div className="min-h-screen bg-ink-950 text-white p-6 space-y-6">
      
      {/* Bouton Retour */}
      <Link href="/series" className="inline-flex items-center gap-2 text-sm text-fog-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Retour aux séries
      </Link>

      {/* BANNIÈRE HERO EN FOND D'ÉCRAN */}
      <div className="relative min-h-[380px] rounded-3xl overflow-hidden border border-white/10 flex flex-col justify-end p-8 shadow-2xl">
        
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <SmartImage 
              src={backdropUrl} 
              alt={info.name || "Hero"} 
              className="w-full h-full object-cover object-center" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/40 to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-end">
          {Boolean(info.cover) && (
            <div className="w-44 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
              <SmartImage src={info.cover!} alt={info.name || "Cover"} className="w-full h-auto object-cover" />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
              {cleanName(info.name || "")}
            </h1>
            
            <div className="flex items-center gap-3 text-sm font-medium text-fog-300">
              {info.releaseDate && <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full">{info.releaseDate}</span>}
              {info.rating && <span className="text-amber-400 font-bold">★ {info.rating}</span>}
              {info.genre && <span>• {info.genre}</span>}
            </div>

            {info.plot && (
              <p className="text-sm text-fog-200 max-w-4xl leading-relaxed line-clamp-3 drop-shadow">
                {info.plot}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DISPOSITION EN 2 COLONNES */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LECTEUR D'APERÇU À GAUCHE */}
        {activeEpisode && watchUrl && (
          <div className="w-full lg:w-1/2 shrink-0 space-y-3 bg-ink-900/90 p-5 rounded-3xl border border-iris-500/30 shadow-2xl sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-iris-400">
                Aperçu Épisode {activeEpisode.episode_num}
              </span>
              <button
                onClick={() => setActiveEpisode(null)}
                className="text-fog-500 hover:text-white p-1 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden relative border border-white/10 group shadow-inner">
              <iframe
                src={watchUrl}
                className="w-full h-full pointer-events-none"
                allow="autoplay; fullscreen"
              />
              <Link
                href={watchUrl}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
              >
                <div className="bg-iris-500 text-ink-950 px-6 py-3 rounded-full font-bold flex items-center gap-2 transform hover:scale-105 transition-transform shadow-xl">
                  <Maximize className="h-5 w-5" />
                  Plein écran
                </div>
              </Link>
            </div>

            <div className="pt-2">
              <h3 className="text-lg font-bold text-white leading-snug">{cleanName(activeEpisode.title)}</h3>
              <p className="text-xs text-fog-400 mt-1">Saison {currentSeasonKey} • Épisode {activeEpisode.episode_num}</p>
            </div>
          </div>
        )}

        {/* LISTE DES SAISONS ET ÉPISODES */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Onglets des Saisons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5">
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSelectedSeason(s);
                  setActiveEpisode(null);
                }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0",
                  currentSeasonKey === s
                    ? "bg-iris-500 text-ink-950 shadow-lg shadow-iris-500/20"
                    : "bg-ink-900 text-fog-400 hover:bg-ink-850 hover:text-white"
                )}
              >
                Saison {s}
              </button>
            ))}
          </div>

          {/* Liste des Épisodes */}
          <div className="space-y-2.5">
            {currentEpisodes.map((ep: Episode) => {
              const isSelected = activeEpisode?.id === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group",
                    isSelected
                      ? "bg-ink-800 border border-iris-500/50 shadow-md"
                      : "bg-ink-900/60 hover:bg-ink-850 border border-white/5"
                  )}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-950 text-iris-400 font-bold text-sm border border-white/5 group-hover:border-iris-500/30">
                    {ep.episode_num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-base font-medium text-fog-100 group-hover:text-white">
                      {cleanName(ep.title)}
                    </p>
                    {ep.info?.duration && <p className="text-xs text-fog-500 mt-0.5">{ep.info.duration}</p>}
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-800 text-fog-400 group-hover:bg-iris-500 group-hover:text-ink-950 transition-colors">
                    <Play className="h-4.5 w-4.5 translate-x-0.5 fill-current" />
                  </div>
                </button>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}

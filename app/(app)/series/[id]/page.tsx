"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { api, streamSrc } from "@/lib/api";
import { SeriesInfo, Episode } from "@/lib/xtream/types";
import { Play, Star, Calendar, Tv } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeriesDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [info, setInfo] = useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSeriesInfo() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.seriesInfo(id);

        if (isMounted) {
          setInfo(data);
          // Sélectionne la première saison disponible par défaut
          if (data?.episodes && Object.keys(data.episodes).length > 0) {
            const seasonNumbers = Object.keys(data.episodes)
              .map(Number)
              .sort((a, b) => a - b);
            setSelectedSeason(seasonNumbers[0] || 1);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de la série :", err);
        if (isMounted) {
          setError("Impossible de charger les détails de cette série.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSeriesInfo();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-destructive">{error || "Série introuvable"}</h2>
        <Link
          href="/series"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retour aux séries
        </Link>
      </div>
    );
  }

  const seriesData = info.info || {};
  const episodesBySeason = info.episodes || {};
  const seasonsList = Object.keys(episodesBySeason)
    .map(Number)
    .sort((a, b) => a - b);

  const currentEpisodes: Episode[] = episodesBySeason[selectedSeason] || [];

  return (
    <div className="min-h-screen pb-12">
      <TopBar title={seriesData.name || "Détails de la série"} />

      <main className="container mx-auto px-4 pt-6 space-y-8">
        {/* Banner / Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-card p-6 md:p-8 shadow-lg border border-border">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Poster */}
            {seriesData.cover ? (
              <div className="relative aspect-[2/3] w-full md:w-56 shrink-0 overflow-hidden rounded-xl bg-muted shadow-md">
                <img
                  src={
                    seriesData.cover.startsWith("http://")
                      ? `/api/hls?u=${encodeURIComponent(seriesData.cover)}`
                      : seriesData.cover
                  }
                  alt={seriesData.name || "Cover"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[2/3] w-full md:w-56 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Tv className="h-16 w-16" />
              </div>
            )}

            {/* Infos */}
            <div className="space-y-4 flex-1">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
                {seriesData.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {seriesData.releaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{seriesData.releaseDate}</span>
                  </div>
                )}
                {seriesData.rating && (
                  <div className="flex items-center gap-1 text-yellow-500 font-medium">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{seriesData.rating}</span>
                  </div>
                )}
                {seriesData.genre && (
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                    {seriesData.genre}
                  </span>
                )}
              </div>

              {seriesData.plot && (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4">
                  {seriesData.plot}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sélecteur de Saisons avec défilement fluide / Swipe tactile */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Saisons</h2>
          
          <div className="w-full overflow-x-auto overflow-y-hidden py-2 touch-pan-x scrollbar-none snap-x active:cursor-grabbing cursor-grab">
            <div className="flex gap-3 w-max px-1">
              {seasonsList.map((seasonNum) => {
                const isSelected = selectedSeason === seasonNum;
                return (
                  <button
                    key={seasonNum}
                    onClick={() => setSelectedSeason(seasonNum)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 snap-start select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg scale-105"
                        : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    Saison {seasonNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Liste des Épisodes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Épisodes - Saison {selectedSeason} ({currentEpisodes.length})
          </h3>

          {currentEpisodes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucun épisode disponible pour cette saison.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentEpisodes.map((ep) => {
                const episodeTitle = ep.title || `Épisode ${ep.episode_num}`;
                const containerExt = ep.container_extension || "mp4";
                const watchUrl = `/watch?type=series&id=${ep.id}&ext=${containerExt}&title=${encodeURIComponent(
                  `${seriesData.name || "Série"} - S${selectedSeason}E${ep.episode_num}`
                )}`;

                return (
                  <Link
                    key={ep.id}
                    href={watchUrl}
                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-primary">
                          Épisode {ep.episode_num}
                        </span>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary line-clamp-1">
                          {episodeTitle}
                        </h4>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    {ep.info?.plot && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                        {ep.info.plot}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

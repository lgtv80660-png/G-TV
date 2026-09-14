"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SeriesDetailPage() {
  const { id } = useParams();
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<string>("1");
  const [activeEpisode, setActiveEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .seriesInfo(id as string)
      .then((data) => {
        setSeriesInfo(data);
        // Sélectionne la première saison disponible par défaut
        if (data?.episodes) {
          const seasons = Object.keys(data.episodes);
          if (seasons.length > 0) setActiveSeason(seasons[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const info = seriesInfo?.info || {};
  const episodesBySeason = seriesInfo?.episodes || {};
  const currentEpisodes = episodesBySeason[activeSeason] || [];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* Bouton Retour */}
      <Link
        href="/series"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux séries
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-xl overflow-hidden bg-card border border-border p-6 flex flex-col md:flex-row gap-6">
        {info.cover && (
          <img
            src={info.cover}
            alt={info.name}
            className="w-48 aspect-[2/3] object-cover rounded-lg shadow-lg"
          />
        )}
        <div className="space-y-3 flex-1">
          <h1 className="text-3xl font-bold">{info.name} ({info.releaseDate?.slice(0, 4) || info.year})</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-semibold">
              {info.rating || "N/A"}
            </span>
            <span>{info.genre}</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {info.plot}
          </p>
        </div>
      </div>

      {/* Layout principal : Lecteur latéral à gauche (si un épisode est actif) + Liste d'épisodes à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Colonne Lecteur vidéo latéral (Aperçu) */}
        {activeEpisode && (
          <div className="lg:col-span-5 space-y-3 bg-card border border-border rounded-xl p-4 sticky top-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Aperçu Épisode {activeEpisode.episode_num}
            </h2>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <VideoPlayer
                src={`/api/stream?type=series&id=${activeEpisode.id}&ext=${activeEpisode.container_extension || "mp4"}`}
                title={`${info.name} - S${activeEpisode.season}E${activeEpisode.episode_num} - ${activeEpisode.title}`}
              />
            </div>
            <p className="text-sm font-medium">
              S{activeEpisode.season}E{activeEpisode.episode_num} - {activeEpisode.title}
            </p>
          </div>
        )}

        {/* Colonne Liste des Saisons et Épisodes */}
        <div className={activeEpisode ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          {/* Onglets Saisons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Object.keys(episodesBySeason).map((seasonNum) => (
              <button
                key={seasonNum}
                onClick={() => setActiveSeason(seasonNum)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSeason === seasonNum
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Saison {seasonNum}
              </button>
            ))}
          </div>

          {/* Liste des épisodes */}
          <div className="space-y-2">
            {currentEpisodes.map((ep: any) => {
              const isSelected = activeEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-muted-foreground w-6">
                      {ep.episode_num}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        S{ep.season}E{ep.episode_num} - {ep.title}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveEpisode(ep)}
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

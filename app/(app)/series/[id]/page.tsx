"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft, X, Star } from "lucide-react";
import Link from "next/link";

export default function SeriesDetailPage() {
  const { id } = useParams();
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<string>("");
  const [activeEpisode, setActiveEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .seriesInfo(id as string)
      .then((data) => {
        setSeriesInfo(data);
        if (data?.episodes) {
          const seasons = Object.keys(data.episodes);
          if (seasons.length > 0) {
            setActiveSeason(seasons[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0b0c10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Support des différents formats de retour d'API Xtream Codes
  const info = seriesInfo?.info || seriesInfo?.series_info || seriesInfo || {};
  const episodesBySeason = seriesInfo?.episodes || {};
  const seasonKeys = Object.keys(episodesBySeason);

  // Clé de la saison active (Fallback sur la première saison disponible si activeSeason n'est pas définie)
  const currentSeasonKey = activeSeason || seasonKeys[0] || "";
  const currentEpisodes = episodesBySeason[currentSeasonKey] || [];

  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 space-y-6">
      {/* Bouton Retour */}
      <Link
        href="/series"
        className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Retour aux séries
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[260px] flex items-end p-6">
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover opacity-35 filter blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 w-full">
          {info.cover && (
            <img
              src={info.cover}
              alt={info.name || "Série"}
              className="w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0"
            />
          )}

          <div className="space-y-3 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {info.name || "Série sans titre"}{" "}
              {info.releaseDate || info.year
                ? `(${info.releaseDate?.slice(0, 4) || info.year})`
                : ""}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
              {info.releaseDate && (
                <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                  {info.releaseDate}
                </span>
              )}
              {info.rating && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                  <Star className="w-3 h-3 fill-current" /> {info.rating}
                </span>
              )}
              {info.genre && (
                <span className="text-zinc-400">• {info.genre}</span>
              )}
            </div>

            {info.plot && (
              <p className="text-xs text-zinc-300/90 max-w-4xl leading-relaxed line-clamp-3">
                {info.plot}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid avec Lecteur et Liste */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Aperçu Épisode */}
        {activeEpisode && (
          <div className="lg:col-span-5 space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-4 sticky top-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Aperçu Épisode {activeEpisode.episode_num}
              </h2>
              <button
                onClick={() => setActiveEpisode(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Fermer l'aperçu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lecteur Vidéo */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5">
              <div className="absolute inset-0 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain">
                <VideoPlayer
                  key={activeEpisode.id}
                  sources={[
                    `/api/stream?type=series&id=${activeEpisode.id}&ext=${
                      activeEpisode.container_extension || "mp4"
                    }`,
                  ]}
                  ext={activeEpisode.container_extension || "mp4"}
                  isLive={false}
                  title={`${info.name || ""} - S${activeEpisode.season}E${
                    activeEpisode.episode_num
                  } - ${activeEpisode.title}`}
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-200 line-clamp-1">
              S{activeEpisode.season}E{activeEpisode.episode_num} -{" "}
              {activeEpisode.title}
            </p>
          </div>
        )}

        {/* Liste des Épisodes */}
        <div
          className={
            activeEpisode
              ? "lg:col-span-7 space-y-4"
              : "lg:col-span-12 space-y-4"
          }
        >
          {/* Sélection des Saisons */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {seasonKeys.map((seasonNum) => {
              const isActive = currentSeasonKey === seasonNum;
              return (
                <button
                  key={seasonNum}
                  onClick={() => setActiveSeason(seasonNum)}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-[#12141c] text-zinc-400 border border-white/5 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Saison {seasonNum}
                </button>
              );
            })}
          </div>

          {/* Cartes Épisodes */}
          <div className="space-y-2.5">
            {currentEpisodes.map((ep: any) => {
              const isSelected = activeEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep)}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                      : "border-white/5 bg-[#12141c] hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-white flex-shrink-0">
                      {ep.episode_num}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                        {info.name} - S{ep.season}E{ep.episode_num} - {ep.title}
                      </p>
                      {ep.info?.duration && (
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {ep.info.duration}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEpisode(ep);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-3 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white"
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
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

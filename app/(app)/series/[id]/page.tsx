"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft, Star, Heart, X, User, Film, Info, Maximize } from "lucide-react";
import Link from "next/link";
import { useLibrary } from "@/store/library";

const FlipActorCard = ({ name }: { name: string }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string>("Chargement...");
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/actor-photo?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data?.photoUrl) setPhotoUrl(data.photoUrl);
          if (data?.bio) setBio(data.bio);
        }
      })
      .catch(() => {
        if (isMounted) setBio("Information non disponible.");
      });
    return () => {
      isMounted = false;
    };
  }, [name]);

  return (
    <div
      tabIndex={0}
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
      className="group perspective w-32 sm:w-36 h-48 sm:h-52 flex-shrink-0 cursor-pointer select-none focus:outline-none"
    >
      <div
        className={`relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : "group-hover:scale-105"
        }`}
      >
        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-[#181a24] border border-white/10 shadow-lg backface-hidden flex flex-col justify-end">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/40 text-indigo-400">
              <User className="w-10 h-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="relative z-10 p-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-white line-clamp-1">{name}</span>
            <Info className="w-3.5 h-3.5 text-indigo-400 opacity-70 flex-shrink-0" />
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full rounded-2xl p-3 bg-gradient-to-br from-indigo-950 to-[#12141c] border border-indigo-500/40 text-white backface-hidden rotate-y-180 flex flex-col justify-between shadow-xl">
          <div className="space-y-1 overflow-hidden">
            <p className="text-[11px] font-bold text-indigo-300 line-clamp-1">{name}</p>
            <p className="text-[10px] text-zinc-300 leading-snug line-clamp-5">{bio}</p>
          </div>
          <span className="text-[9px] text-zinc-500 italic self-end">Retourner</span>
        </div>
      </div>
    </div>
  );
};

export default function SeriesDetailPage() {
  const { id } = useParams();
  const [seriesData, setSeriesData] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<string>("");
  const [activeEpisode, setActiveEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const { toggleFav, isFav } = useLibrary();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .seriesInfo(id as string)
      .then((data) => {
        setSeriesData(data);
        if (data?.episodes) {
          const seasons = Object.keys(data.episodes);
          if (seasons.length > 0) setActiveSeason(seasons[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFullscreenLandscape = async () => {
    const elem = playerContainerRef.current;
    if (!elem) return;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }

      if (window.screen?.orientation && "lock" in window.screen.orientation) {
        await (window.screen.orientation as any).lock("landscape").catch(() => {});
      }
    } catch (err) {
      console.error("Erreur passage Plein Écran:", err);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleFullscreenLandscape();
    }
    lastTapRef.current = now;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0b0c10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const info = seriesData?.info || seriesData?.series_info || seriesData || {};
  const episodesBySeason = seriesData?.episodes || {};
  const seasonKeys = Object.keys(episodesBySeason);

  const currentSeasonKey = activeSeason || seasonKeys[0] || "";
  const currentEpisodes = episodesBySeason[currentSeasonKey] || [];

  const seriesId = info.series_id || id;
  const seriesTitle = info.name || "Série";
  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover;
  const isFavorite = isFav("series", Number(seriesId));

  const castList = info.cast
    ? info.cast.split(",").map((actor: string) => actor.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-3 sm:p-6 space-y-4 sm:space-y-6">
      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/series"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <button
          onClick={() =>
            toggleFav("series", {
              id: Number(seriesId),
              name: seriesTitle,
              poster: info.cover,
            })
          }
          className={`p-2 rounded-full border border-white/10 backdrop-blur-md transition-colors ${
            isFavorite ? "bg-rose-500/20 text-rose-500 border-rose-500/30" : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Hero Banner */}
      <div className={`relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[200px] sm:min-h-[240px] flex items-end p-4 sm:p-6 ${activeEpisode ? "hidden sm:flex" : "flex"}`}>
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-35 filter blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
          {info.cover && (
            <img
              src={info.cover}
              alt={seriesTitle}
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0"
            />
          )}

          <div className="space-y-2 sm:space-y-3 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              {seriesTitle} {info.releaseDate || info.year ? `(${info.releaseDate?.slice(0, 4) || info.year})` : ""}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
              {info.rating && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                  <Star className="w-3 h-3 fill-current" /> {info.rating}
                </span>
              )}
              {info.releaseDate && (
                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  {info.releaseDate}
                </span>
              )}
              {info.genre && <span className="text-zinc-400">• {info.genre}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Zone Principale */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Lecteur d'épisode actif */}
        {activeEpisode && (
          <div className="lg:col-span-5 space-y-2 bg-[#12141c] border border-white/10 rounded-2xl p-2.5 sm:p-4 sticky top-2 sm:top-6 shadow-2xl z-30">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate max-w-[70%]">
                S{activeEpisode.season}E{activeEpisode.episode_num} - {activeEpisode.title}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleFullscreenLandscape}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  title="Plein Écran Horizontal"
                >
                  <Maximize className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveEpisode(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={playerContainerRef}
              onClick={handleDoubleTap}
              className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5 cursor-pointer"
            >
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
                  title={`${seriesTitle} - S${activeEpisode.season}E${activeEpisode.episode_num}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Épisodes, Saisons & Métadonnées */}
        <div className={activeEpisode ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          {/* Sélection des Saisons */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-indigo-600">
            {seasonKeys.map((seasonNum) => {
              const isActive = currentSeasonKey === seasonNum;
              return (
                <button
                  key={seasonNum}
                  onClick={() => {
                    setActiveSeason(seasonNum);
                    setActiveEpisode(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
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

          {/* Liste des Épisodes */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {currentEpisodes.map((ep: any) => {
              const isSelected = activeEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                      : "border-white/5 bg-[#12141c] hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-white flex-shrink-0">
                      {ep.episode_num}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                        {ep.title}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEpisode(ep);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-2 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Synopsis & Casting */}
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" /> Synopsis
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {info.plot || info.description || "Aucun résumé disponible."}
            </p>
            {info.director && (
              <div className="pt-2 border-t border-white/5 text-xs text-zinc-400">
                <span className="text-zinc-500 font-semibold">Réalisateur : </span>
                <span className="text-zinc-200">{info.director}</span>
              </div>
            )}
          </div>

          {castList.length > 0 && (
            <div className="bg-[#12141c] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" /> Casting / Acteurs
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-transparent">
                {castList.map((actor: string, idx: number) => (
                  <FlipActorCard key={idx} name={actor} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

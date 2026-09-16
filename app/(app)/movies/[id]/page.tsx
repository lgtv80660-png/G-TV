"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Star, Clock, X, User, Info, Maximize, Video, ArrowLeft, Heart, Film } from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { useLibrary } from "@/store/library";
import { api } from "@/lib/api";
import { ratingNum, yearFrom, cleanName } from "@/lib/utils";

function getCleanTitle(data: any): string {
  if (!data) return "Film";
  const info = data?.info || {};
  const vod = data?.movie_data || {};
  const rawTitle = info.name || vod.name || info.title || vod.title || info.o_name || "Film";
  const cleaned = String(rawTitle).replace(/\s*\(\d{4}\)\s*$/g, "").trim();
  return cleaned ? cleanName(cleaned) : "Film";
}

function getDurationInSeconds(data: any): number {
  if (!data) return 0;
  const info = data?.info || {};
  const vod = data?.movie_data || {};

  const secKeys = ["duration_secs", "length_secs", "duration_seconds"];
  for (const key of secKeys) {
    if (info[key] && !isNaN(Number(info[key]))) return Number(info[key]);
    if (vod[key] && !isNaN(Number(vod[key]))) return Number(vod[key]);
  }

  const strDur = info.duration || vod.duration || info.runtime || vod.runtime;
  if (strDur) {
    const cleanStr = String(strDur).toLowerCase().replace(/min/g, "").trim();
    if (cleanStr.includes(":")) {
      const parts = cleanStr.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    } else {
      const num = Number(cleanStr);
      if (!isNaN(num)) return num < 300 ? num * 60 : num;
    }
  }
  return 0;
}

const FlipActorCard = ({ name }: { name: string }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string>("Chargement...");
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!name) return;

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
      className="group perspective w-24 sm:w-28 h-36 sm:h-40 flex-shrink-0 cursor-pointer select-none focus:outline-none"
    >
      <div
        className={`relative w-full h-full rounded-xl transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : "group-hover:scale-105"
        }`}
      >
        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#181a24] border border-white/10 shadow-lg backface-hidden flex flex-col justify-end">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/40 text-indigo-400">
              <User className="w-6 h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="relative z-10 p-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white line-clamp-1">{name}</span>
            <Info className="w-2.5 h-2.5 text-indigo-400 opacity-70 flex-shrink-0" />
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full rounded-xl p-2 bg-gradient-to-br from-indigo-950 to-[#12141c] border border-indigo-500/40 text-white backface-hidden rotate-y-180 flex flex-col justify-between shadow-xl">
          <div className="space-y-0.5 overflow-hidden">
            <p className="text-[9px] font-bold text-indigo-300 line-clamp-1">{name}</p>
            <p className="text-[8px] text-zinc-300 leading-tight line-clamp-4">{bio}</p>
          </div>
          <span className="text-[7px] text-zinc-500 italic self-end">Retourner</span>
        </div>
      </div>
    </div>
  );
};

export function MovieBrowser({ movieId }: { movieId: string }) {
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeMedia, setActiveMedia] = useState<"movie" | "trailer" | null>(null);
  const [currentLang, setCurrentLang] = useState("fr");
  const [tmdbTrailerKey, setTmdbTrailerKey] = useState<string | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const { isFav, toggleFav } = useLibrary();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("app_lang") || localStorage.getItem("language") || "fr";
      setCurrentLang(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!movieId) return;
    setLoading(true);
    setError(false);
    api
      .vodInfo(movieId)
      .then((data) => {
        if (data) {
          setMovieInfo(data);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error("Erreur API vodInfo:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [movieId]);

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
      console.error("Erreur Plein Écran:", err);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
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

  if (error || !movieInfo) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#0b0c10] text-white space-y-4">
        <p className="text-red-400 font-semibold">Impossible de charger les informations du film.</p>
        <Link href="/movies" className="px-4 py-2 bg-indigo-600 rounded-lg text-xs hover:bg-indigo-500 transition-colors">
          Retour aux films
        </Link>
      </div>
    );
  }

  const info = movieInfo?.info || movieInfo?.movie_data || {};
  const vodData = movieInfo?.movie_data || {};
  const streamId = vodData?.stream_id || info?.stream_id || movieId;
  const containerExt = String(vodData?.container_extension || info?.container_extension || "mp4").toLowerCase();

  const movieTitle = getCleanTitle(movieInfo);
  const movieDurationSec = getDurationInSeconds(movieInfo);

  const rating = info?.rating ? ratingNum(info.rating) : 0;
  const year = yearFrom(info?.releasedate || vodData?.releasedate, movieTitle);
  const isFavorite = streamId ? isFav("movie", Number(streamId)) : false;
  const tmdbId = info?.tmdb_id || vodData?.tmdb_id;

  const rawCast = info?.cast || vodData?.cast || info?.actors || "";
  const castList = typeof rawCast === "string"
    ? rawCast.split(",").map((actor: string) => actor.trim()).filter(Boolean)
    : Array.isArray(rawCast) ? rawCast : [];

  const isNativeSupported = ["mp4", "m3u8"].includes(containerExt);

  const movieSources = isNativeSupported
    ? [`/api/stream?type=movie&id=${streamId}&ext=${containerExt}`]
    : [`/api/transcode?type=movie&id=${streamId}&ext=${containerExt || "mkv"}`];

  const backdropUrl = info?.backdrop_path?.[0] || info?.backdrop || info?.cover_big || info?.movie_image;
  const posterUrl = info?.movie_image || info?.cover_big || info?.cover;

  const finalTrailerKey = tmdbTrailerKey || info?.youtube_trailer || vodData?.youtube_trailer;
  const youtubeEmbedUrl = finalTrailerKey
    ? `https://www.youtube-nocookie.com/embed/${finalTrailerKey}?autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(`${movieTitle} bande annonce`)}&autoplay=1`;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-3 sm:p-6 space-y-4 sm:space-y-6">
      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/movies"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <button
          onClick={() =>
            toggleFav("movie", {
              id: Number(streamId),
              name: movieTitle,
              poster: posterUrl,
              ext: containerExt,
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
      <div className={`relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[200px] sm:min-h-[240px] flex items-end p-4 sm:p-6 ${activeMedia ? "hidden sm:flex" : "flex"}`}>
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-35 filter blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={movieTitle}
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0"
            />
          )}

          <div className="space-y-2 sm:space-y-3 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              {movieTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
              {rating > 0 && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                  <Star className="w-3 h-3 fill-current" /> {rating.toFixed(1)}
                </span>
              )}
              {year && (
                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  {year}
                </span>
              )}
              {info?.genre && <span className="text-zinc-400">• {info.genre}</span>}
              {movieDurationSec > 0 && (
                <span className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3 h-3" /> {Math.floor(movieDurationSec / 60)} min
                </span>
              )}
            </div>

            {!activeMedia && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveMedia("movie")}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  Play
                </button>

                <button
                  onClick={() => setActiveMedia("trailer")}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/10 transition-all hover:scale-105"
                >
                  <Video className="w-4 h-4 text-red-500 fill-current" />
                  Bande-annonce
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {activeMedia && (
          <div className="lg:col-span-5 space-y-2 bg-[#12141c] border border-white/10 rounded-2xl p-2.5 sm:p-4 sticky top-2 sm:top-6 shadow-2xl z-30">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate max-w-[70%]">
                {activeMedia === "trailer" ? `Bande-annonce : ${movieTitle}` : movieTitle}
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
                  onClick={() => setActiveMedia(null)}
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
              {activeMedia === "movie" ? (
                <div className="absolute inset-0 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain">
                  <VideoPlayer
                    key={`${streamId}-movie`}
                    sources={movieSources}
                    ext="mp4"
                    isLive={false}
                    title={movieTitle}
                    knownDuration={movieDurationSec}
                  />
                </div>
              ) : (
                <iframe
                  src={youtubeEmbedUrl}
                  title={`Bande-annonce ${movieTitle}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}

        {/* Synopsis & Section Casting 3D */}
        <div className={activeMedia ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" /> Synopsis & Histoire
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {info?.plot || info?.description || "Aucun résumé disponible."}
            </p>
            {info?.director && (
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
              <div className="flex flex-wrap gap-2.5 pt-1">
                {castList.slice(0, 10).map((actor: string, idx: number) => (
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

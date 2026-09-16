"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft, Star, Heart, X, User, Film, Info, Maximize, Youtube } from "lucide-react";
import Link from "next/link";
import { useLibrary } from "@/store/library";

/**
 * Extraction de la durée en secondes
 */
function extractDurationInSeconds(data: any): number {
  if (!data) return 0;
  
  const info = data.info || {};
  const vodData = data.movie_data || {};

  const secsCandidates = [info.duration_secs, vodData.duration_secs, info.length_secs, vodData.length_secs];
  for (const c of secsCandidates) {
    if (c && !isNaN(Number(c)) && Number(c) > 300) return Number(c);
  }

  const strCandidates = [info.duration, vodData.duration, info.runtime, vodData.runtime];
  for (const raw of strCandidates) {
    if (!raw) continue;
    const str = String(raw).trim().toLowerCase().replace("min", "").trim();
    
    if (str.includes(":")) {
      const parts = str.split(":").map((p) => parseInt(p, 10) || 0);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    }

    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0) {
      return num < 300 ? num * 60 : num;
    }
  }

  return 0;
}

// Carte d'acteur 3D Flip
function FlipActorCard({ name }: { name: string }) {
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
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const { toggleFav, isFav } = useLibrary();

  useEffect(() => {
    if (!id) return;
    api
      .vodInfo(id as string)
      .then((data) => setMovieInfo(data))
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

  const info = movieInfo?.info || movieInfo?.movie_data || {};
  const vodData = movieInfo?.movie_data || {};
  const streamId = vodData.stream_id || info.stream_id || id;
  const containerExt = vodData.container_extension || info.container_extension || "mp4";

  const knownDurationSec = extractDurationInSeconds(movieInfo);

  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover_big || info.movie_image;
  const isFavorite = isFav("movie", Number(streamId));
  const movieTitle = info.name || info.title || "Film";
  
  // Si le provider fournit un ID YouTube, on l'utilise, sinon on crée un lien de recherche dynamique YouTube
  const youtubeTrailerId = info.youtube_trailer || vodData.youtube_trailer;
  const trailerSearchQuery = encodeURIComponent(`${movieTitle} bande annonce fr`);

  const rawCast = info.cast || vodData.cast || info.actors || "";
  const castList = typeof rawCast === "string"
    ? rawCast.split(",").map((actor: string) => actor.trim()).filter(Boolean)
    : Array.isArray(rawCast) ? rawCast : [];

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
              poster: info.movie_image || info.cover_big,
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
      <div className={`relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[200px] sm:min-h-[240px] flex items-end p-4 sm:p-6 ${isPlaying ? "hidden sm:flex" : "flex"}`}>
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-35 filter blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
          {(info.movie_image || info.cover_big) && (
            <img
              src={info.movie_image || info.cover_big}
              alt={movieTitle}
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0"
            />
          )}

          <div className="space-y-2 sm:space-y-3 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              {movieTitle} {info.releasedate || info.year ? `(${info.releasedate?.slice(0, 4) || info.year})` : ""}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
              {info.rating && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                  <Star className="w-3 h-3 fill-current" /> {info.rating}
                </span>
              )}
              {info.releasedate && (
                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  {info.releasedate}
                </span>
              )}
              {info.genre && <span className="text-zinc-400">• {info.genre}</span>}
            </div>

            {/* Boutons Play et Bande-Annonce GARANTIS */}
            {!isPlaying && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  Play
                </button>

                <button
                  onClick={() => setShowTrailer(true)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-white/10 transition-all"
                >
                  <Youtube className="w-4 h-4 text-red-500 fill-current" />
                  Bande-annonce
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale Bande-Annonce YouTube */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={
                youtubeTrailerId
                  ? `https://www.youtube.com/embed/${youtubeTrailerId}?autoplay=1`
                  : `https://www.youtube.com/embed?listType=search&list=${trailerSearchQuery}&autoplay=1`
              }
              title="Bande annonce"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {isPlaying && (
          <div className="lg:col-span-5 space-y-2 bg-[#12141c] border border-white/10 rounded-2xl p-2.5 sm:p-4 sticky top-2 sm:top-6 shadow-2xl z-30">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate max-w-[70%]">
                {movieTitle}
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
                  onClick={() => setIsPlaying(false)}
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
                  key={streamId}
                  sources={[
                    `/api/transcode?type=movie&id=${streamId}&ext=${containerExt}`,
                    `/api/stream?type=movie&id=${streamId}&ext=${containerExt}`,
                  ]}
                  ext="mp4"
                  isLive={false}
                  title={movieTitle}
                  knownDuration={knownDurationSec}
                />
              </div>
            </div>
          </div>
        )}

        {/* Synopsis & Casting 3D */}
        <div className={isPlaying ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" /> Synopsis & Histoire
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {info.description || info.plot || "Aucun résumé disponible."}
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
              <div className="flex flex-wrap gap-2.5 pt-1">
                {castList.slice(0, 8).map((actor: string, idx: number) => (
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

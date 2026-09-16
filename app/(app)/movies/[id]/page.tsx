"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft, Star, Heart, X, User, Film, Info, Maximize, Video } from "lucide-react";
import Link from "next/link";
import { useLibrary } from "@/store/library";

/**
 * Extraction robuste de la durée totale du film en secondes.
 */
function extractDurationInSeconds(data: any): number {
  if (!data) return 0;
  
  const info = data.info || {};
  const vodData = data.movie_data || {};

  // 1. Recherche parmi les valeurs numériques directes (secondes)
  const secsCandidates = [
    info.duration_secs,
    vodData.duration_secs,
    info.length_secs,
    vodData.length_secs,
    info.duration_seconds,
    vodData.duration_seconds
  ];
  for (const c of secsCandidates) {
    const num = Number(c);
    if (!isNaN(num) && num > 0) return num;
  }

  // 2. Recherche dans les chaînes de texte (HH:MM:SS, MM:SS ou "120 min")
  const strCandidates = [
    info.duration,
    vodData.duration,
    info.runtime,
    vodData.runtime,
    info.length,
    vodData.length
  ];

  for (const raw of strCandidates) {
    if (!raw) continue;
    const str = String(raw).trim().toLowerCase().replace("min", "").trim();
    
    // Format HH:MM:SS ou MM:SS
    if (str.includes(":")) {
      const parts = str.split(":").map((p) => parseInt(p, 10) || 0);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }

    // Format numérique simple en minutes ou secondes
    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0) {
      // Si la valeur est inférieure à 300, c'est probablement des minutes
      return num < 300 ? num * 60 : num;
    }
  }

  return 0;
}

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
  const params = useParams();
  const id = params?.id as string;

  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<"movie" | "trailer" | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const { toggleFav, isFav } = useLibrary();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .vodInfo(id)
      .then((data) => setMovieInfo(data))
      .catch((err) => console.error("Erreur chargement film:", err))
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

  // Extraction de la durée en secondes
  const knownDurationSec = extractDurationInSeconds(movieInfo);

  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover_big || info.movie_image;
  const isFavorite = isFav("movie", Number(streamId));
  const movieTitle = info.name || info.title || "Film";
  const movieYear = info.releasedate?.slice(0, 4) || info.year || "";
  
  const youtubeTrailerId = info.youtube_trailer || vodData.youtube_trailer;

  const rawCast = info.cast || vodData.cast || info.actors || "";
  const castList = typeof rawCast === "string"
    ? rawCast.split(",").map((actor: string) => actor.trim()).filter(Boolean)
    : Array.isArray(rawCast) ? rawCast : [];

  // Transmettre la durée calculée dans les URLs
  const movieSources = [
    `/api/transcode?type=movie&id=${streamId}&ext=${containerExt}&duration=${knownDurationSec}`,
    `/api/stream?type=movie&id=${streamId}&ext=${containerExt}&duration=${knownDurationSec}`,
  ];

  const trailerSources = youtubeTrailerId
    ? [`/api/trailer?ytId=${youtubeTrailerId}`]
    : [`/api/trailer?title=${encodeURIComponent(movieTitle)}&year=${movieYear}`];

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
      <div className={`relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[200px] sm:min-h-[240px] flex items-end p-4 sm:p-6 ${activeMedia ? "hidden sm:flex" : "flex"}`}>
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-35 filter blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent" />
          </div>
        )}

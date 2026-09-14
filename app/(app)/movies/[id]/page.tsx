"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Play, ArrowLeft, Star, Heart, X } from "lucide-react";
import Link from "next/link";
import { useLibrary } from "@/store/library";

export default function MovieDetailPage() {
  const { id } = useParams();
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const { toggleFav, isFav } = useLibrary();

  useEffect(() => {
    if (!id) return;
    api
      .vodInfo(id as string)
      .then((data) => {
        setMovieInfo(data);
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

  const info = movieInfo?.info || movieInfo?.movie_data || {};
  const vodData = movieInfo?.movie_data || {};
  const streamId = vodData.stream_id || info.stream_id || id;
  const containerExt = vodData.container_extension || info.container_extension || "mp4";

  const backdropUrl = info.backdrop_path?.[0] || info.backdrop || info.cover_big || info.movie_image;
  const isFavorite = isFav("movie", Number(streamId));
  const movieTitle = info.name || info.title || "Film";

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 space-y-6">
      {/* Top bar avec boutons Retour et Favoris */}
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

      {/* Header Banner du film */}
      <div className="relative rounded-2xl overflow-hidden bg-[#12141c] border border-white/5 min-h-[240px] flex items-end p-6">
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
          {(info.movie_image || info.cover_big) && (
            <img
              src={info.movie_image || info.cover_big}
              alt={movieTitle}
              className="w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0"
            />
          )}

          <div className="space-y-3 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {movieTitle} {info.releasedate || info.year ? `(${info.releasedate?.slice(0, 4) || info.year})` : ""}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
              {info.rating && (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                  <Star className="w-3 h-3 fill-current" /> {info.rating}
                </span>
              )}
              {info.releasedate && (
                <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                  {info.releasedate}
                </span>
              )}
              {info.genre && <span className="text-zinc-400">• {info.genre}</span>}
            </div>

            {!isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
                Play
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2 colonnes comme pour les séries : Petit lecteur à gauche (col-span-5) + Détails à droite (col-span-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lecteur Aperçu à Gauche */}
        {isPlaying && (
          <div className="lg:col-span-5 space-y-3 bg-[#12141c] border border-white/10 rounded-2xl p-4 sticky top-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Aperçu - {movieTitle}
              </h2>
              <button
                onClick={() => setIsPlaying(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Fermer l'aperçu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5">
              <div className="absolute inset-0 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain">
                <VideoPlayer
                  key={streamId}
                  sources={[`/api/stream?type=movie&id=${streamId}&ext=${containerExt}`]}
                  ext={containerExt}
                  isLive={false}
                  title={movieTitle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Fiche d'information du film à Droite */}
        <div className={isPlaying ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Synopsis & Détails
            </h3>
            
            {info.description || info.plot ? (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {info.description || info.plot}
              </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400 pt-2 border-t border-white/5">
              {info.cast && (
                <div>
                  <span className="text-zinc-500 block font-semibold mb-0.5">Cast:</span>
                  <span>{info.cast}</span>
                </div>
              )}
              {info.director && (
                <div>
                  <span className="text-zinc-500 block font-semibold mb-0.5">Director:</span>
                  <span>{info.director}</span>
                </div>
              )}
              {info.releasedate && (
                <div>
                  <span className="text-zinc-500 block font-semibold mb-0.5">Released:</span>
                  <span>{info.releasedate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

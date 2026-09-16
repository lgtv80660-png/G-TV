"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, Star, Calendar, Clock, X, User, Info, Maximize } from "lucide-react";
import { DetailHero } from "@/components/catalog/DetailHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { useSeriesInfo } from "@/lib/hooks";
import { useLibrary } from "@/store/library";
import { ratingNum, yearFrom, cleanName, cn } from "@/lib/utils";
import type { Episode } from "@/lib/xtream/types";

// Composant pour l'image d'épisode
function EpisodeImage({
  ep,
  seriesTitle,
  tmdbId,
  seasonKey,
  fallbackCover,
}: {
  ep: any;
  seriesTitle: string;
  tmdbId?: string | number;
  seasonKey: string;
  fallbackCover?: string;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(ep.info?.movie_image || null);

  useEffect(() => {
    if (ep.info?.movie_image) {
      setImgSrc(ep.info.movie_image);
      return;
    }

    let isMounted = true;
    const seasonNumber = seasonKey.replace(/\D/g, "") || ep.season || "1";

    let episodeNumber = ep.episode_num;
    if (!episodeNumber && ep.title) {
      const match = ep.title.match(/E(\d+)/i);
      if (match) episodeNumber = match[1];
    }
    episodeNumber = episodeNumber || "1";

    let cleanTitle = seriesTitle || "";
    cleanTitle = cleanTitle
      .replace(/\./g, " ")
      .replace(/S\d+E\d+.*/i, "")
      .replace(/(VOSTFR|FRENCH|MULTI|720p|1080p|2160p|WEB-DL|WEBRip|x264|x265|AMZN|NF|-FANATIK|-EXTREME).*/i, "")
      .replace(/\(\d{4}\)/g, "")
      .trim();

    fetch(
      `/api/tmdb?path=search/tv&query=${encodeURIComponent(cleanTitle)}&language=fr-FR`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const realId = data?.results?.[0]?.id;
        if (realId) {
          return fetch(`/api/tmdb?path=tv/${realId}/season/${seasonNumber}/episode/${episodeNumber}&language=fr-FR`)
            .then((r) => r.json())
            .then((epData) => {
              if (isMounted && epData?.still_path) {
                setImgSrc(`https://image.tmdb.org/t/p/w500${epData.still_path}`);
              } else if (isMounted) {
                setImgSrc(fallbackCover || null);
              }
            });
        } else {
          setImgSrc(fallbackCover || null);
        }
      })
      .catch(() => {
        if (isMounted) setImgSrc(fallbackCover || null);
      });

    return () => {
      isMounted = false;
    };
  }, [ep, seriesTitle, tmdbId, seasonKey, fallbackCover]);

  const finalSrc = imgSrc || fallbackCover;

  if (!finalSrc) {
    return <div className="h-full w-full bg-ink-900 rounded-lg" />;
  }

  return (
    <SmartImage
      src={finalSrc}
      alt={ep.title || "Episode"}
      rounded="rounded-lg"
      className="h-full w-full object-cover"
    />
  );
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

function SeriesSkeleton() {
  return (
    <div className="px-5 pt-40 sm:px-8">
      <div className="flex gap-6">
        <Skeleton className="hidden aspect-[2/3] w-44 sm:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full max-w-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SeriesDetailsView() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useSeriesInfo(id);
  const { isFav, toggleFav, progress } = useLibrary();

  const [seasonKey, setSeasonKey] = useState<string | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [seasonPoster, setSeasonPoster] = useState<string | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const info = data?.info || data?.series_info || (data && !data.episodes ? data : {}) || {};
  const episodesBySeason = data?.episodes ?? {};

  const seasons = useMemo(() => {
    if (!episodesBySeason) return [];
    return Object.keys(episodesBySeason)
      .filter((k) => (episodesBySeason[k] ?? []).length > 0)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
  }, [episodesBySeason]);

  const activeSeasonKey = seasonKey ?? seasons[0] ?? null;
  const episodes = activeSeasonKey !== null ? episodesBySeason[activeSeasonKey] ?? [] : [];

  const title = (info?.name as string) || (info?.title as string) || "Série";

  useEffect(() => {
    if (!activeSeasonKey) return;

    let isMounted = true;
    const seasonNumber = activeSeasonKey.replace(/\D/g, "") || "1";

    let cleanTitle = cleanName(title)
      .replace(/\./g, " ")
      .replace(/S\d+E\d+.*/i, "")
      .replace(/(VOSTFR|FRENCH|MULTI|720p|1080p|2160p|WEB-DL|WEBRip|x264|x265|AMZN|NF|-FANATIK|-EXTREME).*/i, "")
      .replace(/\(\d{4}\)/g, "")
      .trim();

    const fetchSeasonPoster = async () => {
      try {
        let realTmdbId = info?.tmdb_id;

        if (!realTmdbId && cleanTitle) {
          const searchRes = await fetch(
            `/api/tmdb?path=search/tv&query=${encodeURIComponent(cleanTitle)}&language=fr-FR`
          ).then((r) => r.json());

          realTmdbId = searchRes?.results?.[0]?.id;
        }

        if (!realTmdbId) {
          if (isMounted) setSeasonPoster(null);
          return;
        }

        const seasonRes = await fetch(
          `/api/tmdb?path=tv/${realTmdbId}/season/${seasonNumber}&language=fr-FR`
        ).then((r) => r.json());

        if (isMounted) {
          if (seasonRes?.poster_path) {
            setSeasonPoster(`https://image.tmdb.org/t/p/w500${seasonRes.poster_path}`);
          } else {
            setSeasonPoster(null);
          }
        }
      } catch {
        if (isMounted) setSeasonPoster(null);
      }
    };

    fetchSeasonPoster();

    return () => {
      isMounted = false;
    };
  }, [activeSeasonKey, title, info?.tmdb_id]);

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

  if (isLoading) return <SeriesSkeleton />;
  if (isError || !data) return <p className="px-8 py-24 text-center text-red-300">Impossible de charger la série.</p>;

  const rating = ratingNum(info?.rating);
  const year = yearFrom(info?.releaseDate || info?.releasedate, title);
  const fav = isFav("series", Number(id));

  const castList = info?.cast
    ? info.cast.split(",").map((actor: string) => actor.trim()).filter(Boolean)
    : [];

  const currentPoster = seasonPoster || info?.cover;

  return (
    <div className="min-h-screen bg-ink-950 text-white p-3 sm:p-6 space-y-6">
      <style jsx global>{`
        .perspective { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      <DetailHero
        backdrop={info?.backdrop_path?.[0] || info?.backdrop}
        poster={currentPoster}
        title={title}
        fav={fav}
        onToggleFav={() => toggleFav("series", { id: Number(id), name: cleanName(title), poster: info?.cover })}
      >
        <div className="space-y-4 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{cleanName(title)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fog-300">
              {rating > 0 && (
                <span className="flex items-center gap-1 font-semibold text-iris-300">
                  <Star className="h-4 w-4 fill-iris-300" /> {rating.toFixed(1)}
                </span>
              )}
              {year && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {year}</span>}
              {info?.genre && <span className="text-fog-400">{info.genre}</span>}
              <span className="text-fog-500">{seasons.length} saison{seasons.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {(info?.plot || info?.description) && (
            <p className="text-sm leading-relaxed text-fog-300 font-light">
              {info.plot || info.description}
            </p>
          )}

          {castList.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-iris-400" /> Casting / Acteurs
              </h3>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {castList.slice(0, 8).map((actor: string, idx: number) => (
                  <FlipActorCard key={idx} name={actor} />
                ))}
              </div>
            </div>
          )}
        </div>

        {seasons.length > 0 && (
          <div className="mt-8 no-scrollbar flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
            {seasons.map((s) => {
              const label = s.toLowerCase().includes("season") || s.toLowerCase().includes("saison") ? s : `Saison ${s}`;
              return (
                <button
                  key={s}
                  onClick={() => {
                    setSeasonKey(s);
                    setActiveEpisode(null);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    s === activeSeasonKey ? "bg-iris-400 text-ink-950 font-bold" : "bg-ink-800 text-fog-400 hover:bg-ink-700 hover:text-white",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col lg:flex-row gap-6 items-start">
          {activeEpisode && (
            <div className="w-full lg:w-1/2 shrink-0 space-y-3 bg-ink-900 border border-white/10 rounded-2xl p-4 sticky top-6 shadow-2xl z-30">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-iris-400 truncate max-w-[70%]">
                  S{activeEpisode.season || activeSeasonKey}E{activeEpisode.episode_num} - {cleanName(activeEpisode.title || "")}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleFullscreenLandscape}
                    className="text-fog-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                    title="Plein Écran Horizontal"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveEpisode(null)}
                    className="text-fog-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
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
                      `/api/stream?type=series&id=${activeEpisode.id}&ext=mp4`,
                      `/api/stream?type=series&id=${activeEpisode.id}&ext=ts`,
                      `/api/stream?type=series&id=${activeEpisode.id}&ext=${
                        activeEpisode.container_extension || "mkv"
                      }`,
                    ]}
                    ext="mp4"
                    isLive={false}
                    title={`${cleanName(title)} - S${activeEpisode.season || activeSeasonKey}E${activeEpisode.episode_num}`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 w-full space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {episodes.map((ep: Episode) => {
              const isSelected = activeEpisode?.id === ep.id;
              const ext = ep.container_extension || "mp4";
              const epTitle = ep.title || `Episode ${ep.episode_num}`;
              const resume = progress[`series:${ep.id}`]?.position ?? 0;

              return (
                <div
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep)}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border p-2.5 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-ink-800 border-iris-500/50 shadow-md"
                      : "bg-ink-850/60 border-white/5 hover:bg-ink-800"
                  )}
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-ink-900 sm:w-36">
                    <EpisodeImage
                      ep={ep}
                      seriesTitle={cleanName(title)}
                      tmdbId={info?.tmdb_id}
                      seasonKey={activeSeasonKey || "1"}
                      fallbackCover={currentPoster || info?.backdrop}
                    />
                    <span className="absolute inset-0 grid place-items-center bg-ink-950/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-iris-400 text-ink-950">
                        <Play className="h-3.5 w-3.5 translate-x-0.5 fill-ink-950" />
                      </span>
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium text-sm">
                      <span className="text-fog-500">{ep.episode_num}.</span>
                      <span className="truncate group-hover:text-iris-300 transition-colors">{cleanName(epTitle)}</span>
                    </p>
                    {ep.info?.duration && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-fog-500">
                        <Clock className="h-3 w-3" /> {ep.info.duration}
                      </p>
                    )}
                    {ep.info?.plot && <p className="mt-1 line-clamp-1 text-xs text-fog-400">{ep.info.plot}</p>}
                  </div>

                  <Link
                    href={`/watch?type=series&id=${ep.id}&ext=${ext}&title=${encodeURIComponent(`${cleanName(title)} · ${epTitle}`)}&series=${id}${resume > 15 ? `&resume=${Math.floor(resume)}` : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-fog-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Lire en plein écran"
                  >
                    <Maximize className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
            {episodes.length === 0 && <p className="text-sm text-fog-500">Aucun épisode répertorié pour cette saison.</p>}
          </div>
        </div>
      </DetailHero>
    </div>
  );
}

"use client";

import { TopBar } from "@/components/layout/TopBar";
import { FeaturedTile, NavTile, ContinueTile } from "@/components/catalog/Bento";
import { PosterCard } from "@/components/catalog/PosterCard";
import { useVodStreams, useSeriesList } from "@/lib/hooks";
import { useLibrary } from "@/store/library";
import { useTranslation } from "@/lib/useTranslation";

export default function HomePage() {
  const { t } = useTranslation();
  const { data: movies = [], isLoading: loadingMovies } = useVodStreams();
  const { data: series = [], isLoading: loadingSeries } = useSeriesList();
  const library = useLibrary();

  const progressList = Array.isArray(library.progress)
    ? library.progress
    : Object.values(library.progress ?? {});

  const heroItems = movies.slice(0, 5).map((m) => ({
    id: String(m.stream_id),
    title: m.name,
    backdrop: m.stream_icon,
    rating: typeof m.rating === "number" ? m.rating : parseFloat(m.rating) || 0,
    year: m.added ? String(m.added) : undefined,
    detailHref: `/movies/${m.stream_id}`,
    playHref: `/movies/${m.stream_id}`,
  }));

  // Groupement par catégories ou sélection de récents
  const recentMovies = movies.slice(0, 10);
  const recentSeries = series.slice(0, 10);

  return (
    <>
      <TopBar title={t("Nav.home")} />
      <main className="p-4 md:p-6 space-y-8 max-w-[1600px] mx-auto pb-16">
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
          {t("Home.heroTitle")}
        </h1>

        {/* Section Bento Du Haut */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FeaturedTile items={heroItems} className="col-span-1 md:col-span-8 min-h-[380px]" />

          <div className="col-span-1 md:col-span-4 grid grid-cols-2 gap-4">
            {progressList.length > 0 ? (
              <ContinueTile items={progressList} className="col-span-2 min-h-[180px]" />
            ) : (
              <NavTile
                href="/movies"
                title={t("Home.movies")}
                subtitle={t("Home.browseMovies")}
                icon="film"
                tint="iris"
                className="col-span-2 min-h-[180px]"
              />
            )}

            <NavTile
              href="/live"
              title={t("Home.liveTv")}
              subtitle={t("Home.channelsEpg")}
              icon="live"
              tint="mint"
              className="col-span-1 min-h-[140px]"
            />
            <NavTile
              href="/favourites"
              title={t("Home.myList")}
              subtitle={t("Home.savedLater")}
              icon="heart"
              tint="iris"
              className="col-span-1 min-h-[140px]"
            />
          </div>
        </div>

        {/* Carrousel 1: Films Récents */}
        {!loadingMovies && recentMovies.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-fog-400 tracking-wide uppercase">
              [VOD] Films Récents
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
              {recentMovies.map((m) => (
                <div key={m.stream_id} className="w-36 sm:w-44 shrink-0">
                  <PosterCard
                    item={{
                      id: m.stream_id,
                      name: m.name,
                      poster: m.stream_icon,
                      rating: m.rating,
                      year: m.added ? String(m.added) : undefined,
                    }}
                    href={`/movies/${m.stream_id}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Carrousel 2: Séries Récentes */}
        {!loadingSeries && recentSeries.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-fog-400 tracking-wide uppercase">
              [SÉRIES] Nouveautés
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
              {recentSeries.map((s) => (
                <div key={s.series_id} className="w-36 sm:w-44 shrink-0">
                  <PosterCard
                    item={{
                      id: s.series_id,
                      name: s.name,
                      poster: s.cover,
                      rating: s.rating,
                      year: s.releaseDate,
                    }}
                    href={`/series/${s.series_id}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

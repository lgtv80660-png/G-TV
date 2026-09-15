"use client";

import { TopBar } from "@/components/layout/TopBar";
import { FeaturedTile, NavTile, ContinueTile } from "@/components/catalog/Bento";
import { useVodStreams, useSeries } from "@/lib/hooks";
import { useLibrary } from "@/store/library";
import { useTranslation } from "@/lib/useTranslation";

export default function HomePage() {
  const { t } = useTranslation();
  const { data: movies = [] } = useVodStreams();
  const { history = [] } = useLibrary();

  // Préparation des éléments à l'affiche (Featured)
  const heroItems = movies.slice(0, 5).map((m) => ({
    id: String(m.stream_id),
    title: m.name,
    backdrop: m.stream_icon,
    rating: typeof m.rating === "number" ? m.rating : parseFloat(m.rating) || 0,
    year: m.added ? String(m.added) : undefined,
    detailHref: `/watch?type=movie&id=${m.stream_id}&ext=${m.container_extension || "mp4"}&title=${encodeURIComponent(m.name)}`,
    playHref: `/watch?type=movie&id=${m.stream_id}&ext=${m.container_extension || "mp4"}&title=${encodeURIComponent(m.name)}`,
  }));

  return (
    <>
      <TopBar title={t("Nav.home")} />
      <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
          {t("Home.heroTitle")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Tile Featured Principale */}
          <FeaturedTile items={heroItems} className="col-span-1 md:col-span-8 min-h-[380px]" />

          {/* Navigation Rapide */}
          <div className="col-span-1 md:col-span-4 grid grid-cols-2 gap-4">
            <NavTile
              href="/movies"
              title={t("Home.movies")}
              subtitle={t("Home.browseMovies")}
              icon="film"
              tint="iris"
              className="col-span-2"
            />
            <NavTile
              href="/live"
              title={t("Home.liveTv")}
              subtitle={t("Home.channelsEpg")}
              icon="live"
              tint="mint"
              className="col-span-1"
            />
            <NavTile
              href="/favourites"
              title={t("Home.myList")}
              subtitle={t("Home.savedLater")}
              icon="heart"
              tint="iris"
              className="col-span-1"
            />
          </div>

          {/* Reprendre la lecture */}
          {history.length > 0 && (
            <ContinueTile items={history} className="col-span-1 md:col-span-12" />
          )}
        </div>
      </main>
    </>
  );
}

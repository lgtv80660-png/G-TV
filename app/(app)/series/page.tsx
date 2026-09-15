"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useSeriesCategories, useSeriesList } from "@/lib/hooks";
import type { Series } from "@/lib/xtream/types";

export default function SeriesPage() {
  const { data: categories = [] } = useSeriesCategories();

  return (
    <>
      <TopBar title="Series" />
      <CatalogBrowser<Series>
        sectionKey="series"
        categories={categories}
        useItems={(catId) => useSeriesList(catId)}
        toPoster={(item) => ({
          id: item.series_id,
          name: item.name,
          poster: item.cover,
          rating: item.rating,
          year: item.releaseDate,
        })}
        hrefFor={(item) => `/series/${item.series_id}`}
      />
    </>
  );
}

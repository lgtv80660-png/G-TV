"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useSeriesCategories, useSeries } from "@/lib/hooks";
import type { SeriesItem } from "@/lib/xtream/types";

export default function SeriesPage() {
  const { data: categories = [] } = useSeriesCategories();

  return (
    <>
      <TopBar title="Series" />
      <CatalogBrowser<SeriesItem>
        sectionKey="series"
        categories={categories}
        useItems={(catId) => useSeries(catId)}
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

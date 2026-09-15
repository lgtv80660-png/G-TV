"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useVodCategories, useVodStreams } from "@/lib/hooks";
import type { VodStream } from "@/lib/xtream/types";

export default function MoviesPage() {
  const { data: categories = [] } = useVodCategories();

  return (
    <>
      <TopBar title="Movies" />
      <CatalogBrowser<VodStream>
        sectionKey="movies"
        categories={categories}
        useItems={(catId) => useVodStreams(catId)}
        toPoster={(item) => ({
          id: item.stream_id,
          name: item.name,
          poster: item.stream_icon,
          rating: item.rating,
          year: item.added,
        })}
        hrefFor={(item) =>
          `/watch?type=movie&id=${item.stream_id}&ext=${item.container_extension || "mp4"}&title=${encodeURIComponent(item.name)}`
        }
      />
    </>
  );
}

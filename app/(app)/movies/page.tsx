"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Category } from "@/lib/xtream/types";

export default function MoviesPage() {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    api.vodCategories().then(setCats).catch(console.error);
  }, []);

  return (
    <>
      <TopBar title="Movies" />
      <CatalogBrowser
        sectionKey="movies"
        categories={cats}
        fetchItems={(catId) => api.vodStreams(catId)}
      />
    </>
  );
}

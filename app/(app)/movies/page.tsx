"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Category, VodStream } from "@/lib/xtream/types";

export default function MoviesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<VodStream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [categoriesData, streamsData] = await Promise.all([
          api.vodCategories(),
          api.vodStreams(),
        ]);
        if (isMounted) {
          setCats(categoriesData || []);
          setItems(streamsData || []);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des films:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <TopBar title="Movies" />
      <CatalogBrowser
        items={items}
        categories={cats}
        type="movies"
        loading={loading}
      />
    </>
  );
}

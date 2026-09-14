"use client";

import { TopBar } from "@/components/layout/TopBar";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Category, Series } from "@/lib/xtream/types";

export default function SeriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Series[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [categoriesData, seriesData] = await Promise.all([
          api.seriesCategories(),
          api.series(),
        ]);
        if (isMounted) {
          setCats(categoriesData || []);
          setItems(seriesData || []);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des séries:", error);
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
      <TopBar title="Series" />
      <CatalogBrowser
        items={items}
        categories={cats}
        type="series"
        loading={loading}
      />
    </>
  );
}

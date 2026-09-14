"use client";

import { useEffect, useState } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { fetchSeries, fetchSeriesCategories } from "@/lib/api";

export default function SeriesPage() {
  const [series, setSeries] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [seriesData, categoriesData] = await Promise.all([
          fetchSeries(),
          fetchSeriesCategories(),
        ]);

        if (isMounted) {
          setSeries(seriesData || []);
          setCategories(categoriesData || []);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des séries:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []); // Dépendances vides pour n'exécuter qu'une seule fois au montage

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Séries</h1>
      <CatalogBrowser
        items={series}
        categories={categories}
        type="series"
        loading={loading}
      />
    </div>
  );
}

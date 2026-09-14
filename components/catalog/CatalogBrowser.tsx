"use client";

import React, { useMemo, useCallback, useState } from "react";
import { PosterCard } from "./PosterCard";
import { FilterBar } from "./FilterBar";

interface CatalogBrowserProps {
  items: any[];
  categories: any[];
  type: "movies" | "series" | "live";
  loading?: boolean;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  items = [],
  categories = [],
  type,
  loading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Handler mémorisé pour éviter la réinstanciation à chaque rendu
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Filtrage mémorisé pour éviter les boucles d'effets et calculs lourds inutiles
  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" ||
        String(item.category_id) === String(selectedCategory);

      const matchesSearch =
        !searchQuery ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun contenu trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Limitation / découpage du rendu initial pour éviter de geler l'UI si la liste est immense */}
          {filteredItems.slice(0, 100).map((item) => (
            <PosterCard key={item.series_id || item.stream_id || item.id} item={item} type={type} />
          ))}
        </div>
      )}
    </div>
  );
};

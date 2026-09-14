"use client";

import React, { useMemo, useCallback, useState } from "react";
import { PosterCard } from "./PosterCard";
import { FilterBar } from "./FilterBar";
import { SortKey } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("added");

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSortChange = useCallback((s: SortKey) => {
    setSortKey(s);
  }, []);

  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];

    let result = items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" ||
        String(item.category_id) === String(selectedCategory);

      const matchesSearch =
        !searchQuery ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });

    if ((sortKey as string) === "name") {
      result = [...result].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if ((sortKey as string) === "rating") {
      result = [...result].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }

    return result;
  }, [items, selectedCategory, searchQuery, sortKey]);

  const getHref = (item: any) => {
    const id = item.series_id || item.stream_id || item.id;
    if (type === "series") return `/series/${id}`;
    if (type === "movies") return `/movies/${id}`;
    return `/watch?type=live&id=${id}&ext=ts`;
  };

  const handleItemClick = (item: any) => {
    const href = getHref(item);
    router.push(href);
  };

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
        activeCategory={selectedCategory}
        onCategory={handleCategoryChange}
        query={searchQuery}
        onQuery={handleSearchChange}
        sort={sortKey}
        onSort={handleSortChange}
        count={filteredItems.length}
      />

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun contenu trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredItems.slice(0, 120).map((item, index) => (
            <PosterCard
              key={item.series_id || item.stream_id || item.id}
              item={item}
              href={getHref(item)}
              index={index}
              onPlay={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

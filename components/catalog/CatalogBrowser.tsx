"use client";

import { useMemo } from "react";
import { FilterBar } from "./FilterBar";
import { PosterCard } from "./PosterCard";
import { PosterGridSkeleton } from "@/components/ui/Skeleton";
import { useUI, DEFAULT_FILTER } from "@/store/ui";
import { sortItems, cleanName, cn } from "@/lib/utils";
import type { SortKey } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";

interface CatalogBrowserProps<T> {
  sectionKey: "movies" | "series";
  categories: Array<{ category_id: string; category_name: string }>;
  useItems: (catId?: string) => { data?: T[]; isLoading: boolean; isError?: boolean; error?: unknown };
  toPoster: (item: T) => { id: string | number; name: string; poster?: string; rating?: number | string; year?: number | string };
  hrefFor: (item: T) => string;
  emptyLabel?: string;
}

export function CatalogBrowser<T extends { name?: string; title?: string; [key: string]: any }>({
  sectionKey,
  categories,
  useItems,
  toPoster,
  hrefFor,
  emptyLabel,
}: CatalogBrowserProps<T>) {
  const { t } = useTranslation();
  const filter = useUI((s) => s.filters[sectionKey] ?? DEFAULT_FILTER);
  const patchFilter = useUI((s) => s.patchFilter);
  const category = filter.category || "all";
  const { sort, query } = filter;

  const setCategory = (id: string) => patchFilter(sectionKey, { category: id });
  const setSort = (s: SortKey) => patchFilter(sectionKey, { sort: s });
  const setQuery = (q: string) => patchFilter(sectionKey, { query: q });

  const { data, isLoading, isError, error } = useItems(category === "all" ? undefined : category);

  const filtered = useMemo(() => {
    let items = data ?? [];
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((c) => cleanName(c.name || c.title || "").toLowerCase().includes(q));

    const sortableItems = items.map((item) => ({
      ...item,
      name: item.name || item.title || "",
    }));

    return sortItems(sortableItems as any, sort as SortKey) as unknown as T[];
  }, [data, query, sort]);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden border-t border-white/5">
      
      {/* Sidebar Catégories */}
      <div className="w-1/4 max-w-[280px] shrink-0 border-r border-white/5 bg-ink-900/50 flex flex-col">
        <div className="p-4 border-b border-white/5 font-semibold text-fog-200">
          {t("Catalog.categories")} ({sectionKey === "movies" ? t("Nav.movies") : t("Nav.series")})
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
              category === "all" ? "bg-iris-500/20 text-iris-400 font-semibold" : "hover:bg-ink-800 text-fog-400"
            )}
          >
            {t("Catalog.allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setCategory(c.category_id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate",
                category === c.category_id ? "bg-iris-500/20 text-iris-400 font-semibold" : "hover:bg-ink-800 text-fog-400"
              )}
            >
              {c.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* Grille Principale */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <FilterBar
          categories={[]}
          activeCategory={category}
          onCategory={setCategory}
          sort={sort}
          onSort={setSort}
          query={query}
          onQuery={setQuery}
          count={filtered.length}
        />

        <div className="p-6">
          {isLoading ? (
            <PosterGridSkeleton />
          ) : isError ? (
            <p className="py-16 text-center text-sm text-red-400">{(error as Error)?.message}</p>
          ) : filtered.length === 0 ? (
            <p className="py-24 text-center text-sm text-fog-500">{emptyLabel || t("Catalog.emptyCategory")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => {
                const p = toPoster(item);
                return (
                  <PosterCard
                    key={p.id}
                    item={{
                      id: p.id,
                      name: p.name,
                      poster: p.poster,
                      rating: p.rating,
                      year: p.year !== undefined ? String(p.year) : undefined,
                    }}
                    href={hrefFor(item)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

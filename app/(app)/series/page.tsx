"use client";

import React, { useState } from "react";
import { useSeries, useSeriesCategories } from "@/lib/hooks";
import Link from "next/link";
import { Play, Search } from "lucide-react";

export default function SeriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: categories, loading: loadingCats } = useSeriesCategories();
  const { data: seriesList, loading: loadingSeries } = useSeries(selectedCategory);

  const filteredSeries = (seriesList || []).filter((item: any) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Séries</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher une série..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12141c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Filtre des catégories */}
        <div className="md:col-span-3 space-y-2">
          <h2 className="text-xs font-semibold text-zinc-400 px-2 uppercase tracking-wider">
            Catégories
          </h2>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                selectedCategory === ""
                  ? "bg-indigo-600 text-white"
                  : "bg-[#12141c] text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              Toutes les séries
            </button>
            {loadingCats ? (
              <p className="text-xs text-zinc-500 p-2">Chargement...</p>
            ) : (
              (categories || []).map((cat: any) => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategory(String(cat.category_id))}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors truncate ${
                    String(selectedCategory) === String(cat.category_id)
                      ? "bg-indigo-600 text-white"
                      : "bg-[#12141c] text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {cat.category_name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Grille des séries */}
        <div className="md:col-span-9">
          {loadingSeries ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Aucune série trouvée.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSeries.map((item: any) => (
                <Link
                  key={item.series_id}
                  href={`/series/${item.series_id}`}
                  className="group relative bg-[#12141c] border border-white/5 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:scale-[1.02]"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-900 relative">
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                        Pas d'image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-400 transition-colors">
                      {item.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

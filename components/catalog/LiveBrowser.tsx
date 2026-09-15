"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Tv, Play, Search, LayoutGrid, ChevronDown, Check } from "lucide-react";

export function LiveBrowser() {
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // États pour le Popover Mobile des catégories
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.liveCategories(), api.liveStreams()])
      .then(([cats, streams]) => {
        const catList = cats || [];
        const streamList = streams || [];
        setCategories(catList);
        setChannels(streamList);

        if (catList.length > 0) setSelectedCategory(String(catList[0].category_id));
        if (streamList.length > 0) setSelectedChannel(streamList[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fermer le popover si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrage des catégories dans le Popover
  const filteredCategories = categories.filter((cat) =>
    cat.category_name?.toLowerCase().includes(catSearch.toLowerCase())
  );

  const activeCategoryName =
    selectedCategory === "all"
      ? "All categories"
      : categories.find((c) => String(c.category_id) === String(selectedCategory))?.category_name || "Select Category";

  // Filtrage des chaînes
  const filteredChannels = channels.filter((ch) => {
    const matchesCategory =
      selectedCategory === "all" || String(ch.category_id) === String(selectedCategory);
    const matchesSearch =
      !searchQuery || ch.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* BARRE POPUP DE CATÉGORIES (Mobile Uniquement) */}
      <div className="block md:hidden relative" ref={popoverRef}>
        <button
          onClick={() => setIsCatOpen(!isCatOpen)}
          className="w-full flex items-center justify-between glass px-4 py-3 rounded-2xl text-xs font-semibold text-white border border-white/10 shadow-xl active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5 truncate">
            <LayoutGrid className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="truncate">{activeCategoryName}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isCatOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Menu Déroulant Glassmorphism */}
        {isCatOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 panel rounded-2xl border border-white/10 p-2.5 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
            {/* Recherche dans les catégories */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl text-xs pl-8 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Liste scrollable */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setIsCatOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  selectedCategory === "all" ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <span>All categories</span>
                {selectedCategory === "all" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              {filteredCategories.map((cat) => {
                const isActive = selectedCategory === String(cat.category_id);
                return (
                  <button
                    key={cat.category_id}
                    onClick={() => {
                      setSelectedCategory(String(cat.category_id));
                      setIsCatOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                      isActive ? "bg-indigo-600/30 text-indigo-300 font-bold" : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate pr-2">{cat.category_name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DISPOSITION EN 3 COLONNES (WEB) / STACK (MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Sidebar Catégories Web */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 panel rounded-2xl p-4 flex-col gap-1.5 h-[calc(100vh-140px)] overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Categories</h2>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              selectedCategory === "all" ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-white/5"
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => {
            const isActive = selectedCategory === String(cat.category_id);
            return (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(String(cat.category_id))}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-normal break-words leading-snug ${
                  isActive ? "bg-indigo-600 text-white font-bold" : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                {cat.category_name}
              </button>
            );
          })}
        </div>

        {/* Colonne Chaînes */}
        <div className="col-span-1 md:col-span-4 lg:col-span-4 panel rounded-2xl p-4 space-y-3 h-[380px] md:h-[calc(100vh-140px)] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Channels ({filteredChannels.length})
            </h2>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl text-xs px-3 py-2 pl-8 text-white focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {filteredChannels.map((ch) => {
              const isSelected = selectedChannel?.stream_id === ch.stream_id;
              return (
                <button
                  key={ch.stream_id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                    isSelected ? "border-indigo-500/50 bg-indigo-500/10 text-white font-semibold" : "border-transparent text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Tv className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{ch.name}</span>
                  {isSelected && <Play className="w-3 h-3 fill-current text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Colonne Lecteur Live */}
        <div className="col-span-1 md:col-span-4 lg:col-span-5 space-y-3 panel rounded-2xl p-4 sticky top-4">
          {selectedChannel ? (
            <>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5">
                <VideoPlayer
                  key={selectedChannel.stream_id}
                  sources={[`/api/stream?type=live&id=${selectedChannel.stream_id}&ext=ts`]}
                  ext="ts"
                  isLive={true}
                  title={selectedChannel.name}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{selectedChannel.name}</h3>
              </div>
            </>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-black/50 border border-white/5 flex items-center justify-center text-xs text-zinc-500">
              Select a channel to play live
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Tv, Play, ChevronDown, Search, Maximize } from "lucide-react";

export default function LiveTvPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    Promise.all([api.liveCategories(), api.liveStreams()])
      .then(([cats, streams]) => {
        const catList = cats || [];
        const streamList = streams || [];
        
        setCategories(catList);
        setChannels(streamList);

        if (catList.length > 0) {
          setSelectedCategory(String(catList[0].category_id));
        }
        if (streamList.length > 0) {
          setSelectedChannel(streamList[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Plein écran horizontal au double tap
  const handleFullscreenLandscape = async () => {
    const elem = playerContainerRef.current;
    if (!elem) return;

    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }

      if (window.screen?.orientation && "lock" in window.screen.orientation) {
        await (window.screen.orientation as any).lock("landscape").catch(() => {});
      }
    } catch (err) {
      console.error("Erreur plein écran:", err);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleFullscreenLandscape();
    }
    lastTapRef.current = now;
  };

  const filteredChannels = channels.filter((ch) => {
    const matchesCategory =
      selectedCategory === "all" ||
      String(ch.category_id) === String(selectedCategory);
    const matchesSearch =
      !searchQuery ||
      ch.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0b0c10]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100 p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Live TV</h1>

      {/* Dropdown Mobile */}
      <div className="block md:hidden relative">
        <label className="text-xs font-semibold text-zinc-400 mb-1 block">
          Catégorie :
        </label>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none bg-[#12141c] border border-white/10 text-white text-xs rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Toutes les chaînes ({channels.length})</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Grid 3 Colonnes Web */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        
        {/* Colonne 1 : Catégories lisibles sans troncature */}
        <div className="hidden md:flex md:col-span-4 lg:col-span-3 bg-[#12141c] border border-white/5 rounded-2xl p-4 flex-col gap-1.5 h-[calc(100vh-140px)] overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Catégories
          </h2>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white font-bold"
                : "text-zinc-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Toutes les chaînes
          </button>
          {categories.map((cat) => {
            const isActive = selectedCategory === String(cat.category_id);
            return (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(String(cat.category_id))}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-normal break-words leading-snug ${
                  isActive
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {cat.category_name}
              </button>
            );
          })}
        </div>

        {/* Colonne 2 : Chaînes */}
        <div className="col-span-1 md:col-span-4 lg:col-span-4 bg-[#12141c] border border-white/5 rounded-2xl p-4 space-y-3 h-[380px] md:h-[calc(100vh-140px)] overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Chaînes ({filteredChannels.length})
            </h2>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une chaîne..."
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
                    isSelected
                      ? "border-indigo-500/50 bg-indigo-500/10 text-white font-semibold"
                      : "border-transparent text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <Tv className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">
                    {ch.name}
                  </span>
                  {isSelected && <Play className="w-3 h-3 fill-current text-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Colonne 3 : Lecteur Live TV avec double-tap */}
        <div className="col-span-1 md:col-span-4 lg:col-span-5 space-y-3 bg-[#12141c] border border-white/5 rounded-2xl p-4 sticky top-4">
          {selectedChannel ? (
            <>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate max-w-[80%]">
                  {selectedChannel.name}
                </h3>
                <button
                  onClick={handleFullscreenLandscape}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                  title="Plein Écran Horizontal"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={playerContainerRef}
                onClick={handleDoubleTap}
                className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/5 cursor-pointer"
              >
                <div className="absolute inset-0 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain">
                  <VideoPlayer
                    key={selectedChannel.stream_id}
                    sources={[
                      `/api/stream?type=live&id=${selectedChannel.stream_id}&ext=ts`,
                    ]}
                    ext="ts"
                    isLive={true}
                    title={selectedChannel.name}
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Double-tapez sur la vidéo pour passer en plein écran horizontal.
              </p>
            </>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-black/50 border border-white/5 flex items-center justify-center text-xs text-zinc-500">
              Sélectionnez une chaîne pour démarrer le direct
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

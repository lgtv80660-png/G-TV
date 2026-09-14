"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Star } from "lucide-react";

export interface PosterItem {
  id?: string | number;
  series_id?: string | number;
  stream_id?: string | number;
  name?: string;
  title?: string;
  subtitle?: string;
  cover?: string;
  stream_icon?: string;
  poster?: string;
  rating?: string | number;
  year?: string | number;
  releaseDate?: string;
}

interface PosterCardProps {
  item: PosterItem;
  href: string;
  className?: string;
  index?: number;
  onPlay?: (item: PosterItem) => void;
}

export const PosterCard: React.FC<PosterCardProps> = ({ item, href, onPlay }) => {
  const [imageError, setImageError] = useState(false);
  const title = item.name || item.title || "Titre inconnu";
  
  let imageUrl = item.cover || item.stream_icon || item.poster || "";
  if (imageUrl && imageUrl.startsWith("http://")) {
    imageUrl = `/api/hls?u=${encodeURIComponent(imageUrl)}`;
  }

  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      onPlay(item);
    }
  };

  const ratingValue = Number(item.rating);

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card/60 backdrop-blur-sm border border-white/5 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 focus:outline-none cursor-pointer"
    >
      {/* Container de l'image de couverture */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900/80">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400 font-bold text-xl">
            {initials}
          </div>
        )}

        {/* Overlay sombre + Bouton Play au survol */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Badge Note / Rating s'il existe */}
        {ratingValue > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            <span>{ratingValue.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Informations sous l'affiche */}
      <div className="p-3 flex flex-col gap-1 bg-gradient-to-b from-card/40 to-card">
        <h3 className="line-clamp-1 text-sm font-medium text-zinc-100 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-zinc-400 font-normal">
          {item.subtitle ? (
            <span>{item.subtitle}</span>
          ) : (
            <span>{item.year || (item.releaseDate ? item.releaseDate.slice(0, 4) : "")}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

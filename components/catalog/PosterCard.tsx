"use client";

import React, { useState } from "react";
import Link from "next/link";

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
  year?: string | number;
  releaseDate?: string;
}

interface PosterCardProps {
  item: PosterItem;
  href: string;
  className?: string;
  index?: number;
}

export const PosterCard: React.FC<PosterCardProps> = ({ item, href }) => {
  const [imageError, setImageError] = useState(false);

  const title = item.name || item.title || "Titre inconnu";
  
  // Extraction dynamique de l'URL de l'image (couverture série, VOD ou poster)
  let imageUrl = item.cover || item.stream_icon || item.poster || "";

  // Proxy temporaire pour contourner le blocage Mixed Content (HTTP sur HTTPS)
  if (imageUrl && imageUrl.startsWith("http://")) {
    imageUrl = `/api/hls?u=${encodeURIComponent(imageUrl)}`;
  }

  // Fallback initiales si pas d'image
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-lg bg-card transition-all duration-200 hover:scale-105 hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-400 font-bold text-lg">
            {initials}
          </div>
        )}
      </div>

      <div className="p-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">
          {title}
        </h3>
        {item.subtitle ? (
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        ) : (
          item.year && <p className="text-xs text-muted-foreground">{item.year}</p>
        )}
      </div>
    </Link>
  );
};

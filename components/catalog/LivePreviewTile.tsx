"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Tv, Play } from "lucide-react";
import { useLibrary } from "@/store/library";
import { useLiveStreams } from "@/lib/hooks";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

export function LivePreviewTile({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { progress } = useLibrary();
  const { data: liveStreams = [] } = useLiveStreams();

  const lastLiveChannel = useMemo(() => {
    const list = Array.isArray(progress) ? progress : Object.values(progress ?? {});
    return list.find(
      (item: any) =>
        item.type === "live" ||
        item.stream_type === "live" ||
        item.category_id?.includes("live")
    );
  }, [progress]);

  const channelToPlay = lastLiveChannel || liveStreams[0];
  const channelTitle = channelToPlay?.name || channelToPlay?.title || t("Home.liveTv");
  const streamIcon = channelToPlay?.stream_icon;

  return (
    <Link
      href="/live"
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-5 transition-all duration-300 hover:border-mint-400/50 hover:shadow-lg hover:shadow-mint-500/10",
        className
      )}
    >
      {/* Arrière-plan visuel ultra-léger (pas de lecteur vidéo lourd) */}
      {channelToPlay ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {streamIcon ? (
            <img
              src={streamIcon}
              alt={channelTitle}
              className="h-full w-full object-cover opacity-25 blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:opacity-40"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-mint-950/40 via-ink-950 to-ink-900" />
          )}

          {/* Effet de brillance / animation "Live" sans charger le GPU */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
          
          {/* Badge Play au centre lors du survol */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-500/80 text-white shadow-lg backdrop-blur-md">
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-500/10 text-mint-400 border border-mint-500/20">
          <Tv className="h-5 w-5" />
        </div>
      )}

      {/* Informations sur la chaîne */}
      <div className="relative z-10 mt-auto space-y-0.5">
        <div className="flex items-center gap-2">
          {channelToPlay && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-500"></span>
            </span>
          )}
          <h3 className="text-base font-bold text-white transition-colors group-hover:text-mint-400">
            {channelTitle}
          </h3>
        </div>
        <p className="text-xs text-fog-400">
          {lastLiveChannel ? t("Hero.continueWatching") : t("Home.channelsEpg")}
        </p>
      </div>
    </Link>
  );
}

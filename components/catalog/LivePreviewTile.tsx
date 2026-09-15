"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";
import { useLibrary } from "@/store/library";
import { useTranslation } from "@/lib/useTranslation";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { cn } from "@/lib/utils";

export function LivePreviewTile({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { progress } = useLibrary();

  const lastLiveChannel = useMemo(() => {
    const list = Array.isArray(progress) ? progress : Object.values(progress ?? {});
    return list.find((item: any) => item.type === "live" || item.streamId || item.stream_id);
  }, [progress]);

  const streamId = lastLiveChannel?.streamId || lastLiveChannel?.stream_id || lastLiveChannel?.id;
  const streamExt = lastLiveChannel?.ext || "m3u8";
  const channelTitle = lastLiveChannel?.title || lastLiveChannel?.name || t("Home.liveTv");

  return (
    <Link
      href="/live"
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-5 transition-all duration-300 hover:border-mint-400/50 hover:shadow-lg hover:shadow-mint-500/10",
        className
      )}
    >
      {streamId ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-40 transition-opacity duration-500 group-hover:opacity-60">
          <div className="h-full w-full [&>div]:h-full [&>div]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
            <VideoPlayer
              key={streamId}
              sources={[`/api/stream?type=live&id=${streamId}&ext=${streamExt}`]}
              ext={streamExt}
              isLive={true}
              title={channelTitle}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-500/10 text-mint-400 border border-mint-500/20">
          <Tv className="h-5 w-5" />
        </div>
      )}

      <div className="relative z-10 mt-auto space-y-0.5">
        <div className="flex items-center gap-2">
          {streamId && (
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

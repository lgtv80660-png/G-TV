"use client";

import Link from "next/link";
import { Tv } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { cn } from "@/lib/utils";

export function LivePreviewTile({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link
      href="/live"
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-5 transition-all duration-300 hover:border-mint-400/50 hover:shadow-lg hover:shadow-mint-500/10",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-500/10 text-mint-400 border border-mint-500/20">
        <Tv className="h-5 w-5" />
      </div>

      <div className="relative z-10 mt-auto space-y-0.5">
        <h3 className="text-base font-bold text-white transition-colors group-hover:text-mint-400">
          {t("Home.liveTv")}
        </h3>
        <p className="text-xs text-fog-400">
          {t("Home.channelsEpg")}
        </p>
      </div>
    </Link>
  );
}

export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

  if (u.includes(".m3u8") || e === "m3u8" || isLive) {
    return "hls";
  }
  if (e === "ts") return "mpegts";

  return "native";
}

export async function attach(
  video: HTMLVideoElement,
  opts: { url: string; ext: string; isLive: boolean },
): Promise<EngineHandle> {
  const kind = pickEngine(opts.url, opts.ext, opts.isLive);

  // 1. LECTURE HLS (Anti-freeze Live sur Vercel & Sync Audio)
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        enableAudioTrackSwitch: true,
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else hls.destroy();
      });

      hls.loadSource(opts.url);
      hls.attachMedia(video);
      return { kind: "hls", destroy: () => hls.destroy() };
    }
  }

  // 2. MPEG-TS
  if (kind === "mpegts") {
    const mpegts = (await import("mpegts.js")).default;
    if (mpegts.getFeatureList().mseLivePlayback || mpegts.isSupported()) {
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: opts.isLive, url: opts.url },
        {
          enableStashBuffer: true,
          stashInitialSize: 384, // Permet de recevoir le premier frame audio complet
          lazyLoad: false,
          liveBufferLatencyChasing: true,
          autoCleanupSourceBuffer: true,
        },
      );

      player.attachMediaElement(video);
      player.load();

      return {
        kind: "mpegts",
        destroy: () => {
          try {
            player.unload();
            player.detachMediaElement();
            player.destroy();
          } catch {}
        },
      };
    }
  }

  // 3. NATIVE
  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

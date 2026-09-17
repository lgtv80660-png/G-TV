export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

  // HLS uniquement si l'URL ou l'extension demande explicitement du m3u8
  if (u.includes(".m3u8") || e === "m3u8") {
    return "hls";
  }

  // Tout le Live TV et les fichiers .ts repassent sur mpegts.js
  if (isLive || e === "ts") {
    return "mpegts";
  }

  return "native";
}

export async function attach(
  video: HTMLVideoElement,
  opts: { url: string; ext: string; isLive: boolean },
): Promise<EngineHandle> {
  const kind = pickEngine(opts.url, opts.ext, opts.isLive);

  // 1. MPEG-TS (Live TV binaire direct via le proxy /api/stream - Anti-CORS & Anti-404)
  if (kind === "mpegts") {
    const mpegts = (await import("mpegts.js")).default;
    if (mpegts.getFeatureList().mseLivePlayback || mpegts.isSupported()) {
      const player = mpegts.createPlayer(
        {
          type: "mpegts",
          isLive: true,
          url: opts.url,
        },
        {
          enableStashBuffer: false,
          stashInitialSize: 128,
          lazyLoad: false,
          liveBufferLatencyChasing: true,
          autoCleanupSourceBuffer: true,
        },
      );

      player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string) => {
        if (errorType === mpegts.ErrorTypes.NETWORK_ERROR) {
          try {
            player.unload();
            player.load();
            player.play().catch(() => {});
          } catch {}
        }
      });

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

  // 2. HLS (.m3u8 si disponible)
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
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

  // 3. NATIVE (Films et Séries MP4)
  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

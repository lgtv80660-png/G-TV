export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

  // HLS déclenché pour .m3u8 ou pour les flux Live Vercel
  if (u.includes("m3u8") || e === "m3u8" || isLive) {
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

  // 1. LECTURE HLS (Incompatible avec les freezes Serverless Vercel)
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
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
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Support Safari/iOS
      video.src = opts.url;
      return {
        kind: "hls",
        destroy: () => {
          video.removeAttribute("src");
          video.load();
        },
      };
    }
  }

  // 2. MPEG-TS
  if (kind === "mpegts") {
    const mpegts = (await import("mpegts.js")).default;
    if (mpegts.getFeatureList().mseLivePlayback || mpegts.isSupported()) {
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: opts.isLive, url: opts.url },
        {
          enableStashBuffer: false,
          stashInitialSize: 128,
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

  // 3. NATIVE (Pour le MP4)
  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

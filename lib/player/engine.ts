export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

  if (u.includes(".m3u8") || e === "m3u8") return "hls";
  if (isLive || e === "ts") return "mpegts";

  return "native";
}

export async function attach(
  video: HTMLVideoElement,
  opts: { url: string; ext: string; isLive: boolean },
): Promise<EngineHandle> {
  const kind = pickEngine(opts.url, opts.ext, opts.isLive);

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
          enableStashBuffer: false,             // Empêche l'accumulation de données et les freezes
          stashInitialSize: 0,                   // Démarre la lecture instantanément
          liveBufferLatencyChasing: true,       // Force le rattrapage automatique du direct
          liveBufferLatencyMax: 2.5,             // Saute au direct si le retard dépasse 2.5s
          liveBufferLatencyMin: 0.8,
          autoCleanupSourceBuffer: true,        // Libère la mémoire du navigateur au fur et à mesure
        },
      );

      player.attachMediaElement(video);
      player.load();

      // Gestion des micro-coupures réseau Vercel
      player.on(mpegts.Events.ERROR, (errType: string) => {
        if (errType === mpegts.ErrorTypes.NETWORK_ERROR) {
          try {
            player.unload();
            player.load();
            player.play().catch(() => {});
          } catch {}
        }
      });

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

  // Fallback HLS
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
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

  // Native MP4
  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

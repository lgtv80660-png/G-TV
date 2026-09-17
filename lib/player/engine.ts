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
          enableStashBuffer: true,               // Activé pour amortir les variations de débit Railway/Vercel
          stashInitialSize: 384 * 1024,          // Tampon de sécurité (384KB) pour éviter le freeze immédiat
          liveBufferLatencyChasing: true,       // Rattrapage doux du direct
          liveBufferLatencyMax: 5.0,             // Seuil étendu à 5s pour éviter les sauts brutaux
          liveBufferLatencyMin: 1.5,
          autoCleanupSourceBuffer: true,        // Nettoyage régulier de la mémoire
        },
      );

      player.attachMediaElement(video);
      player.load();

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

  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
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

  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

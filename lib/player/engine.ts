export type EngineKind = "mpegts" | "hls" | "native" | "unsupported";

export interface EngineHandle {
  kind: EngineKind;
  destroy: () => void;
}

export function pickEngine(url: string, ext: string, isLive: boolean): EngineKind {
  const u = url.toLowerCase();
  const e = ext.toLowerCase().replace(/^\./, "");

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

  // 1. HLS (Correction des URLs relatives des segments .ts pour éviter le 404)
  if (kind === "hls") {
    const Hls = (await import("hls.js")).default;
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        // Démultiplexeur audio intégré pour décoder le AC-3 en AAC côté client !
        enableSoftwareAES: true,
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

  // 2. NATIVE
  video.src = opts.url;
  return {
    kind: "native",
    destroy: () => {
      video.removeAttribute("src");
      video.load();
    },
  };
}

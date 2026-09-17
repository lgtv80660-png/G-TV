import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as StreamKind | null;
  const id = searchParams.get("id");
  let ext = searchParams.get("ext") || "mp4";

  if (!type || !id) return new Response("Bad request", { status: 400 });

  const creds = await requireSession();
  
  // Pour le Live, on demande le format HLS .m3u8
  if (type === "live") ext = "m3u8";

  // Force l'extension MP4 si c'est du VOD MKV pour assurer la piste son AAC
  if (type !== "live" && ext.toLowerCase() === "mkv") {
    ext = "mp4";
  }

  const targetUrl = buildStreamUrl(creds, type, id, ext);

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      redirect: "follow",
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream error ${upstreamRes.status}`, { status: upstreamRes.status });
    }

    // TRAITEMENT SPECIFIQUE HLS / LIVE : Réécriture des segments .ts pour éviter le bloquage CORS
    if (type === "live" || ext === "m3u8") {
      const playlistText = await upstreamRes.text();
      const baseUrl = new URL(targetUrl);
      const baseOrigin = `${baseUrl.protocol}//${baseUrl.host}`;
      const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1);

      // Réécriture des URLs de chaque segment .ts de la playlist
      const rewrittenPlaylist = playlistText.replace(/^(?!#)(.+)$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
        if (trimmed.startsWith("/")) return `${baseOrigin}${trimmed}`;
        return `${baseOrigin}${basePath}${trimmed}`;
      });

      return new Response(rewrittenPlaylist, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // TRAITEMENT VOD STANDARD (Séries & Films)
    const responseHeaders = new Headers();
    const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
    passthrough.forEach((h) => {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    });

    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    const { readable, writable } = new TransformStream();
    upstreamRes.body?.pipeTo(writable).catch(() => {});

    return new Response(readable, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
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

  if (!type || !id || !["movie", "series", "live"].includes(type)) {
    return new Response("Bad stream request", { status: 400 });
  }

  // Remplacement de l'extension MKV par MP4 pour que le serveur IPTV ré-encoche l'audio en AAC
  if (type !== "live" && ext.toLowerCase() === "mkv") {
    ext = "mp4";
  }

  const creds = await requireSession();
  let upstreamUrl = buildStreamUrl(creds, type, id, ext);

  if (type !== "live") {
    try {
      const located = await locatePlayable(creds, type, id, ext);
      if (located?.url) upstreamUrl = located.url;
    } catch {}
  }

  // Transmissions des en-têtes Range pour le Seeking
  const headers = new Headers();
  headers.set("User-Agent", UA);
  headers.set("Accept", "*/*");

  const range = req.headers.get("range");
  if (range) headers.set("Range", range);

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Upstream stream error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
      });
    }

    const responseHeaders = new Headers();
    const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];

    passthrough.forEach((h) => {
      const val = upstreamRes.headers.get(h);
      if (val) responseHeaders.set(h, val);
    });

    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", type === "live" ? "video/mp2t" : "video/mp4");
    }

    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("X-Accel-Buffering", "no");

    // Conduit binaire universel Vercel
    const { readable, writable } = new TransformStream();
    upstreamRes.body?.pipeTo(writable).catch(() => {});

    return new Response(readable, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error("[VERCEL STREAM PROXY ERROR]:", err.message);
    return new Response(`Stream proxy failed: ${err.message}`, { status: 502 });
  }
}

import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

export async function GET(req: Request) {
  let creds;
  try {
    creds = await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as StreamKind | null;
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "ts";

  if (!type || !id || !["live", "movie", "series"].includes(type)) {
    return new Response("Bad stream request", { status: 400 });
  }

  let upstreamUrl = buildStreamUrl(creds, type, id, ext);
  if (type !== "live") {
    const located = await locatePlayable(creds, type, id, ext);
    if (located) {
      upstreamUrl = located.url;
    }
  }

  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
  };

  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers,
      redirect: "follow",
      // @ts-expect-error - undici option
      duplex: "half",
      signal: req.signal,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Upstream returned ${upstream.status}`, { status: upstream.status });
    }

    const respHeaders = new Headers();
    const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) respHeaders.set(h, v);
    }

    if (!respHeaders.has("content-type")) {
      respHeaders.set("content-type", type === "live" ? "video/mp2t" : "video/mp4");
    }

    // --- EN-TÊTES CRITIQUES POUR RAILWAY ---
    respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    respHeaders.set("Pragma", "no-cache");
    respHeaders.set("Expires", "0");
    respHeaders.set("X-Accel-Buffering", "no"); // Désactive le buffering proxy
    respHeaders.set("Connection", "keep-alive");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return new Response("Stream connection failed", { status: 502 });
  }
}

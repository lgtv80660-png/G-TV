import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User-Agent imitant un lecteur Smart TV / Chrome réél
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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

  // Headers d'imitation de navigateur complet pour contourner le blocage Datacenter
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Encoding": "identity",
    Connection: "close", // Empêche la réutilisation de socket bloquée
  };

  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout max

    const upstream = await fetch(upstreamUrl, {
      headers,
      redirect: "follow",
      // @ts-expect-error - undici option
      duplex: "half",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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

    respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    respHeaders.set("X-Accel-Buffering", "no");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err: any) {
    console.error(`[STREAM ERROR] ${type}/${id}:`, err?.message || err);
    if (err.name === "AbortError") {
      return new Response("Upstream Timeout", { status: 504 });
    }
    return new Response(`Stream connection failed: ${err?.message || "Unknown"}`, { status: 502 });
  }
}

import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
// Streaming responses must not be statically optimized / buffered.
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20"; // many providers gate on a player-like UA

/**
 * Media proxy. Builds the real provider URL from the session creds and pipes
 * bytes back to the browser, forwarding Range requests so VOD seeking works.
 *   /api/stream?type=movie&id=123&ext=mp4
 *   /api/stream?type=live&id=456&ext=ts
 */
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
    if (!located) {
      console.log(`[STREAM] ${type}/${id} UNAVAILABLE (no playable container)`);
      return new Response("Title unavailable from provider", {
        status: 404,
        headers: { "x-lumen-unavailable": "1" },
      });
    }
    upstreamUrl = located.url;
  }

  const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  const t0 = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers,
      redirect: "follow",
      // @ts-expect-error - undici option, allows half-duplex streaming
      duplex: "half",
      signal: req.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    console.log(`[STREAM] ${type}/${id} PROXY upstream FETCH FAILED after ${Date.now() - t0}ms: ${(err as Error).message}`);
    return new Response(`Upstream fetch failed: ${(err as Error).message}`, { status: 502 });
  }

  console.log(
    `[STREAM] ${type}/${id} PROXY status=${upstream.status} ttfb=${Date.now() - t0}ms range=${range || "none"} ct=${upstream.headers.get("content-type") || "?"}`,
  );

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream returned ${upstream.status}`, { status: upstream.status });
  }

  const respHeaders = new Headers();
  const passthrough = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "content-disposition",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  if (!respHeaders.has("content-type")) {
    respHeaders.set("content-type", type === "live" ? "video/mp2t" : "video/mp4");
  }
  if (!respHeaders.has("accept-ranges") && type !== "live") {
    respHeaders.set("accept-ranges", "bytes");
  }
  respHeaders.set("cache-control", "no-store");

  // Protection contre le crash pipe / UND_ERR_SOCKET lors de l'interruption client
  const upstreamBody = upstream.body;
  if (!upstreamBody) {
    return new Response("No upstream body", { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (err: any) {
        // Ignorer silencieusement les fermetures de socket / interruptions volontaires
        if (
          err?.name === "AbortError" ||
          err?.code === "UND_ERR_SOCKET" ||
          err?.message?.includes("closed") ||
          err?.message?.includes("terminated")
        ) {
          try {
            controller.close();
          } catch {
            // le controller peut déjà être fermé
          }
        } else {
          controller.error(err);
        }
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      // Interception de l'annulation côté navigateur
    },
  });

  return new Response(stream, {
    status: upstream.status,
    headers: respHeaders,
  });
}

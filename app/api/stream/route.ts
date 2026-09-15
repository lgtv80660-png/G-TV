import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Désactiver la vérification SSL stricte pour les serveurs Xtream en HTTPS avec certificats expirés/auto-signés
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const UA = "IPTVSmartersPro/3.1.5 (Linux; Android 10)";

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
        headers: { "x-G-Player-unavailable": "1" },
      });
    }
    upstreamUrl = located.url;
  }

  // Préparation des en-têtes réseau avec simulation d'un client IPTV Android
  const headers: Record<string, string> = {
    "User-Agent": UA,
    "Accept": "*/*",
    "Connection": "keep-alive",
  };

  const range = req.headers.get("range");
  if (range) headers["Range"] = range;

  const t0 = Date.now();
  let upstream: Response;

  try {
    // Premier essai direct
    upstream = await fetch(upstreamUrl, {
      headers,
      redirect: "manual", // Gérer les 302/301 manuellement pour éviter les erreurs de protocole Fetch
      cache: "no-store",
      signal: req.signal,
    });

    // Si le serveur Xtream renvoie une redirection (301, 302, 307, 308)
    if ([301, 302, 307, 308].includes(upstream.status)) {
      const redirectUrl = upstream.headers.get("location");
      if (redirectUrl) {
        console.log(`[STREAM] ${type}/${id} REDIRECTED to: ${redirectUrl}`);
        upstream = await fetch(redirectUrl, {
          headers,
          redirect: "follow",
          cache: "no-store",
          signal: req.signal,
        });
      }
    }
  } catch (err) {
    console.log(`[STREAM] ${type}/${id} PROXY FETCH FAILED after ${Date.now() - t0}ms: ${(err as Error).message}`);
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

  // Désactiver la mise en cache et autoriser CORS
  respHeaders.set("cache-control", "no-store, no-cache, must-revalidate");
  respHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

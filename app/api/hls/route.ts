import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { putUrl, getUrl } from "@/lib/hls/registry";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(url.protocol)) return false;
  const h = url.hostname;
  if (h === "localhost" || h.endsWith(".local") || h === "::1") return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

export async function GET(req: Request) {
  let creds;
  try {
    creds = await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");
  const id = searchParams.get("id");
  const u = searchParams.get("u");

  const playlistUrl = token
    ? getUrl(token)
    : u
      ? isPublicHttpUrl(u)
        ? u
        : null
      : id
        ? buildStreamUrl(creds, "live", id, "m3u8")
        : null;

  if (!playlistUrl) return new Response("Bad HLS request", { status: 400 });

  try {
    const upstreamRes = await fetchUpstream(playlistUrl);

    if (!upstreamRes.text.includes("#EXTM3U") && !/mpegurl/i.test(upstreamRes.contentType)) {
      if (id) {
        const virtualPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
/api/stream?type=live&id=${id}&ext=ts
`;
        return new Response(virtualPlaylist, {
          headers: {
            "content-type": "application/vnd.apple.mpegurl",
            "cache-control": "no-store",
          },
        });
      }
      return new Response("Not an HLS playlist", { status: 415 });
    }

    const finalUrl = upstreamRes.finalUrl || playlistUrl;
    const rewritten = rewritePlaylist(upstreamRes.text, finalUrl);

    return new Response(rewritten, {
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        "cache-control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("[HLS ROUTE TIMEOUT/ERROR]:", err?.message || err);

    // Si la résolution HLS prend trop de temps, on bascule directement vers le flux MPEG-TS
    if (id) {
      const fallbackPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
/api/stream?type=live&id=${id}&ext=ts
`;
      return new Response(fallbackPlaylist, {
        headers: { "content-type": "application/vnd.apple.mpegurl", "cache-control": "no-store" },
      });
    }

    return new Response(`HLS upstream failed: ${err?.message || "Unknown"}`, { status: 502 });
  }
}

function fetchUpstream(targetUrl: string): Promise<{ text: string; contentType: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const req = client.request(
      targetUrl,
      {
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "application/vnd.apple.mpegurl,*/*",
          Connection: "close", // Fermeture immédiate de la socket
        },
        timeout: 5000, // Timeout court (5s) pour basculer rapidement sur /api/stream
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return fetchUpstream(redirectUrl).then(resolve).catch(reject);
        }

        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            text: data,
            contentType: (res.headers["content-type"] as string) || "",
            finalUrl: targetUrl,
          });
        });
      }
    );

    req.on("error", (e) => reject(e));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Upstream timeout"));
    });
    req.end();
  });
}

function rewritePlaylist(text: string, playlistUrl: string): string {
  const base = new URL(playlistUrl);
  const resolve = (u: string) => {
    try {
      return new URL(u, base).toString();
    } catch {
      return u;
    }
  };

  return text
    .split("\n")
    .map((line) => {
      const l = line.trim();
      if (!l) return line;
      if (l.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="/api/hlsseg?t=${putUrl(resolve(u))}"`);
      }
      const abs = resolve(l);
      if (/\.m3u8(\?|$)/i.test(l)) return `/api/hls?t=${putUrl(abs)}`;
      return `/api/hlsseg?t=${putUrl(abs)}`;
    })
    .join("\n");
}

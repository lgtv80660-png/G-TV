import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";

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
  const ext = searchParams.get("ext") || "mp4";

  if (!type || !id || !["movie", "series", "live"].includes(type)) {
    return new Response("Bad stream request", { status: 400 });
  }

  let upstreamUrl = buildStreamUrl(creds, type, id, ext);

  if (type !== "live") {
    try {
      const located = await locatePlayable(creds, type, id, ext);
      if (located?.url) upstreamUrl = located.url;
    } catch {}
  }

  return proxyStreamWithRange(upstreamUrl, req, ext, type);
}

function proxyStreamWithRange(targetUrl: string, req: Request, ext: string, type: StreamKind, redirects = 5): Promise<Response> {
  return new Promise((resolve) => {
    if (redirects <= 0) {
      return resolve(new Response("Too many redirects", { status: 502 }));
    }

    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        "User-Agent": UA,
        Accept: "*/*",
        Connection: "keep-alive",
      };

      const range = req.headers.get("range");
      if (range) headers["Range"] = range;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
        rejectUnauthorized: false,
      };

      const proxyReq = client.request(options, (upstreamRes) => {
        if (
          upstreamRes.statusCode &&
          [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
          upstreamRes.headers.location
        ) {
          const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
          return resolve(proxyStreamWithRange(nextUrl, req, ext, type, redirects - 1));
        }

        const respHeaders = new Headers();
        
        // Transfert des headers essentiels pour le streaming continu
        const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
        passthrough.forEach((h) => {
          if (upstreamRes.headers[h]) {
            const val = upstreamRes.headers[h];
            respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
          }
        });

        if (!respHeaders.has("content-type")) {
          respHeaders.set("content-type", ext === "mkv" ? "video/x-matroska" : "video/mp4");
        }

        respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        respHeaders.set("X-Accel-Buffering", "no");
        respHeaders.set("Access-Control-Allow-Origin", "*");

        const stream = new ReadableStream({
          start(controller) {
            upstreamRes.on("data", (chunk) => {
              try { controller.enqueue(chunk); } catch {}
            });
            upstreamRes.on("end", () => {
              try { controller.close(); } catch {}
            });
            upstreamRes.on("error", () => {
              try { controller.close(); } catch {}
            });
          },
          cancel() {
            upstreamRes.destroy();
          },
        });

        // RECONSERVATION DU STATUT HTTP DE L'UPSTREAM (ex: 206 Partial Content)
        resolve(
          new Response(stream, {
            status: upstreamRes.statusCode || 200,
            headers: respHeaders,
          })
        );
      });

      proxyReq.on("error", () => {
        resolve(new Response("Stream error", { status: 502 }));
      });

      proxyReq.end();
    } catch {
      resolve(new Response("Internal Proxy Error", { status: 500 }));
    }
  });
}

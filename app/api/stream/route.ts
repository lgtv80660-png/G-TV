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

  // En Live, on remet le format original TS binaire pour mpegts.js
  if (type === "live") {
    ext = "ts";
  } else if (ext.toLowerCase() === "mkv") {
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

  return new Promise<Response>((resolve) => {
    try {
      const parsed = new URL(upstreamUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const headers: Record<string, string> = {
        "User-Agent": UA,
        Accept: "*/*",
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
        // Redirection automatique si le fournisseur change de serveur
        if (
          upstreamRes.statusCode &&
          [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
          upstreamRes.headers.location
        ) {
          const nextUrl = new URL(upstreamRes.headers.location, upstreamUrl).toString();
          return resolve(fetch(nextUrl, { headers: { "User-Agent": UA } }));
        }

        const respHeaders = new Headers();
        
        const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
        passthrough.forEach((h) => {
          if (upstreamRes.headers[h]) {
            const val = upstreamRes.headers[h];
            respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
          }
        });

        if (!respHeaders.has("content-type")) {
          respHeaders.set("content-type", type === "live" ? "video/mp2t" : "video/mp4");
        }

        // Headers CORS & anti-buffering stricts
        respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        respHeaders.set("X-Accel-Buffering", "no");

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

        resolve(
          new Response(stream, {
            status: upstreamRes.statusCode || 200,
            headers: respHeaders,
          })
        );
      });

      proxyReq.on("error", (err) => {
        resolve(new Response(`Proxy Stream Error: ${err.message}`, { status: 502 }));
      });

      proxyReq.end();
    } catch (err: any) {
      resolve(new Response(`Fatal Error: ${err.message}`, { status: 500 }));
    }
  });
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

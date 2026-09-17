import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";
import { PassThrough } from "stream";

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
      if (located?.url) {
        upstreamUrl = located.url;
      }
    } catch (e) {
      console.warn("[LOCATE WARN]: Fallback to default stream URL");
    }
  }

  return fetchAndStreamNode(upstreamUrl, req, ext);
}

function fetchAndStreamNode(targetUrl: string, req: Request, ext: string, redirects = 5): Promise<Response> {
  return new Promise((resolve) => {
    if (redirects <= 0) {
      return resolve(new Response("Too many redirects", { status: 502 }));
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;

      const requestHeaders: Record<string, string> = {
        "User-Agent": UA,
        Accept: "*/*",
        Connection: "keep-alive",
      };

      const range = req.headers.get("range");
      if (range) {
        requestHeaders["Range"] = range;
      }

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: requestHeaders,
        rejectUnauthorized: false,
      };

      const proxyReq = client.request(options, (upstreamRes) => {
        // Redirections HTTP 301/302/307
        if (
          upstreamRes.statusCode &&
          [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
          upstreamRes.headers.location
        ) {
          const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
          return resolve(fetchAndStreamNode(nextUrl, req, ext, redirects - 1));
        }

        const respHeaders = new Headers();
        
        // Passthrough des headers vitaux pour le Seeking & HTML5 Video
        const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
        for (const h of passthrough) {
          if (upstreamRes.headers[h]) {
            const val = upstreamRes.headers[h];
            respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
          }
        }

        if (!respHeaders.has("content-type")) {
          respHeaders.set("content-type", ext === "mkv" ? "video/x-matroska" : "video/mp4");
        }

        respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        respHeaders.set("X-Accel-Buffering", "no");
        respHeaders.set("Access-Control-Allow-Origin", "*");

        // Utilisation d'un PassThrough Node.js converti en Web ReadableStream
        const passThroughStream = new PassThrough();
        upstreamRes.pipe(passThroughStream);

        const webStream = new ReadableStream({
          start(controller) {
            passThroughStream.on("data", (chunk) => {
              try {
                controller.enqueue(chunk);
              } catch {}
            });
            passThroughStream.on("end", () => {
              try {
                controller.close();
              } catch {}
            });
            passThroughStream.on("error", (err) => {
              try {
                controller.error(err);
              } catch {}
            });
          },
          cancel() {
            upstreamRes.destroy();
            passThroughStream.destroy();
          },
        });

        resolve(
          new Response(webStream, {
            status: upstreamRes.statusCode || 200,
            headers: respHeaders,
          })
        );
      });

      proxyReq.on("error", (err) => {
        console.error("[STREAM PROXY ERROR]:", err.message);
        resolve(new Response(`Stream proxy failed: ${err.message}`, { status: 502 }));
      });

      if (req.signal) {
        req.signal.addEventListener("abort", () => {
          proxyReq.destroy();
        });
      }

      proxyReq.end();
    } catch (err: any) {
      console.error("[STREAM FATAL ERROR]:", err?.message);
      resolve(new Response("Internal Proxy Error", { status: 500 }));
    }
  });
}

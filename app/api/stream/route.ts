import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

const httpAgent = new http.Agent({ keepAlive: true, timeout: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, timeout: 10000 });

export async function GET(req: Request) {
  try {
    await requireSession();
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

  const creds = await requireSession();
  const upstreamUrl = buildStreamUrl(creds, type, id, ext);

  return fetchAndStream(upstreamUrl, req);
}

function fetchAndStream(targetUrl: string, req: Request, redirects = 5): Promise<Response> {
  return new Promise((resolve) => {
    if (redirects <= 0) {
      return resolve(new Response("Too many redirects", { status: 502 }));
    }

    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      "User-Agent": UA,
      Accept: "*/*",
      Connection: "close",
    };

    const range = req.headers.get("range");
    if (range) requestHeaders["Range"] = range;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: requestHeaders,
      agent: isHttps ? httpsAgent : httpAgent,
    };

    const proxyReq = client.request(options, (upstreamRes) => {
      // Suivi de la redirection HTTP -> HTTP/HTTPS transparente côté serveur
      if (
        upstreamRes.statusCode &&
        [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
        upstreamRes.headers.location
      ) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return resolve(fetchAndStream(nextUrl, req, redirects - 1));
      }

      const respHeaders = new Headers();
      respHeaders.set("Content-Type", targetUrl.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t");
      respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      respHeaders.set("X-Accel-Buffering", "no");
      respHeaders.set("Access-Control-Allow-Origin", "*");

      const nodeStream = new ReadableStream({
        start(controller) {
          upstreamRes.on("data", (chunk) => {
            try {
              controller.enqueue(chunk);
            } catch {}
          });
          upstreamRes.on("end", () => {
            try {
              controller.close();
            } catch {}
          });
          upstreamRes.on("error", () => {
            try {
              controller.close();
            } catch {}
          });
        },
        cancel() {
          upstreamRes.destroy();
        },
      });

      resolve(
        new Response(nodeStream, {
          status: 200,
          headers: respHeaders,
        })
      );
    });

    proxyReq.on("error", (err) => {
      console.error("[STREAM ERROR]:", err.message);
      resolve(new Response(`Stream fetch failed: ${err.message}`, { status: 502 }));
    });

    if (req.signal) {
      req.signal.addEventListener("abort", () => {
        proxyReq.destroy();
      });
    }

    proxyReq.end();
  });
}

import { requireSession } from "@/lib/session";
import { getUrl } from "@/lib/hls/registry";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

// Agents HTTP/HTTPS avec gestion de timeout et contournement des erreurs TLS
const httpAgent = new http.Agent({ keepAlive: true, timeout: 15000 });
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, timeout: 15000 });

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const token = new URL(req.url).searchParams.get("t");
  const target = token ? getUrl(token) : null;
  if (!target) return new Response("Bad segment request", { status: 400 });

  return fetchSegmentWithRedirects(target, req);
}

function fetchSegmentWithRedirects(targetUrl: string, req: Request, maxRedirects = 5): Promise<Response> {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) {
      return resolve(new Response("Too many redirects from upstream", { status: 502 }));
    }

    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      "User-Agent": UA,
      Accept: "*/*",
      Connection: "keep-alive",
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
      // Suivi automatique des redirections 301, 302, 307
      if (
        upstreamRes.statusCode &&
        [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
        upstreamRes.headers.location
      ) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return resolve(fetchSegmentWithRedirects(nextUrl, req, maxRedirects - 1));
      }

      if (
        upstreamRes.statusCode &&
        upstreamRes.statusCode !== 200 &&
        upstreamRes.statusCode !== 206
      ) {
        return resolve(
          new Response(`Segment upstream returned ${upstreamRes.statusCode}`, {
            status: upstreamRes.statusCode,
          })
        );
      }

      const respHeaders = new Headers();
      const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
      for (const h of passthrough) {
        if (upstreamRes.headers[h]) {
          const val = upstreamRes.headers[h];
          respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
        }
      }

      if (!respHeaders.has("content-type")) {
        respHeaders.set("content-type", "video/mp2t");
      }

      respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      respHeaders.set("X-Accel-Buffering", "no");

      // Transposition du flux Node.js en ReadableStream natif
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
          upstreamRes.on("error", (err) => {
            try {
              controller.error(err);
            } catch {}
          });
        },
        cancel() {
          upstreamRes.destroy();
        },
      });

      resolve(
        new Response(nodeStream, {
          status: upstreamRes.statusCode || 200,
          headers: respHeaders,
        })
      );
    });

    proxyReq.on("error", (err) => {
      console.error("[HLSSEG PROXY ERROR]:", err.message);
      resolve(new Response(`Segment fetch failed: ${err.message}`, { status: 502 }));
    });

    if (req.signal) {
      req.signal.addEventListener("abort", () => {
        proxyReq.destroy();
      });
    }

    proxyReq.end();
  });
}

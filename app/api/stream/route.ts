import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";

const httpAgent = new http.Agent({ keepAlive: true, timeout: 15000 });
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, timeout: 15000 });

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

  return new Promise<Response>((resolve) => {
    const parsedUrl = new URL(upstreamUrl);
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

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      headers: requestHeaders,
      agent: isHttps ? httpsAgent : httpAgent,
    };

    const proxyReq = client.request(options, (upstreamRes) => {
      const respHeaders = new Headers();

      const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
      for (const h of passthrough) {
        if (upstreamRes.headers[h]) {
          const val = upstreamRes.headers[h];
          respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
        }
      }

      if (!respHeaders.has("content-type")) {
        respHeaders.set("content-type", type === "live" ? "video/mp2t" : "video/mp4");
      }

      respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      respHeaders.set("X-Accel-Buffering", "no");

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
      console.error(`[STREAM PROXY ERROR] ${type}/${id}:`, err.message);
      resolve(new Response(`Stream proxy failed: ${err.message}`, { status: 502 }));
    });

    if (req.signal) {
      req.signal.addEventListener("abort", () => {
        proxyReq.destroy();
      });
    }

    proxyReq.end();
  });
}

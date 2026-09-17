import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
import type { StreamKind } from "@/lib/xtream/types";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// En-têtes identiques à un vrai décodeur / VLC Player pour passer les filtres IP
const HEADERS_OVERRIDE = {
  "User-Agent": "IPTVSmartersPlayer",
  "Accept": "*/*",
  "Connection": "close",
};

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

  return new Promise<Response>((resolve) => {
    fetchWithSocketBypass(upstreamUrl, req, resolve);
  });
}

function fetchWithSocketBypass(targetUrl: string, req: Request, resolve: (res: Response) => void, redirects = 5) {
  if (redirects <= 0) {
    return resolve(new Response("Too many redirects", { status: 502 }));
  }

  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === "https:";
  const client = isHttps ? https : http;

  const requestHeaders: Record<string, string> = {
    ...HEADERS_OVERRIDE,
    Host: parsed.host,
  };

  const range = req.headers.get("range");
  if (range) requestHeaders["Range"] = range;

  const proxyReq = client.request(
    {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: requestHeaders,
      rejectUnauthorized: false,
    },
    (upstreamRes) => {
      // Suivi manuel des redirections 302 pour éviter le socket hang up
      if (
        upstreamRes.statusCode &&
        [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
        upstreamRes.headers.location
      ) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return fetchWithSocketBypass(nextUrl, req, resolve, redirects - 1);
      }

      const respHeaders = new Headers();
      respHeaders.set("Content-Type", typeContentType(targetUrl));
      respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      respHeaders.set("X-Accel-Buffering", "no");

      const nodeStream = new ReadableStream({
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
        new Response(nodeStream, {
          status: 200,
          headers: respHeaders,
        })
      );
    }
  );

  proxyReq.on("error", (err) => {
    console.error(`[STREAM PROXY ERROR]: ${err.message}`);
    resolve(new Response(`Socket connection rejected by IPTV server`, { status: 502 }));
  });

  proxyReq.end();
}

function typeContentType(url: string): string {
  if (url.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  return "video/mp2t";
}

import { requireSession } from "@/lib/session";
import { buildStreamUrl } from "@/lib/xtream/urls";
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

  if (!type || !id) return new Response("Bad request", { status: 400 });

  const creds = await requireSession();
  if (type === "live") ext = "ts";
  else if (ext.toLowerCase() === "mkv") ext = "mp4";

  const targetUrl = buildStreamUrl(creds, type, id, ext);

  return fetchWithRedirects(targetUrl, req);
}

function fetchWithRedirects(targetUrl: string, req: Request, redirects = 5): Promise<Response> {
  return new Promise((resolve) => {
    if (redirects <= 0) {
      return resolve(new Response("Too many redirects or dead upstream domain", { status: 502 }));
    }

    try {
      const parsed = new URL(targetUrl);
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
        // Redirection 301/302 vers le serveur média réel du fournisseur
        if (
          upstreamRes.statusCode &&
          [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
          upstreamRes.headers.location
        ) {
          const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
          return resolve(fetchWithRedirects(nextUrl, req, redirects - 1));
        }

        const respHeaders = new Headers();
        const passthrough = ["content-type", "content-length", "content-range", "accept-ranges"];
        passthrough.forEach((h) => {
          if (upstreamRes.headers[h]) {
            const val = upstreamRes.headers[h];
            respHeaders.set(h, Array.isArray(val) ? val.join(", ") : val);
          }
        });

        respHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        respHeaders.set("Access-Control-Allow-Origin", "*");
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
        // Capture l'erreur DNS ERR_NAME_NOT_RESOLVED sans crasher l'app
        console.error("[STREAM DNS ERROR]:", err.message);
        resolve(new Response(`Stream domain unreachable (${err.message})`, { status: 502 }));
      });

      proxyReq.end();
    } catch {
      resolve(new Response("Internal Proxy Error", { status: 500 }));
    }
  });
}

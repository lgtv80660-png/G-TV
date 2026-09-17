import { requireSession } from "@/lib/session";
import http from "http";
import https from "https";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const httpAgent = new http.Agent({ keepAlive: true, timeout: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, timeout: 10000 });

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) return new Response("Missing image URL", { status: 400 });

  return new Promise<Response>((resolve) => {
    try {
      const parsed = new URL(imageUrl);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "image/*,*/*;q=0.8",
        },
        agent: isHttps ? httpsAgent : httpAgent,
      };

      const proxyReq = client.request(options, (upstreamRes) => {
        if (
          upstreamRes.statusCode &&
          [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
          upstreamRes.headers.location
        ) {
          const nextUrl = new URL(upstreamRes.headers.location, imageUrl).toString();
          return resolve(fetch(nextUrl));
        }

        const respHeaders = new Headers();
        respHeaders.set("Content-Type", upstreamRes.headers["content-type"] || "image/jpeg");
        respHeaders.set("Cache-Control", "public, max-age=86400");

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
      });

      proxyReq.on("error", () => {
        resolve(new Response(null, { status: 404 }));
      });

      proxyReq.end();
    } catch {
      resolve(new Response(null, { status: 400 }));
    }
  });
}

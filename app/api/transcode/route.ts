import { requireSession } from "@/lib/session";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * On Cloudflare Edge environment, FFmpeg binary is unavailable.
 * Redirects directly to source stream instead of crashing the server.
 */
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
  const ext = searchParams.get("ext") || "mkv";

  if (!type || !id) return new Response("Bad request", { status: 400 });

  const located = await locatePlayable(creds, type, id, ext);
  if (!located) {
    return new Response("Title unavailable from provider", { status: 404 });
  }

  // Redirection directe vers l'URL du flux au lieu de transcoder
  return Response.redirect(located.url, 307);
}

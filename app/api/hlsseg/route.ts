import { requireSession } from "@/lib/session";

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
  const segUrl = searchParams.get("url");

  if (!segUrl) return new Response("Missing segment URL", { status: 400 });

  try {
    const upstreamRes = await fetch(segUrl, {
      headers: { "User-Agent": UA, Accept: "*/*" },
    });

    if (!upstreamRes.ok) {
      return new Response("Segment not found", { status: upstreamRes.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", "video/mp2t");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return new Response(`Segment Fetch Error: ${err.message}`, { status: 502 });
  }
}

import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SVG transparent de fallback (évite d'exposer l'URL du fournisseur si l'image 404/500)
const BLANK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`;

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new Response(BLANK_SVG, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) throw new Error("Image fetch failed");

    const blob = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    // Si l'image échoue, on renvoie le SVG neutre sans jamais fuiter l'URL brute
    return new Response(BLANK_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}

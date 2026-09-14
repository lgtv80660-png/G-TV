import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ photoUrl: null });
  }

  try {
    // 1. Recherche de la photo de l'acteur via l'API publique et gratuite de Wikipedia (sans clé API)
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        name
      )}&prop=pageimages&format=json&pithumbsize=200&origin=*`,
      { next: { revalidate: 86400 } }
    );
    const wikiData = await wikiRes.json();
    const pages = wikiData?.query?.pages;

    if (pages) {
      const pageId = Object.keys(pages)[0];
      const thumbnail = pages[pageId]?.thumbnail?.source;
      if (thumbnail) {
        return NextResponse.json({ photoUrl: thumbnail });
      }
    }
  } catch (err) {
    console.error("Wikipedia photo fetch error:", err);
  }

  // 2. Fallback direct avec avatar stylisé basé sur le nom de l'acteur si pas de photo disponible
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=4f46e5&color=fff&size=128&bold=true`;

  return NextResponse.json({ photoUrl: avatarUrl });
}

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ photoUrl: null, bio: null });
  }

  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        name
      )}&prop=pageimages|extracts&pithumbsize=400&exintro=1&explaintext=1&exchars=150&format=json&origin=*`,
      { next: { revalidate: 86400 } }
    );
    const wikiData = await wikiRes.json();
    const pages = wikiData?.query?.pages;

    if (pages) {
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      const thumbnail = page?.thumbnail?.source || null;
      const bio = page?.extract || "Aucune biographie disponible.";

      return NextResponse.json({
        photoUrl: thumbnail,
        bio: bio,
      });
    }
  } catch (err) {
    console.error("Wikipedia fetch error:", err);
  }

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=4f46e5&color=fff&size=256&bold=true`;

  return NextResponse.json({
    photoUrl: avatarUrl,
    bio: "Acteur de cinéma.",
  });
}

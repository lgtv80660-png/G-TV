import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name");

  if (!rawName) {
    return NextResponse.json({ photoUrl: null, bio: null });
  }

  // Nettoyage du nom de l'acteur (retrait des espaces superflus et caractères spéciaux)
  const name = rawName.trim();

  try {
    // 1. Recherche prioritaire sur l'API publique TMDB (très complète pour le cinéma)
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=15d260044e2614e361e09315def00661&query=${encodeURIComponent(
        name
      )}`,
      { next: { revalidate: 86400 } }
    );
    const tmdbData = await tmdbRes.json();
    const person = tmdbData?.results?.[0];

    if (person?.profile_path) {
      return NextResponse.json({
        photoUrl: `https://image.tmdb.org/t/p/w300${person.profile_path}`,
        bio: person.known_for_department
          ? `Connu pour : ${person.known_for_department}`
          : "Acteur de cinéma.",
      });
    }

    // 2. Recherche secondaire sur Wikipédia si absent de TMDB
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
      if (pageId !== "-1") {
        const thumbnail = page?.thumbnail?.source || null;
        const bio = page?.extract || "Aucune biographie disponible.";

        if (thumbnail) {
          return NextResponse.json({
            photoUrl: thumbnail,
            bio: bio,
          });
        }
      }
    }
  } catch (err) {
    console.error("Fetch actor error:", err);
  }

  // 3. Fallback stylisé garanti si l'acteur n'a aucune photo officielle en ligne
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=312e81&color=fff&size=256&bold=true`;

  return NextResponse.json({
    photoUrl: avatarUrl,
    bio: "Biographie non disponible.",
  });
}

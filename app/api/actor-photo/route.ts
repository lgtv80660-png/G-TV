import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name");

  if (!rawName) {
    return NextResponse.json({ photoUrl: null, bio: null });
  }

  if (!TMDB_API_KEY) {
    console.error("Erreur : TMDB_API_KEY non configurée dans .env.local");
  }

  const name = rawName.trim();

  try {
    // 1. Recherche de l'acteur sur TMDB via la variable d'environnement
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        name
      )}&language=fr-FR`,
      { next: { revalidate: 86400 } }
    );
    const searchData = await searchRes.json();
    const person = searchData?.results?.[0];

    if (person) {
      const photoUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
        : null;

      let bio = person.known_for_department
        ? `Acteur principal / ${person.known_for_department}`
        : "Acteur de cinéma.";

      try {
        const detailsRes = await fetch(
          `https://api.themoviedb.org/3/person/${person.id}?api_key=${TMDB_API_KEY}&language=fr-FR`,
          { next: { revalidate: 86400 } }
        );
        const detailsData = await detailsRes.json();
        if (detailsData?.biography && detailsData.biography.trim().length > 0) {
          bio = detailsData.biography;
        }
      } catch (e) {}

      if (photoUrl) {
        return NextResponse.json({ photoUrl, bio });
      }
    }
  } catch (err) {
    console.error("Erreur extraction TMDB:", err);
  }

  // Fallback avec initiales si absent
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

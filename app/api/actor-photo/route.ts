import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "7b311a6f43090b24f188272bcc0655b3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name");

  if (!rawName) {
    return NextResponse.json({ photoUrl: null, bio: null });
  }

  const name = rawName.trim();

  try {
    // 1. Recherche de l'acteur sur TMDB avec ta clé d'API
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        name
      )}&language=fr-FR`,
      { next: { revalidate: 86400 } } // Cache 24h
    );
    const searchData = await searchRes.json();
    const person = searchData?.results?.[0];

    if (person) {
      const photoUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
        : null;

      // 2. Récupération des détails complets (biographie en français)
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
      } catch (e) {
        // En cas d'absence de bio détaillée, on conserve la fallback
      }

      if (photoUrl) {
        return NextResponse.json({ photoUrl, bio });
      }
    }
  } catch (err) {
    console.error("Erreur d'extraction TMDB:", err);
  }

  // 3. Fallback avec avatar stylisé si l'acteur n'a pas de profil sur TMDB
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

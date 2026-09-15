import { NextRequest, NextResponse } from "next/server";

// Clé TMDB passée en fallback direct au cas où la variable d'environnement n'est pas injectée par Edge
const HARDCODED_TMDB_KEY = "7b311a6f43090b24f188272bcc0655b3";
const TMDB_API_KEY = process.env.TMDB_API_KEY || HARDCODED_TMDB_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const rawShowName = searchParams.get("show");
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  // Nettoyage du nom de la série pour TMDB (supprime les "- S01E01", les années, etc.)
  const cleanShowName = rawShowName
    ? rawShowName.split(" - ")[0].replace(/\(\d{4}\)/g, "").trim()
    : "";

  try {
    let targetTmdbId = tmdbId;

    // 1. Recherche par nom nettoyé si tmdbId absent ou invalide
    if (!targetTmdbId && cleanShowName) {
      const searchRes = await fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanShowName)}&language=fr-FR`
      );
      const searchData = await searchRes.json();
      targetTmdbId = searchData?.results?.[0]?.id;
    }

    if (!targetTmdbId) {
      return NextResponse.json({ imageUrl: null });
    }

    // 2. Récupération de l'image de l'épisode sur TMDB
    const epRes = await fetch(
      `${TMDB_BASE_URL}/tv/${targetTmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}&language=fr-FR`
    );

    if (!epRes.ok) return NextResponse.json({ imageUrl: null });

    const epData = await epRes.json();
    const stillPath = epData?.still_path;

    const imageUrl = stillPath ? `https://image.tmdb.org/t/p/w500${stillPath}` : null;
    return NextResponse.json({ imageUrl });
  } catch (error) {
    return NextResponse.json({ imageUrl: null });
  }
}

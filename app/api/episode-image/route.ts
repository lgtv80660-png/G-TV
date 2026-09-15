import { NextRequest, NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const rawShowName = searchParams.get("show");
  const rawSeason = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  // Extraction stricte du numéro de saison (ex: "Saison 1" -> "1")
  const season = rawSeason.replace(/\D/g, "") || "1";

  if (!TMDB_API_KEY) {
    return NextResponse.json({ imageUrl: null, error: "Missing API Key" });
  }

  // Nettoyage de la chaîne de titre (ex: "City on a Hill (2019)" -> "City on a Hill")
  const cleanShowName = rawShowName
    ? rawShowName.split("-")[0].replace(/\(\d{4}\)/g, "").trim()
    : "";

  try {
    let targetTmdbId = tmdbId && tmdbId !== "undefined" && tmdbId !== "null" ? tmdbId : null;

    // Recherche de la série sur TMDB si l'ID n'est pas fourni
    if (!targetTmdbId && cleanShowName) {
      const searchRes = await fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanShowName)}&language=fr-FR`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        targetTmdbId = searchData?.results?.[0]?.id;
      }
    }

    if (!targetTmdbId) {
      return NextResponse.json({ imageUrl: null });
    }

    // Récupération de l'épisode TMDB
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

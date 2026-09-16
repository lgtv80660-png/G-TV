import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const year = searchParams.get("year");
  let tmdbId = searchParams.get("tmdbId");
  const lang = searchParams.get("lang") || "fr";

  if (!title && !tmdbId) {
    return NextResponse.json({ error: "Missing title or tmdbId" }, { status: 400 });
  }

  try {
    // 1. Si on n'a pas l'ID TMDB, on recherche le film
    if (!tmdbId && title) {
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          title
        )}&year=${year || ""}&language=${lang}`
      );
      const searchData = await searchRes.json();
      if (searchData?.results?.[0]?.id) {
        tmdbId = searchData.results[0].id;
      }
    }

    if (!tmdbId) {
      return NextResponse.json({ key: null });
    }

    // 2. Récupération des vidéos TMDB
    const videosRes = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=${lang}`
    );
    const videosData = await videosRes.json();

    let trailer = videosData?.results?.find(
      (v: any) => v.site === "YouTube" && v.type === "Trailer"
    );

    // Fallback en anglais si aucune bande-annonce n'est trouvée dans la langue demandée
    if (!trailer) {
      const fallbackRes = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`
      );
      const fallbackData = await fallbackRes.json();
      trailer = fallbackData?.results?.find(
        (v: any) => v.site === "YouTube" && v.type === "Trailer"
      );
    }

    return NextResponse.json({ key: trailer?.key || null });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch trailer" }, { status: 500 });
  }
}

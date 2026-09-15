import { NextRequest, NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const showName = searchParams.get("show");
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  try {
    let targetTmdbId = tmdbId;

    if (!targetTmdbId && showName) {
      const searchRes = await fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(showName)}&language=fr-FR`
      );
      const searchData = await searchRes.json();
      targetTmdbId = searchData?.results?.[0]?.id;
    }

    if (!targetTmdbId) {
      return NextResponse.json({ imageUrl: null });
    }

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

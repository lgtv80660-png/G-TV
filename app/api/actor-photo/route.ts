import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ photoUrl: null });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=15d260044e2614e361e09315def00661&query=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } } // Cache 24h
    );

    const data = await res.json();
    const profilePath = data?.results?.[0]?.profile_path;

    if (profilePath) {
      return NextResponse.json({
        photoUrl: `https://image.tmdb.org/t/p/w185${profilePath}`,
      });
    }
  } catch (err) {
    console.error("Actor photo fetch error:", err);
  }

  return NextResponse.json({ photoUrl: null });
}
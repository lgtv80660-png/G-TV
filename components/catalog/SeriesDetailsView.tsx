import { NextRequest, NextResponse } from "next/server";
import { tmdb, tmdbEnabled } from "@/lib/tmdb/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!tmdbEnabled()) {
      return NextResponse.json(
        { error: "TMDB n'est pas configuré" },
        { status: 500 }
      );
    }

    const seriesId = params.id;

    // Récupération de la série avec le détail des saisons via TMDB
    const data = await tmdb<any>(`tv/${seriesId}`, { language: "fr-FR" });

    const formattedData = {
      id: data.id,
      title: data.name,
      overview: data.overview,
      mainPoster: data.poster_path, // Poster global de la série
      seasons: (data.seasons || []).map((season: any) => ({
        seasonNumber: season.season_number,
        name: season.name,
        posterPath: season.poster_path, // Poster spécifique de la saison !
        episodeCount: season.episode_count,
      })),
    };

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération TMDB" },
      { status: 500 }
    );
  }
}

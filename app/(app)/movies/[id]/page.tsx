import { MovieDetailClient } from "./MovieDetailClient";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let movieId = "";
  try {
    const resolvedParams = await params;
    movieId = resolvedParams?.id || "";
  } catch (err) {
    console.error("Erreur résolution params:", err);
  }

  if (!movieId) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#0b0c10] text-white">
        <p className="text-red-400 font-semibold">Identifiant du film introuvable.</p>
      </div>
    );
  }

  return <MovieDetailClient movieId={movieId} />;
}

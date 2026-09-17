import { MovieDetailClient } from "./MovieDetailClient";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <MovieDetailClient movieId={resolvedParams.id} />;
}

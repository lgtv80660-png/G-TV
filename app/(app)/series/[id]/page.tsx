function EpisodeImage({
  ep,
  seriesTitle,
  tmdbId,
  seasonKey,
  fallbackCover,
}: {
  ep: any;
  seriesTitle: string;
  tmdbId?: string | number;
  seasonKey: string;
  fallbackCover?: string;
}) {
  // 1. Priorité 1: Vignette Xtream si elle existe.
  // 2. Priorité 2: Affiche de la série (fallback immédiat pour éviter le rectangle gris "CO").
  const [imgSrc, setImgSrc] = useState<string | null>(ep.info?.movie_image || fallbackCover || null);

  useEffect(() => {
    // Si Xtream a déjà fourni l'image de l'épisode, inutile d'appeler l'API
    if (ep.info?.movie_image) return;

    let isMounted = true;
    const cleanSeason = seasonKey.replace(/\D/g, "") || "1";

    fetch(
      `/api/episode-image?tmdbId=${tmdbId || ""}&show=${encodeURIComponent(seriesTitle)}&season=${cleanSeason}&episode=${ep.episode_num}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.imageUrl) {
          setImgSrc(data.imageUrl);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [ep, seriesTitle, tmdbId, seasonKey]);

  return (
    <SmartImage
      src={imgSrc || fallbackCover}
      alt={ep.title || "Episode"}
      rounded="rounded-lg"
      className="h-full w-full object-cover"
    />
  );
}

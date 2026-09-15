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
  const [imgSrc, setImgSrc] = useState<string | null>(ep.info?.movie_image || null);

  useEffect(() => {
    // Si Xtream fournit une vraie image d'épisode, on la prend
    if (ep.info?.movie_image) {
      setImgSrc(ep.info.movie_image);
      return;
    }

    let isMounted = true;
    const cleanSeason = seasonKey.replace(/\D/g, "") || "1";

    // 1. Nettoyage poussé du titre de la série pour la recherche TMDB
    let cleanTitle = seriesTitle || "";
    // Enlève tout ce qui suit un point ou tiret avec S01E01, VOSTFR, 720p, etc.
    cleanTitle = cleanTitle
      .replace(/\./g, " ")
      .replace(/S\d+E\d+.*/i, "")
      .replace(/(VOSTFR|FRENCH|720p|1080p|2160p|WEB-DL|WEBRip|x264|x265|AMZN|NF|-FANATIK|-EXTREME).*/i, "")
      .replace(/\(\d{4}\)/g, "")
      .trim();

    fetch(
      `/api/tmdb?type=episode&id=${tmdbId || ""}&query=${encodeURIComponent(cleanTitle)}&season=${cleanSeason}&episode=${ep.episode_num}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.still_path) {
          setImgSrc(`https://image.tmdb.org/t/p/w500${data.still_path}`);
        } else if (data?.imageUrl) {
          setImgSrc(data.imageUrl);
        } else if (data?.image) {
          setImgSrc(data.image);
        } else {
          // Si TMDB ne trouve rien, on bascule sur la couverture de la série
          setImgSrc(fallbackCover || null);
        }
      })
      .catch(() => {
        if (isMounted) setImgSrc(fallbackCover || null);
      });

    return () => {
      isMounted = false;
    };
  }, [ep, seriesTitle, tmdbId, seasonKey, fallbackCover]);

  // Si imgSrc est nul ou échoue, afficher directement l'image de secours (fallbackCover)
  const finalSrc = imgSrc || fallbackCover;

  if (!finalSrc) {
    return <div className="h-full w-full bg-ink-900 rounded-lg" />;
  }

  return (
    <SmartImage
      src={finalSrc}
      alt={ep.title || "Episode"}
      rounded="rounded-lg"
      className="h-full w-full object-cover"
    />
  );
}

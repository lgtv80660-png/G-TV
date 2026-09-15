export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export const api = {
  // Récupération des détails d'une série avec support universel de series_id
  seriesInfo: async (id: string) => {
    const res = await fetch(
      `/api/xtream?action=get_series_info&series_id=${id}&id=${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch series info: ${res.statusText}`);
    }
    return res.json();
  },

  // Récupération de la liste des séries
  getSeries: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/xtream?action=get_series&category_id=${categoryId}`
      : `/api/xtream?action=get_series`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch series");
    return res.json();
  },

  // Récupération des catégories de séries
  getSeriesCategories: async () => {
    const res = await fetch(`/api/xtream?action=get_series_categories`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch series categories");
    return res.json();
  },
};

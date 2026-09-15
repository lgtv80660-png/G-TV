export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export const api = {
  // --- Live TV ---
  liveCategories: async () => {
    const res = await fetch("/api/xtream?action=get_live_categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch live categories");
    return res.json();
  },

  liveStreams: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/xtream?action=get_live_streams&category_id=${categoryId}`
      : `/api/xtream?action=get_live_streams`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch live streams");
    return res.json();
  },

  // --- VOD / Films ---
  vodCategories: async () => {
    const res = await fetch("/api/xtream?action=get_vod_categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch VOD categories");
    return res.json();
  },

  vodStreams: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/xtream?action=get_vod_streams&category_id=${categoryId}`
      : `/api/xtream?action=get_vod_streams`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch VOD streams");
    return res.json();
  },

  vodInfo: async (id: string) => {
    const res = await fetch(`/api/xtream?action=get_vod_info&vod_id=${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch VOD info");
    return res.json();
  },

  // --- Séries ---
  getSeriesCategories: async () => {
    const res = await fetch("/api/xtream?action=get_series_categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch series categories");
    return res.json();
  },

  // Alias compatible pour hooks.ts
  seriesCategories: async () => {
    const res = await fetch("/api/xtream?action=get_series_categories", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch series categories");
    return res.json();
  },

  getSeries: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/xtream?action=get_series&category_id=${categoryId}`
      : `/api/xtream?action=get_series`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch series");
    return res.json();
  },

  // Alias compatible pour hooks.ts
  series: async (categoryId?: string) => {
    const url = categoryId
      ? `/api/xtream?action=get_series&category_id=${categoryId}`
      : `/api/xtream?action=get_series`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch series");
    return res.json();
  },

  seriesInfo: async (id: string) => {
    const res = await fetch(
      `/api/xtream?action=get_series_info&series_id=${id}&id=${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Failed to fetch series info");
    return res.json();
  },

  // --- EPG ---
  epg: async (streamId: string) => {
    const res = await fetch(`/api/xtream?action=get_short_epg&stream_id=${streamId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch EPG");
    return res.json();
  },
};

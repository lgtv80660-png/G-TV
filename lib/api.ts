export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export const api = {
  // Live TV
  liveCategories: () => fetch("/api/xtream?action=get_live_categories").then((r) => r.json()),
  liveStreams: (catId?: string) =>
    fetch(`/api/xtream?action=get_live_streams${catId ? `&category_id=${catId}` : ""}`).then((r) => r.json()),

  // VOD / Films
  vodCategories: () => fetch("/api/xtream?action=get_vod_categories").then((r) => r.json()),
  vodStreams: (catId?: string) =>
    fetch(`/api/xtream?action=get_vod_streams${catId ? `&category_id=${catId}` : ""}`).then((r) => r.json()),
  vodInfo: (id: string) => fetch(`/api/xtream?action=get_vod_info&vod_id=${id}`).then((r) => r.json()),

  // Séries
  getSeriesCategories: () => fetch("/api/xtream?action=get_series_categories").then((r) => r.json()),
  seriesCategories: () => fetch("/api/xtream?action=get_series_categories").then((r) => r.json()),
  getSeries: (catId?: string) =>
    fetch(`/api/xtream?action=get_series${catId ? `&category_id=${catId}` : ""}`).then((r) => r.json()),
  series: (catId?: string) =>
    fetch(`/api/xtream?action=get_series${catId ? `&category_id=${catId}` : ""}`).then((r) => r.json()),
  seriesInfo: (id: string) =>
    fetch(`/api/xtream?action=get_series_info&series_id=${id}&id=${id}`).then((r) => r.json()),

  // EPG
  epg: (streamId: string | number) =>
    fetch(`/api/xtream?action=get_short_epg&stream_id=${streamId}`).then((r) => r.json()),
};

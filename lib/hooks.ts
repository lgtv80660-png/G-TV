import { useState, useEffect } from "react";
import { api } from "./api";

export function useLiveCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .liveCategories()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useLiveStreams(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .liveStreams(categoryId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading };
}

export function useVodCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .vodCategories()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useVodStreams(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .vodStreams(categoryId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading };
}

export function useVodInfo(id?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .vodInfo(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading };
}

export function useSeriesCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSeriesCategories()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useSeries(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getSeries(categoryId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading };
}

// Alias pour compatibilité avec app/series/page.tsx
export const useSeriesList = useSeries;

export function useEPG(streamId?: string | number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamId) return;
    setLoading(true);
    api
      .epg(String(streamId))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [streamId]);

  return { data, loading };
}

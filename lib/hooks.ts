import { useState, useEffect } from "react";
import { api } from "./api";

export function useLiveCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .liveCategories()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, isLoading: loading, isError, error };
}

export function useLiveStreams(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .liveStreams(categoryId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading, isLoading: loading, isError, error };
}

export function useVodCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .vodCategories()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, isLoading: loading, isError, error };
}

export function useVodStreams(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .vodStreams(categoryId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading, isLoading: loading, isError, error };
}

export function useVodInfo(id?: string | number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIsError(false);
    api
      .vodInfo(id)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, isLoading: loading, isError, error };
}

export function useSeriesCategories() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .seriesCategories()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, isLoading: loading, isError, error };
}

export function useSeries(categoryId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setIsError(false);
    api
      .series(categoryId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  return { data, loading, isLoading: loading, isError, error };
}

export const useSeriesList = useSeries;

export function useSeriesInfo(id?: string | number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIsError(false);
    api
      .seriesInfo(id)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, isLoading: loading, isError, error };
}

export function useEPG(streamId?: string | number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!streamId) return;
    setLoading(true);
    setIsError(false);
    api
      .epg(streamId)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setIsError(true);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [streamId]);

  return { data, loading, isLoading: loading, isError, error };
}

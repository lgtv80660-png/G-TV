import { NextResponse } from "next/server";
import { dispatch, XtreamError } from "@/lib/xtream/client";
import { requireSession } from "@/lib/session";
import { cachedWithValidation } from "@/lib/xtream/cache";

export const runtime = "nodejs";

const HOUR = 60 * 60 * 1000;
const TTL: Record<string, number> = {
  get_vod_streams: 3 * HOUR,
  get_series: 3 * HOUR,
  get_live_streams: 2 * HOUR,
  get_vod_categories: 12 * HOUR,
  get_series_categories: 12 * HOUR,
  get_live_categories: 12 * HOUR,
  get_vod_info: 6 * HOUR,
  get_series_info: 6 * HOUR,
};

export async function GET(req: Request) {
  let creds;
  try {
    creds = await requireSession();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  const params: Record<string, string | undefined> = {};
  for (const [k, v] of searchParams.entries()) {
    if (k !== "action" && k !== "nocache") params[k] = v;
  }

  // 1. Normalisation universelle de series_id pour get_series_info
  if (action === "get_series_info") {
    const seriesId = params.series_id || params.id;
    if (seriesId) {
      params.series_id = seriesId;
    }
  }

  const noCache = searchParams.get("nocache") === "1";

  try {
    const ttl = TTL[action] ?? 60 * 1000;
    
    // Trier les clés de params pour garantir une clé de cache déterministe
    const sortedParams = Object.keys(params).sort().reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {} as Record<string, string | undefined>);

    const key = `${creds.username}|${action}|${JSON.stringify(sortedParams)}`;

    // 2. Si nocache=1 est passé, exécute directement sans lire/écrire le cache
    if (noCache) {
      const data = await dispatch(creds, action, params);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // 3. Récupération de l'empreinte serveur (Fast Check léger) pour valider l'état du cache
    let serverHash = `${creds.username}_${creds.password}`;
    try {
      // Vérification rapide de l'état du compte (user_info)
      const userState = await dispatch(creds, "user_info", {});
      if (userState?.user_info) {
        serverHash = `${creds.username}_${userState.user_info.status}_${userState.user_info.exp_date}_${userState.user_info.active_cons}`;
      }
    } catch {
      // En cas d'échec du check léger, on continue avec le hash de fallback
    }

    // 4. Utilisation du cache intelligent avec validation par hash
    const data = await cachedWithValidation(key, serverHash, ttl, async () => {
      const result = await dispatch(creds, action, params);
      
      // Sécurité : Ne pas mettre en cache si le résultat est nul ou vide
      if (!result || (typeof result === "object" && Object.keys(result).length === 0)) {
        throw new Error("Empty response from upstream provider");
      }
      return result;
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    const status = err instanceof XtreamError && err.status ? err.status : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream error" },
      { status },
    );
  }
}

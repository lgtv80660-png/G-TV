import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { requireSession } from "@/lib/session";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

/**
 * Remuxage FFmpeg à la volée.
 * Copie le flux vidéo (ultra-rapide, sans charge CPU excessive) et convertit l'audio AC-3/EAC-3 en AAC.
 */
export async function GET(req: Request) {
  let creds;
  try {
    creds = await requireSession();
  } catch {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as StreamKind | null;
  const id = searchParams.get("id");
  const ext = searchParams.get("ext") || "mkv";
  const start = Math.max(0, Math.floor(Number(searchParams.get("t") || 0)));

  if (!type || !id) return new Response("Bad request", { status: 400 });

  const located = await locatePlayable(creds, type, id, ext);
  if (!located) {
    console.log(`[TRANSCODE] ${type}/${id} UNAVAILABLE (no playable container)`);
    return new Response("Title unavailable from provider", { status: 404 });
  }
  const input = located.url;

  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-user_agent", UA,
    ...(start > 0 ? ["-ss", String(start)] : []),
    "-i", input,
    "-c:v", "copy", // Conserve la vidéo sans re-encodage
    "-c:a", "aac",  // Force l'audio en AAC pour le navigateur
    "-ac", "2",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  console.log(`[TRANSCODE] ${type}/${id} ext=${ext} t=${start} — remuxing via ffmpeg`);
  const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

  ff.stderr.on("data", (d) => {
    const s = String(d).trim();
    if (s) console.log(`[TRANSCODE] ${type}/${id} ffmpeg: ${s}`);
  });
  ff.on("error", (e) => console.log(`[TRANSCODE] ${type}/${id} spawn error: ${e.message}`));

  const kill = () => {
    if (!ff.killed) ff.kill("SIGKILL");
  };
  req.signal.addEventListener("abort", kill);
  ff.on("close", () => req.signal.removeEventListener("abort", kill));

  const stream = Readable.toWeb(ff.stdout) as unknown as ReadableStream;

  return new Response(stream, {
    headers: {
      "content-type": "video/mp4",
      "cache-control": "no-store",
    },
  });
}

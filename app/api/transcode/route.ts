import { spawn } from "node:child_process";
import { requireSession } from "@/lib/session";
import { locatePlayable } from "@/lib/xtream/locate";
import type { StreamKind } from "@/lib/xtream/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "VLC/3.0.20 LibVLC/3.0.20";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

/**
 * Route de transcodage dynamique via FFmpeg.
 * Copie la piste vidéo sans ré-encodage (très léger en CPU)
 * et convertit l'audio AC-3/EAC-3/DTS en AAC stéréo universel pour navigateur web.
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
    "-c:v", "copy", // Ne touche pas à la vidéo (ultra fluide)
    "-c:a", "aac",  // Force le codec audio AAC compatible HTML5
    "-ac", "2",     // Redimensionne en 2 canaux stéréo
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

  const stream = new ReadableStream({
    start(controller) {
      ff.stdout.on("data", (chunk) => {
        try {
          // Empêche l'erreur si la connexion a été coupée par le client
          if (controller.desiredSize !== null) {
            controller.enqueue(chunk);
          }
        } catch {
          // Annulation silencieuse
        }
      });

      ff.stdout.on("end", () => {
        try {
          controller.close();
        } catch {}
      });

      ff.on("error", (err) => {
        try {
          controller.error(err);
        } catch {}
      });
    },
    cancel() {
      if (!ff.killed) ff.kill("SIGKILL");
    },
  });

  req.signal.addEventListener("abort", () => {
    if (!ff.killed) ff.kill("SIGKILL");
  });

  return new Response(stream, {
    headers: {
      "content-type": "video/mp4",
      "cache-control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OpenNext + Cloudflare Workers environment fallback.
 * FFmpeg is not supported on Cloudflare Edge / Workers runtime.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Server-side FFmpeg transcoding is disabled on Cloudflare Pages." },
    { status: 501 }
  );
}

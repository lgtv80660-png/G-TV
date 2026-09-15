import { NextRequest, NextResponse } from "next/server";
import { cacheClear } from "@/lib/xtream/cache";

// Gestion du Preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "mon_secret_super_securise") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { 
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }

  // Purge le cache RAM Edge/Server
  cacheClear();

  return NextResponse.json(
    {
      revalidated: true,
      message: "Cache Xtream réinitialisé avec succès !",
      timestamp: Date.now(),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

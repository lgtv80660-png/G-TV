import { NextRequest, NextResponse } from "next/server";
import { cacheClear } from "@/lib/xtream/cache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "mon_secret_super_securise") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  cacheClear();

  return NextResponse.json({
    revalidated: true,
    message: "Cache Xtream réinitialisé avec succès !",
    timestamp: Date.now(),
  });
}

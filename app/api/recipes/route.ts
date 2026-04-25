import { NextRequest, NextResponse } from "next/server";
import { listRecipes } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const recipes = await listRecipes(q);
  return NextResponse.json({ recipes });
}

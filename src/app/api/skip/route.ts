import { NextRequest, NextResponse } from "next/server";
import { upsertSkip } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { movieId } = await request.json();
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }
  await upsertSkip(movieId);
  return NextResponse.json({ success: true });
}

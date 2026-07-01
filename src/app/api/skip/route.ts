import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { movieId } = await request.json();
  if (!movieId) {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }
  const skip = await prisma.skip.upsert({
    where: { movieId },
    update: {},
    create: { movieId },
  });
  return NextResponse.json(skip);
}

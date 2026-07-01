import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ratings = await prisma.rating.findMany({
    include: { movie: { include: { genres: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(ratings);
}

export async function POST(request: NextRequest) {
  const { movieId, value } = await request.json();

  if (!movieId || typeof value !== "number") {
    return NextResponse.json({ error: "movieId and value required" }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const rating = await prisma.rating.upsert({
    where: { movieId },
    update: { value },
    create: { movieId, value },
  });

  return NextResponse.json(rating);
}

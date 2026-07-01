import { NextRequest, NextResponse } from "next/server";
import { getRatings, upsertRating, getMovie } from "@/lib/db";

export async function GET() {
  const ratings = await getRatings();
  const movies = await Promise.all(
    ratings.map(async (r) => {
      const movie = await getMovie(r.movieId);
      return { ...r, movie };
    })
  );
  return NextResponse.json(movies.filter((r) => r.movie));
}

export async function POST(request: NextRequest) {
  const { movieId, value } = await request.json();
  if (!movieId || typeof value !== "number") {
    return NextResponse.json({ error: "movieId and value required" }, { status: 400 });
  }
  const movie = await getMovie(movieId);
  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  await upsertRating(movieId, value);
  return NextResponse.json({ success: true });
}

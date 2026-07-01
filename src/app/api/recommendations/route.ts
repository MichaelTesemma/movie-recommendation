import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProfile } from "@/engine/profile";
import { scoreMovies } from "@/engine/scorer";
import { posterUrl } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = parseInt(searchParams.get("n") ?? "50");
  const type = searchParams.get("type") ?? "movie";

  const ratings = await prisma.rating.findMany({
    include: {
      movie: { include: { genres: true, keywords: true, cast: true } },
    },
    where: { movie: { mediaType: type } },
  });

  const profile = buildProfile(ratings);

  const skippedIds = (await prisma.skip.findMany({ select: { movieId: true } })).map((s) => s.movieId);
  const ratedIds = new Set(ratings.map((r) => r.movieId));

  const allMovies = await prisma.movie.findMany({
    where: { mediaType: type, id: { notIn: [...ratedIds, ...skippedIds] } },
    include: { genres: true, keywords: true, cast: true },
  });

  const likedIds = ratings.filter((r) => r.value >= 3).map((r) => r.movieId);
  const scored = scoreMovies(profile, allMovies, likedIds);

  let top = scored.slice(0, 60);
  if (searchParams.get("shuffle") === "1") {
    for (let i = top.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top[i], top[j]] = [top[j], top[i]];
    }
  }

  const result = top.slice(0, n).map((s) => ({
    ...s,
    posterUrl: posterUrl(s.posterPath),
  }));

  return NextResponse.json({
    profile: {
      totalRatings: profile.totalRatings,
      topGenres: Object.entries(profile.genreWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id),
    },
    recommendations: result,
  });
}

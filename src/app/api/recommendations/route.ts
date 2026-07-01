import { NextRequest, NextResponse } from "next/server";
import { getRatings, getMovie, getAllMovies, getSkippedIds } from "@/lib/db";
import { buildProfile } from "@/engine/profile";
import { scoreMovies } from "@/engine/scorer";
import { posterUrl } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = parseInt(searchParams.get("n") ?? "50");
  const type = searchParams.get("type") ?? "movie";

  const ratings = await getRatings();
  const allMovies = await getAllMovies();

  const filteredRatings = ratings.filter((r) => {
    const movie = allMovies.find((m) => m.id === r.movieId);
    return movie && movie.mediaType === type;
  });

  const movieMap = new Map(allMovies.map((m) => [m.id, m]));
  const enrichedRatings = filteredRatings.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(),
    movie: movieMap.get(r.movieId)!,
  }));

  const profile = buildProfile(enrichedRatings);

  const skippedIds = await getSkippedIds();
  const ratedIds = new Set(filteredRatings.map((r) => r.movieId));

  const candidates = allMovies.filter(
    (m) => m.mediaType === type && !ratedIds.has(m.id) && !skippedIds.has(m.id)
  );

  const likedIds = filteredRatings.filter((r) => r.value >= 3).map((r) => r.movieId);
  const scored = scoreMovies(profile, candidates, likedIds);

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

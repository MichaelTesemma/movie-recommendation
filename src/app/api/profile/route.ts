import { NextResponse } from "next/server";
import { getRatings, getAllMovies } from "@/lib/db";
import { buildProfile } from "@/engine/profile";
import { posterUrl } from "@/lib/tmdb";
import type { MovieDoc } from "@/lib/types";

const GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV",
  53: "Thriller", 10752: "War", 37: "Western",
};

const GENRE_NAMES_TV: Record<number, string> = {
  10759: "Action/Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
  9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi/Fantasy",
  10766: "Soap", 10767: "Talk", 10768: "War/Politics", 37: "Western",
};

const ALL_GENRE_NAMES = { ...GENRE_NAMES, ...GENRE_NAMES_TV };

export async function GET() {
  const [ratingsList, allMovies] = await Promise.all([getRatings(), getAllMovies()]);
  const movieMap = new Map(allMovies.map((m) => [m.id, m]));

  if (ratingsList.length === 0) {
    return NextResponse.json({ totalRatings: 0, genres: [], keywords: [], directors: [], actors: [], decades: [], distribution: [], ratings: [] });
  }

  const enrichedRatings = ratingsList.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(),
    movie: movieMap.get(r.movieId)!,
  })).filter((r) => r.movie);

  const profile = buildProfile(enrichedRatings);

  const genreEntries = Object.entries(profile.genreWeights)
    .map(([id, weight]) => ({ id: Number(id), name: ALL_GENRE_NAMES[Number(id)] ?? `Genre ${id}`, weight }))
    .sort((a, b) => b.weight - a.weight);

  const nameMap = new Map<number, string>();
  for (const r of enrichedRatings) {
    for (const kw of r.movie.keywords) nameMap.set(kw.id, kw.name);
  }
  const keywordEntries = Object.entries(profile.keywordVec)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([id, weight]) => ({ id: Number(id), name: nameMap.get(Number(id)) ?? `kw_${id}`, weight }));

  const dirScores: Record<number, { name: string; weight: number }> = {};
  const actorScores: Record<number, { name: string; weight: number }> = {};
  for (const r of enrichedRatings) {
    const w = r.value;
    for (const person of r.movie.cast) {
      const map = person.role === "director" ? dirScores : actorScores;
      if (!map[person.tmdbId]) map[person.tmdbId] = { name: person.name, weight: 0 };
      map[person.tmdbId].weight += w;
    }
  }
  const directors = Object.entries(dirScores)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .slice(0, 10)
    .map(([tmdbId, info]) => ({ tmdbId: Number(tmdbId), name: info.name, weight: info.weight }));
  const actors = Object.entries(actorScores)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .slice(0, 10)
    .map(([tmdbId, info]) => ({ tmdbId: Number(tmdbId), name: info.name, weight: info.weight }));

  const decadeCounts: Record<number, number> = {};
  for (const r of enrichedRatings) {
    const year = r.movie.releaseDate ? new Date(r.movie.releaseDate).getFullYear() : 2000;
    const decade = Math.floor(year / 10) * 10;
    decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
  }
  const decades = Object.entries(decadeCounts)
    .map(([d, count]) => ({ decade: Number(d), count }))
    .sort((a, b) => a.decade - b.decade);

  const distribution = [0, 0, 0, 0, 0];
  for (const r of enrichedRatings) {
    distribution[r.value - 1] = (distribution[r.value - 1] ?? 0) + 1;
  }

  const ratedMovies = enrichedRatings.map((r) => ({
    id: r.movie.id,
    title: r.movie.title,
    posterUrl: posterUrl(r.movie.posterPath),
    year: r.movie.releaseDate ? r.movie.releaseDate.getFullYear() : null,
    mediaType: r.movie.mediaType,
    value: r.value,
    genres: r.movie.genres.map((g) => ({ id: g.id, name: g.name })),
  }));

  return NextResponse.json({
    totalRatings: ratingsList.length,
    genres: genreEntries,
    keywords: keywordEntries,
    directors,
    actors,
    decades,
    distribution,
    ratings: ratedMovies,
  });
}

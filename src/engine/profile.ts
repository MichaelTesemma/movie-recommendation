import type { Rating, Movie, Genre, Keyword, CastMember } from "@prisma/client";
import type { UserProfile } from "./types";

type MovieWithRelations = Movie & { genres: Genre[]; keywords: Keyword[]; cast: CastMember[] };

export function buildProfile(ratings: (Rating & { movie: MovieWithRelations })[]): UserProfile {
  const genreWeights: Record<number, number> = {};
  const keywordVec: Record<number, number> = {};
  const crewScores: Record<number, number> = {};
  const favDecades = new Set<number>();

  for (const rating of ratings) {
    const w = rating.value;
    const movie = rating.movie;
    const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 2000;

    for (const genre of movie.genres) {
      genreWeights[genre.id] = (genreWeights[genre.id] ?? 0) + w;
    }

    for (const kw of movie.keywords) {
      keywordVec[kw.id] = (keywordVec[kw.id] ?? 0) + w;
    }

    for (const person of movie.cast) {
      crewScores[person.tmdbId] = (crewScores[person.tmdbId] ?? 0) + w;
    }

    if (w > 0) favDecades.add(Math.floor(year / 10) * 10);
  }

  return { genreWeights, keywordVec, crewScores, favDecades, totalRatings: ratings.length };
}

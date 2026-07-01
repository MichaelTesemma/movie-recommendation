import type { Movie, Genre, Keyword, CastMember } from "@prisma/client";
import { extractFeatureVector, cosineSimilarity, jaccardSimilarity } from "./features";
import type { UserProfile, ScoredMovie, SignalWeights } from "./types";
import { posterUrl } from "@/lib/tmdb";

type MovieWithRelations = Movie & { genres: Genre[]; keywords: Keyword[]; cast: CastMember[] };

const DEFAULT_WEIGHTS: SignalWeights = {
  genre: 0.30,
  keyword: 0.25,
  crew: 0.20,
  tmdbSimilar: 0.15,
  era: 0.10,
};

const COLD_START_WEIGHTS: SignalWeights = {
  genre: 0.60,
  keyword: 0.15,
  crew: 0.10,
  tmdbSimilar: 0.10,
  era: 0.05,
};

export function scoreMovies(
  profile: UserProfile,
  candidates: MovieWithRelations[],
  likedMovieIds: number[],
  signalWeights?: Partial<SignalWeights>
): ScoredMovie[] {
  const weights = profile.totalRatings < 5
    ? { ...COLD_START_WEIGHTS, ...signalWeights }
    : { ...DEFAULT_WEIGHTS, ...signalWeights };

  const likedFeatures = candidates
    .filter((m) => likedMovieIds.includes(m.id))
    .map(extractFeatureVector);

  return candidates
    .filter((m) => !likedMovieIds.includes(m.id))
    .map((movie) => {
      const vec = extractFeatureVector(movie);

      const genreScore = likedFeatures.length > 0
        ? likedFeatures.reduce((sum, lf) => sum + jaccardSimilarity(vec.genres, lf.genres), 0) / likedFeatures.length
        : profileGenreScore(profile, vec.genres);

      const keywordScore = profileKeywordScore(profile, vec.keywordIds);

      const crewScore = likedFeatures.length > 0
        ? likedFeatures.reduce((sum, lf) => sum + jaccardSimilarity(vec.crewIds, lf.crewIds), 0) / likedFeatures.length
        : profileCrewScore(profile, vec.crewIds);

      const eraScore = profile.favDecades.has(vec.decade) ? 1 : 0;

      const total =
        genreScore * weights.genre +
        keywordScore * weights.keyword +
        crewScore * weights.crew +
        eraScore * weights.era;

      return {
        movieId: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 0,
        genres: movie.genres.map((g) => ({ id: g.id, name: g.name })),
        matchScore: Math.round(total * 100),
        signals: { genre: genreScore, keyword: keywordScore, crew: crewScore, tmdb: 0, era: eraScore },
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 50);
}

function profileGenreScore(profile: UserProfile, genres: number[]): number {
  let score = 0;
  for (const g of genres) {
    score += profile.genreWeights[g] ?? 0;
  }
  return sigmoid(score / Math.max(Object.keys(profile.genreWeights).length, 1));
}

function profileKeywordScore(profile: UserProfile, keywordIds: number[]): number {
  let score = 0;
  for (const kwId of keywordIds) {
    score += profile.keywordVec[kwId] ?? 0;
  }
  return sigmoid(score / 5);
}

function profileCrewScore(profile: UserProfile, crewIds: number[]): number {
  let score = 0;
  for (const cId of crewIds) {
    score += profile.crewScores[cId] ?? 0;
  }
  return sigmoid(score);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

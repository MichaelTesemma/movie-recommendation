import type { MovieFeatureVector } from "./types";

export function extractFeatureVector(movie: { genres: { id: number }[]; keywords: { id: number }[]; cast: { tmdbId: number; role: string }[]; releaseDate?: Date | null; id: number; runtime: number | null }): MovieFeatureVector {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 2000;
  return {
    movieId: movie.id,
    genres: movie.genres.map((g) => g.id).sort(),
    keywordIds: movie.keywords.map((k) => k.id).sort(),
    crewIds: [...new Set(movie.cast.map((c) => c.tmdbId))],
    decade: Math.floor(year / 10) * 10,
    runtimeBucket: movie.runtime
      ? movie.runtime < 90 ? 0 : movie.runtime < 120 ? 1 : movie.runtime < 150 ? 2 : 3
      : 1,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function jaccardSimilarity<T>(a: T[], b: T[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

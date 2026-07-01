import { describe, it, expect } from "vitest";
import { scoreMovies } from "../scorer";
import type { UserProfile } from "../types";

const makeMovie = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Movie ${id}`,
  overview: "Overview",
  posterPath: `/poster${id}.jpg`,
  releaseDate: new Date("2010-06-01"),
  voteAverage: 7,
  runtime: 120,
  director: null,
  numberOfSeasons: null,
  numberOfEpisodes: null,
  mediaType: "movie" as const,
  featureVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  genres: [{ id: 28, name: "Action" }],
  keywords: [] as { id: number; name: string }[],
  cast: [] as { id: number; name: string; role: string; tmdbId: number; order: number; movieId: number }[],
  ...overrides,
});

const emptyProfile: UserProfile = {
  genreWeights: {},
  keywordVec: {},
  crewScores: {},
  favDecades: new Set(),
  totalRatings: 0,
};

describe("scoreMovies", () => {
  it("returns empty array when no candidates", () => {
    expect(scoreMovies(emptyProfile, [], [])).toEqual([]);
  });

  it("filters out liked movies from results", () => {
    const liked = makeMovie(1);
    const candidate = makeMovie(2);
    const results = scoreMovies(emptyProfile, [liked, candidate], [1]);
    expect(results).toHaveLength(1);
    expect(results[0].movieId).toBe(2);
  });

  it("sorts by matchScore descending", () => {
    const profile: UserProfile = {
      genreWeights: { 28: 10 },
      keywordVec: {},
      crewScores: {},
      favDecades: new Set([2010]),
      totalRatings: 5,
    };
    const candidates = [
      makeMovie(1, { genres: [{ id: 28, name: "Action" }] }),
      makeMovie(2, { genres: [{ id: 35, name: "Comedy" }] }),
    ];
    const results = scoreMovies(profile, candidates, []);
    expect(results).toHaveLength(2);
    expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
  });

  it("returns at most 50 results", () => {
    const candidates = Array.from({ length: 100 }, (_, i) => makeMovie(i));
    const results = scoreMovies(emptyProfile, candidates, []);
    expect(results).toHaveLength(50);
  });

  it("sets tmdb signal to always 0", () => {
    const results = scoreMovies(emptyProfile, [makeMovie(1)], []);
    expect(results[0].signals.tmdb).toBe(0);
  });

  it("uses cold start weights when fewer than 5 ratings", () => {
    const profile: UserProfile = {
      genreWeights: { 28: 3 },
      keywordVec: {},
      crewScores: {},
      favDecades: new Set(),
      totalRatings: 2,
    };
    const result = scoreMovies(profile, [makeMovie(1)], []);
    expect(result).toHaveLength(1);
  });

  it("uses default weights when 5 or more ratings", () => {
    const profile: UserProfile = {
      genreWeights: { 28: 15 },
      keywordVec: {},
      crewScores: {},
      favDecades: new Set(),
      totalRatings: 5,
    };
    const result = scoreMovies(profile, [makeMovie(1)], []);
    expect(result).toHaveLength(1);
  });

  it("includes movie metadata in result", () => {
    const movie = makeMovie(42, { title: "Answer", posterPath: "/ans.jpg", releaseDate: new Date("1999-01-01") });
    const result = scoreMovies(emptyProfile, [movie], []);
    expect(result[0]).toMatchObject({
      movieId: 42,
      title: "Answer",
      posterPath: "/ans.jpg",
      year: 1999,
    });
  });
});

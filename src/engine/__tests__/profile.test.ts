import { describe, it, expect } from "vitest";
import { buildProfile } from "../profile";

const movie1 = {
  id: 1,
  title: "Action Flick",
  overview: "",
  posterPath: "",
  releaseDate: new Date("2010-06-01"),
  voteAverage: 7,
  runtime: 120,
  director: null,
  numberOfSeasons: null,
  numberOfEpisodes: null,
  mediaType: "movie",
  featureVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  genres: [{ id: 28, name: "Action" }],
  keywords: [{ id: 100, name: "explosion" }],
  cast: [{ id: 1, name: "Actor A", role: "actor", tmdbId: 500, order: 0, movieId: 1 }],
};

const movie2 = {
  ...movie1,
  id: 2,
  title: "Comedy Flick",
  releaseDate: new Date("2020-03-15"),
  genres: [{ id: 35, name: "Comedy" }],
  keywords: [{ id: 200, name: "funny" }],
  cast: [{ id: 2, name: "Actor B", role: "actor", tmdbId: 600, order: 0, movieId: 2 }],
};

const rating1 = {
  id: 1,
  movieId: 1,
  value: 5,
  createdAt: new Date(),
  movie: movie1,
};

const rating2 = {
  id: 2,
  movieId: 2,
  value: 2,
  createdAt: new Date(),
  movie: movie2,
};

describe("buildProfile", () => {
  it("builds genre weights from ratings", () => {
    const profile = buildProfile([rating1, rating2]);
    expect(profile.genreWeights[28]).toBe(5);
    expect(profile.genreWeights[35]).toBe(2);
  });

  it("builds keyword vectors from ratings", () => {
    const profile = buildProfile([rating1, rating2]);
    expect(profile.keywordVec[100]).toBe(5);
    expect(profile.keywordVec[200]).toBe(2);
  });

  it("builds crew scores from ratings", () => {
    const profile = buildProfile([rating1, rating2]);
    expect(profile.crewScores[500]).toBe(5);
    expect(profile.crewScores[600]).toBe(2);
  });

  it("adds decade to favDecades for non-zero rated movies", () => {
    const profile = buildProfile([rating1, rating2]);
    expect(profile.favDecades.has(2010)).toBe(true);
    expect(profile.favDecades.has(2020)).toBe(true);
  });

  it("tracks total ratings count", () => {
    const profile = buildProfile([rating1, rating2]);
    expect(profile.totalRatings).toBe(2);
  });

  it("handles empty ratings", () => {
    const profile = buildProfile([]);
    expect(profile.totalRatings).toBe(0);
    expect(Object.keys(profile.genreWeights)).toHaveLength(0);
  });

  it("defaults year to 2000 when releaseDate is null", () => {
    const nullDateMovie = { ...movie1, releaseDate: null as unknown as Date };
    const r = { ...rating1, movie: nullDateMovie };
    const profile = buildProfile([r]);
    expect(profile.totalRatings).toBe(1);
    expect(profile.favDecades.has(2000)).toBe(true);
  });
});

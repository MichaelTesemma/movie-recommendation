import { describe, it, expect } from "vitest";
import { extractFeatureVector, cosineSimilarity, jaccardSimilarity } from "../features";

const baseMovie = {
  id: 1,
  title: "Test Movie",
  overview: "A test movie",
  posterPath: "/test.jpg",
  releaseDate: new Date("2014-07-18"),
  voteAverage: 7.5,
  runtime: 118,
  director: null,
  numberOfSeasons: null,
  numberOfEpisodes: null,
  mediaType: "movie" as const,
  featureVector: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  genres: [{ id: 28 }, { id: 878 }],
  keywords: [{ id: 100 }, { id: 200 }],
  cast: [
    { tmdbId: 500, role: "actor" },
    { tmdbId: 600, role: "actor" },
    { tmdbId: 500, role: "actor" },
  ],
};

describe("extractFeatureVector", () => {
  it("extracts genres sorted", () => {
    const vec = extractFeatureVector(baseMovie);
    expect(vec.genres).toEqual([28, 878]);
  });

  it("extracts unique crew IDs", () => {
    const vec = extractFeatureVector(baseMovie);
    expect(vec.crewIds).toEqual([500, 600]);
  });

  it("computes decade from year", () => {
    const vec = extractFeatureVector(baseMovie);
    expect(vec.decade).toBe(2010);
  });

  it("computes runtime bucket: <90 -> 0", () => {
    const short = { ...baseMovie, runtime: 85 };
    expect(extractFeatureVector(short).runtimeBucket).toBe(0);
  });

  it("computes runtime bucket: 90-119 -> 1", () => {
    expect(extractFeatureVector(baseMovie).runtimeBucket).toBe(1);
  });

  it("computes runtime bucket: 120-149 -> 2", () => {
    const med = { ...baseMovie, runtime: 135 };
    expect(extractFeatureVector(med).runtimeBucket).toBe(2);
  });

  it("computes runtime bucket: >=150 -> 3", () => {
    const long = { ...baseMovie, runtime: 160 };
    expect(extractFeatureVector(long).runtimeBucket).toBe(3);
  });

  it("defaults runtime bucket to 1 when runtime is null", () => {
    const noRuntime = { ...baseMovie, runtime: null };
    expect(extractFeatureVector(noRuntime).runtimeBucket).toBe(1);
  });

  it("defaults year to 2000 when releaseDate is null", () => {
    const noDate = { ...baseMovie, releaseDate: null as unknown as Date };
    const vec = extractFeatureVector(noDate);
    expect(vec.decade).toBe(2000);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 when both vectors are zero", () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("computes cosine of angled vectors", () => {
    const sim = cosineSimilarity([1, 0], [1, 1]);
    expect(sim).toBeCloseTo(1 / Math.sqrt(2));
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccardSimilarity([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccardSimilarity([1, 2], [3, 4])).toBe(0);
  });

  it("returns correct ratio for overlapping sets", () => {
    expect(jaccardSimilarity([1, 2, 3], [2, 3, 4])).toBeCloseTo(0.5);
  });

  it("returns 0 when both sets are empty", () => {
    expect(jaccardSimilarity([], [])).toBe(0);
  });

  it("works with strings", () => {
    expect(jaccardSimilarity(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
  });
});

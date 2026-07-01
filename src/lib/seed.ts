import "dotenv/config";
import { firestore } from "./firebase";
import {
  fetchDiscoverMovie,
  fetchDiscoverTV,
  fetchMovieDetail,
  fetchMovieKeywords,
  fetchTVDetail,
  fetchTVKeywords,
  type TMDBMovieResult,
  type TMDBTVResult,
} from "./tmdb";

class RateLimiter {
  private readonly minInterval: number;
  private lastRequestTime = performance.now();
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
  }

  async acquire(): Promise<void> {
    const now = performance.now();
    this.tokens = Math.min(this.maxTokens, this.tokens + (now - this.lastRequestTime) / 1000 * this.refillRate);
    this.lastRequestTime = now;

    if (this.tokens < 1) {
      const wait = this.minInterval;
      await new Promise((r) => setTimeout(r, wait));
      this.tokens = 0;
      this.lastRequestTime = performance.now();
    } else {
      this.tokens -= 1;
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minInterval) {
        await new Promise((r) => setTimeout(r, this.minInterval - elapsed));
      }
      this.lastRequestTime = performance.now();
    }
  }

  stop(): void {}
}

const tmdbLimit = new RateLimiter(48);

async function tmdbCall<T>(fn: () => Promise<T>): Promise<T> {
  await tmdbLimit.acquire();
  return fn();
}

async function fetchMovieWithDetails(movieId: number): Promise<void> {
  const [detail, keywordsRes] = await Promise.all([
    tmdbCall(() => fetchMovieDetail(movieId)),
    tmdbCall(() => fetchMovieKeywords(movieId)),
  ]);
  const director = detail.credits.crew.find((c) => c.job === "Director")?.name ?? null;

  const genres = detail.genres.map((g) => ({ id: g.id, name: g.name }));
  const genreIds = genres.map((g) => g.id);
  const kws = (keywordsRes.keywords ?? []).slice(0, 20).map((kw) => ({ id: kw.id, name: kw.name }));
  const keywordIds = kws.map((kw) => kw.id);

  const cast: { id: number; name: string; role: string; tmdbId: number; order: number }[] = detail.credits.cast.slice(0, 5).map((p) => ({
    id: p.id, name: p.name, role: "actor", tmdbId: p.id, order: p.order,
  }));
  const dirCrew = detail.credits.crew.find((c) => c.job === "Director");
  const crewIds: number[] = [];
  if (dirCrew) {
    cast.push({ id: dirCrew.id, name: dirCrew.name, role: "director", tmdbId: dirCrew.id, order: 0 });
    crewIds.push(dirCrew.id);
  }

  await firestore.collection("movies").doc(String(movieId)).set({
    id: movieId,
    title: detail.title,
    overview: detail.overview,
    posterPath: detail.poster_path ?? "",
    releaseDate: detail.release_date ? new Date(detail.release_date) : null,
    voteAverage: detail.vote_average,
    runtime: detail.runtime,
    director,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    mediaType: "movie",
    genres,
    genreIds,
    keywords: kws,
    keywordIds,
    cast,
    crewIds,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function fetchTVWithDetails(tvId: number): Promise<void> {
  const [detail, keywordsRes] = await Promise.all([
    tmdbCall(() => fetchTVDetail(tvId)),
    tmdbCall(() => fetchTVKeywords(tvId)),
  ]);
  const id = tvId * -1;
  const creator = detail.created_by?.[0]?.name ?? null;

  const genres = (detail.genres ?? []).map((g) => ({ id: g.id + 1000, name: g.name }));
  const genreIds = genres.map((g) => g.id);
  const kws = (keywordsRes.results ?? []).slice(0, 20).map((kw) => ({ id: kw.id, name: kw.name }));
  const keywordIds = kws.map((kw) => kw.id);

  const cast = detail.credits.cast.slice(0, 5).map((p) => ({
    id: p.id, name: p.name, role: "actor" as const, tmdbId: p.id, order: p.order,
  }));

  await firestore.collection("movies").doc(String(id)).set({
    id,
    title: detail.name,
    overview: detail.overview,
    posterPath: detail.poster_path ?? "",
    releaseDate: detail.first_air_date ? new Date(detail.first_air_date) : null,
    voteAverage: detail.vote_average,
    runtime: null,
    director: creator,
    numberOfSeasons: detail.number_of_seasons,
    numberOfEpisodes: detail.number_of_episodes,
    mediaType: "tv",
    genres,
    genreIds,
    keywords: kws,
    keywordIds,
    cast,
    crewIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function discoverMovies(): Promise<Map<number, TMDBMovieResult>> {
  const seen = new Map<number, TMDBMovieResult>();
  const sortPasses = [
    { sort_by: "vote_average.desc", "vote_count.gte": "200" },
    { sort_by: "popularity.desc", "vote_count.gte": "50" },
    { sort_by: "primary_release_date.desc", "vote_count.gte": "50", page_limit: 200 },
  ];

  for (const pass of sortPasses) {
    const { page_limit = 500, ...params } = pass;
    const first = await tmdbCall(() => fetchDiscoverMovie({ ...params, page: "1" }));
    const totalPages = Math.min(first.total_pages, page_limit);
    console.log(`  Movie discover (${pass.sort_by}): ${totalPages} pages, ${first.total_results} total`);

    const pages: TMDBMovieResult[][] = [first.results];
    const pagePromises: Promise<TMDBMovieResult[]>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      const pageNum = p;
      pagePromises.push(
        tmdbCall(() => fetchDiscoverMovie({ ...params, page: String(pageNum) })).then((r) => r.results)
      );
    }
    pages.push(...await Promise.all(pagePromises));

    for (const results of pages) {
      for (const m of results) {
        if (!seen.has(m.id)) seen.set(m.id, m);
      }
    }
    console.log(`  → ${seen.size} unique movies so far`);
  }
  return seen;
}

async function discoverTV(): Promise<Map<number, TMDBTVResult>> {
  const seen = new Map<number, TMDBTVResult>();
  const sortPasses = [
    { sort_by: "vote_average.desc", "vote_count.gte": "200" },
    { sort_by: "popularity.desc", "vote_count.gte": "50" },
    { sort_by: "first_air_date.desc", "vote_count.gte": "50", page_limit: 200 },
  ];

  for (const pass of sortPasses) {
    const { page_limit = 500, ...params } = pass;
    const first = await tmdbCall(() => fetchDiscoverTV({ ...params, page: "1" }));
    const totalPages = Math.min(first.total_pages, page_limit);
    console.log(`  TV discover (${pass.sort_by}): ${totalPages} pages, ${first.total_results} total`);

    const pages: TMDBTVResult[][] = [first.results];
    const pagePromises: Promise<TMDBTVResult[]>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      const pageNum = p;
      pagePromises.push(
        tmdbCall(() => fetchDiscoverTV({ ...params, page: String(pageNum) })).then((r) => r.results)
      );
    }
    pages.push(...await Promise.all(pagePromises));

    for (const results of pages) {
      for (const t of results) {
        if (!seen.has(t.id)) seen.set(t.id, t);
      }
    }
    console.log(`  → ${seen.size} unique TV shows so far`);
  }
  return seen;
}

export async function seedDatabase() {
  console.log("\n── Movie Discovery ──");
  const movies = await discoverMovies();
  const movieList = [...movies.values()];
  console.log(`\nTotal unique movies: ${movieList.length}`);

  console.log("\n── Fetching Movie Details ──");
  let count = 0;
  const batchSize = 8;
  for (let i = 0; i < movieList.length; i += batchSize) {
    const batch = movieList.slice(i, i + batchSize);
    await Promise.all(batch.map((m) => fetchMovieWithDetails(m.id)));
    count += batch.length;
    process.stdout.write(`\r  Movie ${count}/${movieList.length}`);
  }
  process.stdout.write("\n");

  console.log("\n── TV Discovery ──");
  const tvShows = await discoverTV();
  const tvList = [...tvShows.values()];
  console.log(`\nTotal unique TV shows: ${tvList.length}`);

  console.log("\n── Fetching TV Details ──");
  count = 0;
  for (let i = 0; i < tvList.length; i += batchSize) {
    const batch = tvList.slice(i, i + batchSize);
    await Promise.all(batch.map((t) => fetchTVWithDetails(t.id)));
    count += batch.length;
    process.stdout.write(`\r  TV ${count}/${tvList.length}`);
  }
  process.stdout.write("\n");

  const movieSnap = await firestore.collection("movies").where("mediaType", "==", "movie").count().get();
  const tvSnap = await firestore.collection("movies").where("mediaType", "==", "tv").count().get();
  console.log(`\n✓ Seeded ${movieSnap.data()?.count ?? "?"} movies & ${tvSnap.data()?.count ?? "?"} TV shows`);

  tmdbLimit.stop();
}

seedDatabase().catch(console.error);

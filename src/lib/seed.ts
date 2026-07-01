import "dotenv/config";
import { prisma } from "./prisma";
import {
  fetchTopRated,
  fetchPopular,
  fetchMovieDetail,
  fetchMovieKeywords,
  fetchGenres,
  fetchTopRatedTV,
  fetchPopularTV,
  fetchTVDetail,
  fetchTVKeywords,
  fetchTVGenres,
  type TMDBMovieResult,
  type TMDBTVResult,
} from "./tmdb";

class RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise((r) => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  release(): void {}

  stop(): void {}
}

const tmdbLimit = new RateLimiter(48);

async function tmdbCall<T>(fn: () => Promise<T>): Promise<T> {
  await tmdbLimit.acquire();
  try {
    return await fn();
  } finally {
    tmdbLimit.release();
  }
}

async function upsertMovie(movie: TMDBMovieResult): Promise<number> {
  const [detail, keywordsRes] = await Promise.all([
    tmdbCall(() => fetchMovieDetail(movie.id)),
    tmdbCall(() => fetchMovieKeywords(movie.id)),
  ]);
  const director = detail.credits.crew.find((c) => c.job === "Director")?.name ?? null;

  await prisma.movie.upsert({
    where: { id: movie.id },
    update: { title: detail.title, overview: detail.overview, posterPath: detail.poster_path ?? "", releaseDate: new Date(detail.release_date || "2000-01-01"), voteAverage: detail.vote_average, runtime: detail.runtime, director, mediaType: "movie" },
    create: { id: movie.id, title: detail.title, overview: detail.overview, posterPath: detail.poster_path ?? "", releaseDate: new Date(detail.release_date || "2000-01-01"), voteAverage: detail.vote_average, runtime: detail.runtime, director, mediaType: "movie" },
  });

  if (detail.genres.length > 0) {
    const genreIds = detail.genres.map((g) => g.id);
    await prisma.genre.createMany({ data: detail.genres.map((g) => ({ id: g.id, name: g.name })) }).catch(() => {});
    const existingGenres = await prisma.genre.findMany({ where: { id: { in: genreIds } } });
    if (existingGenres.length > 0) {
      await prisma.movie.update({ where: { id: movie.id }, data: { genres: { connect: existingGenres.map((g) => ({ id: g.id })) } } }).catch(() => {});
    }
  }

  const kws = keywordsRes.keywords.slice(0, 20);
  if (kws.length > 0) {
    await prisma.keyword.createMany({ data: kws.map((kw) => ({ name: kw.name })) }).catch(() => {});
    const existingKws = await prisma.keyword.findMany({ where: { name: { in: kws.map((kw) => kw.name) } } });
    if (existingKws.length > 0) {
      await prisma.movie.update({ where: { id: movie.id }, data: { keywords: { connect: existingKws.map((kw) => ({ id: kw.id })) } } }).catch(() => {});
    }
  }

  const castData = detail.credits.cast.slice(0, 5).map((person) => ({
    id: movie.id * 1000 + person.id,
    name: person.name,
    role: "actor",
    tmdbId: person.id,
    order: person.order,
    movieId: movie.id,
  }));
  if (director) {
    const dirDetail = detail.credits.crew.find((c) => c.job === "Director")!;
    castData.push({
      id: movie.id * 1000 + dirDetail.id,
      name: dirDetail.name,
      role: "director",
      tmdbId: dirDetail.id,
      order: 0,
      movieId: movie.id,
    });
  }
  if (castData.length > 0) {
    await prisma.castMember.createMany({ data: castData }).catch(() => {});
  }

  return movie.id;
}

async function upsertTVShow(tv: TMDBTVResult): Promise<number> {
  const [detail, keywordsRes] = await Promise.all([
    tmdbCall(() => fetchTVDetail(tv.id)),
    tmdbCall(() => fetchTVKeywords(tv.id)),
  ]);
  const creator = detail.created_by[0]?.name ?? null;

  await prisma.movie.upsert({
    where: { id: tv.id * -1 },
    update: { title: detail.name, overview: detail.overview, posterPath: detail.poster_path ?? "", releaseDate: new Date(detail.first_air_date || "2000-01-01"), voteAverage: detail.vote_average, runtime: null, director: creator, numberOfSeasons: detail.number_of_seasons, numberOfEpisodes: detail.number_of_episodes, mediaType: "tv" },
    create: { id: tv.id * -1, title: detail.name, overview: detail.overview, posterPath: detail.poster_path ?? "", releaseDate: new Date(detail.first_air_date || "2000-01-01"), voteAverage: detail.vote_average, runtime: null, director: creator, numberOfSeasons: detail.number_of_seasons, numberOfEpisodes: detail.number_of_episodes, mediaType: "tv" },
  });

  if (detail.genres.length > 0) {
    const genreData = detail.genres.map((g) => ({ id: g.id + 1000, name: g.name }));
    await prisma.genre.createMany({ data: genreData }).catch(() => {});
    const existingGenres = await prisma.genre.findMany({ where: { id: { in: detail.genres.map((g) => g.id + 1000) } } });
    if (existingGenres.length > 0) {
      await prisma.movie.update({ where: { id: tv.id * -1 }, data: { genres: { connect: existingGenres.map((g) => ({ id: g.id })) } } }).catch(() => {});
    }
  }

  const kws = (keywordsRes.results ?? []).slice(0, 20);
  if (kws.length > 0) {
    await prisma.keyword.createMany({ data: kws.map((kw) => ({ name: kw.name })) }).catch(() => {});
    const existingKws = await prisma.keyword.findMany({ where: { name: { in: kws.map((kw) => kw.name) } } });
    if (existingKws.length > 0) {
      await prisma.movie.update({ where: { id: tv.id * -1 }, data: { keywords: { connect: existingKws.map((kw) => ({ id: kw.id })) } } }).catch(() => {});
    }
  }

  const castData = detail.credits.cast.slice(0, 5).map((person) => ({
    id: tv.id * -1000 + person.id,
    name: person.name,
    role: "actor",
    tmdbId: person.id,
    order: person.order,
    movieId: tv.id * -1,
  }));
  if (castData.length > 0) {
    await prisma.castMember.createMany({ data: castData }).catch(() => {});
  }

  return tv.id;
}

async function discoverPage<T>(
  fetcher: (page: number) => Promise<{ results: T[]; total_pages: number }>,
  page: number,
): Promise<T[]> {
  const data = await tmdbCall(() => fetcher(page));
  return data.results;
}

export async function seedDatabase() {
  await prisma.genre.deleteMany();
  const movieGenres = await fetchGenres();
  for (const g of movieGenres.genres) {
    await prisma.genre.upsert({ where: { id: g.id }, update: {}, create: { id: g.id, name: g.name } });
  }
  const tvGenres = await fetchTVGenres();
  for (const g of tvGenres.genres) {
    await prisma.genre.upsert({ where: { id: g.id + 1000 }, update: {}, create: { id: g.id + 1000, name: g.name } });
  }

  const seen = new Set<number>();

  console.log("Discovering movie pages...");
  const firstMoviePage = await tmdbCall(() => fetchTopRated(1));
  const movieTotalPages = Math.min(firstMoviePage.total_pages, 30);
  const moviePagePromises: Promise<TMDBMovieResult[]>[] = [];
  for (let page = 1; page <= movieTotalPages; page++) {
    moviePagePromises.push(discoverPage(fetchTopRated, page));
  }
  const popularMovieTotal = await tmdbCall(() => fetchPopular(1)).then((r) => Math.min(r.total_pages, 30));
  for (let page = 1; page <= popularMovieTotal; page++) {
    moviePagePromises.push(discoverPage(fetchPopular, page));
  }
  const moviePageResults = await Promise.all(moviePagePromises);
  const allMovieIds: TMDBMovieResult[] = [];
  for (const results of moviePageResults) {
    for (const m of results) {
      if (!seen.has(m.id) && m.vote_average >= 6) {
        seen.add(m.id);
        allMovieIds.push(m);
      }
    }
  }
  console.log(`  ${allMovieIds.length} movies discovered`);

  console.log("Fetching movie details...");
  let count = 0;
  const movieBatchSize = 5;
  for (let i = 0; i < allMovieIds.length; i += movieBatchSize) {
    const batch = allMovieIds.slice(i, i + movieBatchSize);
    await Promise.all(batch.map((m) => upsertMovie(m)));
    count += batch.length;
    process.stdout.write(`\r  Movie ${count}/${allMovieIds.length}`);
  }
  process.stdout.write("\n");

  console.log("Discovering TV pages...");
  const seenTV = new Set<number>();
  const firstTVPage = await tmdbCall(() => fetchTopRatedTV(1));
  const tvTotalPages = Math.min(firstTVPage.total_pages, 30);
  const tvPagePromises: Promise<TMDBTVResult[]>[] = [];
  for (let page = 1; page <= tvTotalPages; page++) {
    tvPagePromises.push(discoverPage(fetchTopRatedTV, page));
  }
  const popularTVTotal = await tmdbCall(() => fetchPopularTV(1)).then((r) => Math.min(r.total_pages, 30));
  for (let page = 1; page <= popularTVTotal; page++) {
    tvPagePromises.push(discoverPage(fetchPopularTV, page));
  }
  const tvPageResults = await Promise.all(tvPagePromises);
  const allTVIds: TMDBTVResult[] = [];
  for (const results of tvPageResults) {
    for (const t of results) {
      if (!seenTV.has(t.id) && t.vote_average >= 6) {
        seenTV.add(t.id);
        allTVIds.push(t);
      }
    }
  }
  console.log(`  ${allTVIds.length} TV shows discovered`);

  console.log("Fetching TV details...");
  count = 0;
  const tvBatchSize = 5;
  for (let i = 0; i < allTVIds.length; i += tvBatchSize) {
    const batch = allTVIds.slice(i, i + tvBatchSize);
    await Promise.all(batch.map((t) => upsertTVShow(t)));
    count += batch.length;
    process.stdout.write(`\r  TV ${count}/${allTVIds.length}`);
  }
  process.stdout.write("\n");

  const movieCount = await prisma.movie.count({ where: { mediaType: "movie" } });
  const tvCount = await prisma.movie.count({ where: { mediaType: "tv" } });
  console.log(`\nSeeded ${movieCount} movies & ${tvCount} TV shows`);

  tmdbLimit.stop();
}

seedDatabase().catch(console.error).finally(() => prisma.$disconnect());

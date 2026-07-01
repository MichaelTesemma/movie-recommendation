import { firestore } from "./firebase";
import type {
  MovieDoc,
  RatingDoc,
  SkipDoc,
  GenreDoc,
  KeywordDoc,
  CastDoc,
} from "./types";

const moviesCol = firestore.collection("movies");
const ratingsCol = firestore.collection("ratings");
const skipsCol = firestore.collection("skips");

function convertTimestamps<T>(data: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in (value as object)) {
      result[key] = (value as FirebaseFirestore.Timestamp).toDate();
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function docToMovie(doc: FirebaseFirestore.DocumentSnapshot): MovieDoc | null {
  if (!doc.exists) return null;
  const data = { id: parseInt(doc.id), ...convertTimestamps<Omit<MovieDoc, "id">>(doc.data()!) };
  return data as MovieDoc;
}

function docToRating(doc: FirebaseFirestore.DocumentSnapshot): RatingDoc | null {
  if (!doc.exists) return null;
  return convertTimestamps<RatingDoc>(doc.data()!);
}

function docToSkip(doc: FirebaseFirestore.DocumentSnapshot): SkipDoc | null {
  if (!doc.exists) return null;
  return convertTimestamps<SkipDoc>(doc.data()!);
}

// ─── Movies ────────────────────────────────────────────

export async function getMovie(id: number): Promise<MovieDoc | null> {
  const doc = await moviesCol.doc(String(id)).get();
  return docToMovie(doc);
}

export async function getMovies(opts: {
  mediaType?: string;
  genreId?: number;
  keywordId?: number;
  search?: string;
  orderBy?: string;
  limit?: number;
  excludeSkipped?: boolean;
}): Promise<MovieDoc[]> {
  let query: FirebaseFirestore.Query = moviesCol;

  if (opts.mediaType) query = query.where("mediaType", "==", opts.mediaType);
  if (opts.genreId) query = query.where("genreIds", "array-contains", opts.genreId);
  if (opts.keywordId) query = query.where("keywordIds", "array-contains", opts.keywordId);

  let snapshot;
  try {
    if (opts.orderBy) query = query.orderBy(opts.orderBy, "desc");
    if (opts.limit) query = query.limit(opts.limit);
    snapshot = await query.get();
  } catch {
    // Fallback: query without orderBy if index not yet ready
    query = moviesCol;
    if (opts.mediaType) query = query.where("mediaType", "==", opts.mediaType);
    if (opts.genreId) query = query.where("genreIds", "array-contains", opts.genreId);
    if (opts.keywordId) query = query.where("keywordIds", "array-contains", opts.keywordId);
    if (opts.limit) query = query.limit(opts.limit);
    snapshot = await query.get();
  }

  let movies = snapshot.docs.map(docToMovie).filter(Boolean) as MovieDoc[];

  if (opts.search) {
    const q = opts.search.toLowerCase();
    movies = movies.filter((m) => m.title.toLowerCase().includes(q));
  }

  if (opts.orderBy === "voteAverage") {
    movies.sort((a, b) => b.voteAverage - a.voteAverage);
  }

  if (opts.excludeSkipped) {
    const skipIds = await getSkippedIds();
    movies = movies.filter((m) => !skipIds.has(m.id));
  }

  return movies;
}

export async function upsertMovie(id: number, data: Partial<MovieDoc>): Promise<void> {
  await moviesCol.doc(String(id)).set(data, { merge: true });
}

export async function getAllMovies(): Promise<MovieDoc[]> {
  const snapshot = await moviesCol.get();
  return snapshot.docs.map(docToMovie).filter(Boolean) as MovieDoc[];
}

// ─── Ratings ───────────────────────────────────────────

export async function getRatings(): Promise<RatingDoc[]> {
  const snapshot = await ratingsCol.orderBy("createdAt", "desc").get();
  return snapshot.docs.map(docToRating).filter(Boolean) as RatingDoc[];
}

export async function upsertRating(movieId: number, value: number): Promise<void> {
  await ratingsCol.doc(String(movieId)).set(
    {
      movieId,
      value,
      createdAt: new Date(),
    },
    { merge: true }
  );
}

export async function getRatedIds(): Promise<Set<number>> {
  const snapshot = await ratingsCol.get();
  return new Set(snapshot.docs.map((d) => parseInt(d.id)));
}

// ─── Skips ─────────────────────────────────────────────

export async function getSkips(): Promise<SkipDoc[]> {
  const snapshot = await skipsCol.orderBy("createdAt", "desc").get();
  return snapshot.docs.map(docToSkip).filter(Boolean) as SkipDoc[];
}

export async function getSkippedIds(): Promise<Set<number>> {
  const snapshot = await skipsCol.get();
  return new Set(snapshot.docs.map((d) => parseInt(d.id)));
}

export async function upsertSkip(movieId: number): Promise<void> {
  await skipsCol.doc(String(movieId)).set(
    {
      movieId,
      createdAt: new Date(),
    },
    { merge: true }
  );
}

// ─── Aggregate helpers ─────────────────────────────────

export async function getMoviesWithRatings(): Promise<{ movie: MovieDoc; rating: number }[]> {
  const [movies, ratings] = await Promise.all([getAllMovies(), getRatings()]);
  const ratingMap = new Map(ratings.map((r) => [r.movieId, r.value]));
  return movies
    .filter((m) => ratingMap.has(m.id))
    .map((m) => ({ movie: m, rating: ratingMap.get(m.id)! }));
}

export async function getUnratedMovies(mediaType: string, limit = 50): Promise<MovieDoc[]> {
  const [ratedIds, skipIds] = await Promise.all([getRatedIds(), getSkippedIds()]);
  const query = moviesCol.where("mediaType", "==", mediaType).orderBy("voteAverage", "desc");
  const snapshot = await query.get();
  return snapshot.docs
    .map(docToMovie)
    .filter((m): m is MovieDoc => m !== null && !ratedIds.has(m.id) && !skipIds.has(m.id))
    .slice(0, limit);
}

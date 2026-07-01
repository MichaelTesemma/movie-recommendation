// Firestore document types (mirrors the Prisma schema shape)

export interface GenreDoc {
  id: number;
  name: string;
}

export interface KeywordDoc {
  id: number;
  name: string;
}

export interface CastDoc {
  id: number;
  name: string;
  role: string;
  tmdbId: number;
  order: number;
}

export interface MovieDoc {
  id: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: Date | null;
  voteAverage: number;
  runtime: number | null;
  director: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  mediaType: string;
  genres: GenreDoc[];
  genreIds: number[];
  keywords: KeywordDoc[];
  keywordIds: number[];
  cast: CastDoc[];
  crewIds: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingDoc {
  movieId: number;
  value: number;
  createdAt: Date;
}

export interface SkipDoc {
  movieId: number;
  createdAt: Date;
}

// Engine-compatible shape (matches what the engine expects from Prisma types)
export interface EngineMovie {
  id: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: Date;
  voteAverage: number;
  runtime: number | null;
  director: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  mediaType: string;
  genres: GenreDoc[];
  keywords: KeywordDoc[];
  cast: CastDoc[];
}

export interface EngineRating {
  id: number;
  movieId: number;
  value: number;
  createdAt: Date;
  movie: EngineMovie;
}

export interface MovieFeatureVector {
  movieId: number;
  genres: number[];
  keywordIds: number[];
  crewIds: number[];
  decade: number;
  runtimeBucket: number;
}

export interface SignalWeights {
  genre: number;
  keyword: number;
  crew: number;
  tmdbSimilar: number;
  era: number;
}

export interface UserProfile {
  genreWeights: Record<number, number>;
  keywordVec: Record<number, number>;
  crewScores: Record<number, number>;
  favDecades: Set<number>;
  totalRatings: number;
}

export interface ScoredMovie {
  movieId: number;
  title: string;
  posterPath: string;
  year: number;
  genres: { id: number; name: string }[];
  matchScore: number;
  signals: {
    genre: number;
    keyword: number;
    crew: number;
    tmdb: number;
    era: number;
  };
}

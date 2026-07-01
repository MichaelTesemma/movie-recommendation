const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY!;
const IMAGE_BASE = "https://image.tmdb.org/t/p";

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  return res.json();
}

interface TMDBMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBTVResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBPaginatedResult {
  results: TMDBMovieResult[];
  total_pages: number;
  total_results: number;
}

interface TMDBTVPaginatedResult {
  results: TMDBTVResult[];
  total_pages: number;
  total_results: number;
}

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBKeyword {
  id: number;
  name: string;
}

interface TMDBPerson {
  id: number;
  name: string;
  known_for_department: string;
  order: number;
}

interface TMDBMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: TMDBGenre[];
  credits: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; known_for_department: string; order: number }[];
  };
}

export function posterUrl(path: string | null, size = "w342"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export async function fetchTrending(page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/trending/movie/week`, { page: String(page) });
}

export async function fetchPopular(page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/movie/popular`, { page: String(page) });
}

export async function fetchTopRated(page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/movie/top_rated`, { page: String(page) });
}

interface TMDBTVDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  genres: TMDBGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  created_by: { id: number; name: string }[];
  credits: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; known_for_department: string; order: number }[];
  };
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/search/movie`, { query, page: String(page) });
}

export async function fetchMovieDetail(id: number) {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${id}`, { append_to_response: "credits" });
}

export async function fetchMovieKeywords(id: number) {
  return tmdbFetch<{ keywords: TMDBKeyword[] }>(`/movie/${id}/keywords`);
}

export async function fetchGenres() {
  return tmdbFetch<{ genres: TMDBGenre[] }>(`/genre/movie/list`);
}

export async function fetchSimilar(id: number, page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/movie/${id}/similar`, { page: String(page) });
}

export async function fetchRecommendations(id: number, page = 1) {
  return tmdbFetch<TMDBPaginatedResult>(`/movie/${id}/recommendations`, { page: String(page) });
}

export async function fetchTrendingTV(page = 1) {
  return tmdbFetch<TMDBTVPaginatedResult>(`/trending/tv/week`, { page: String(page) });
}

export async function fetchTopRatedTV(page = 1) {
  return tmdbFetch<TMDBTVPaginatedResult>(`/tv/top_rated`, { page: String(page) });
}

export async function fetchPopularTV(page = 1) {
  return tmdbFetch<TMDBTVPaginatedResult>(`/tv/popular`, { page: String(page) });
}

export async function fetchTVDetail(id: number) {
  return tmdbFetch<TMDBTVDetail>(`/tv/${id}`, { append_to_response: "credits" });
}

export async function fetchTVKeywords(id: number) {
  return tmdbFetch<{ results: TMDBKeyword[] }>(`/tv/${id}/keywords`);
}

export async function fetchTVGenres() {
  return tmdbFetch<{ genres: TMDBGenre[] }>(`/genre/tv/list`);
}

export async function fetchDiscoverMovie(params: Record<string, string>) {
  return tmdbFetch<TMDBPaginatedResult>(`/discover/movie`, params);
}

export async function fetchDiscoverTV(params: Record<string, string>) {
  return tmdbFetch<TMDBTVPaginatedResult>(`/discover/tv`, params);
}

export type { TMDBMovieResult, TMDBTVResult, TMDBPaginatedResult, TMDBTVPaginatedResult, TMDBGenre, TMDBKeyword, TMDBPerson, TMDBMovieDetail, TMDBTVDetail };

import { NextRequest, NextResponse } from "next/server";
import { getMovie, getMovies, getRatedIds, getSkippedIds } from "@/lib/db";
import { fetchTrending, fetchPopular, searchMovies, fetchMovieDetail, posterUrl } from "@/lib/tmdb";

async function getExcludeSkippedFilter() {
  const skipIds = await getSkippedIds();
  return { excludeSkipped: true as const, skipIds };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const genre = searchParams.get("genre");
  const trending = searchParams.get("trending");
  const popular = searchParams.get("popular");
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "movie";
  const page = parseInt(searchParams.get("page") ?? "1");

  if (id) {
    const movie = await getMovie(parseInt(id));
    if (movie) {
      return NextResponse.json({ ...movie, posterUrl: posterUrl(movie.posterPath) });
    }
    const detail = await fetchMovieDetail(parseInt(id));
    return NextResponse.json({
      id: detail.id,
      title: detail.title,
      overview: detail.overview,
      posterPath: detail.poster_path ?? "",
      posterUrl: posterUrl(detail.poster_path),
      releaseDate: detail.release_date,
      voteAverage: detail.vote_average,
      runtime: detail.runtime,
      genres: detail.genres,
      cast: [
        ...detail.credits.crew.filter((c: any) => c.job === "Director").map((c: any) => ({ id: c.id, name: c.name, role: "director" })),
        ...detail.credits.cast.slice(0, 10).map((c: any) => ({ id: c.id, name: c.name, role: "actor" })),
      ],
      ratings: [],
    });
  }

  const keywordId = searchParams.get("keyword");

  if (keywordId) {
    const movies = await getMovies({ keywordId: parseInt(keywordId), limit: 50, excludeSkipped: true });
    return NextResponse.json(movies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
  }

  if (search) {
    const local = await getMovies({ search, mediaType: type, limit: 20, excludeSkipped: true });
    if (local.length > 0) {
      return NextResponse.json(local.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await searchMovies(search);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  if (genre) {
    const movies = await getMovies({ genreId: parseInt(genre), mediaType: type, limit: 50, excludeSkipped: true });
    return NextResponse.json(movies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
  }

  if (trending) {
    const local = await getMovies({ mediaType: type, limit: 50, excludeSkipped: true });
    if (local.length > 20) {
      return NextResponse.json(local.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await fetchTrending(page);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  if (popular) {
    const dbMovies = await getMovies({ mediaType: type, orderBy: "voteAverage", limit: 50, excludeSkipped: true });
    if (dbMovies.length > 0) {
      return NextResponse.json(dbMovies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await fetchPopular(page);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  const all = await getMovies({ mediaType: type, orderBy: "voteAverage", limit: 50, excludeSkipped: true });
  return NextResponse.json(all.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
}

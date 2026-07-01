import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchTrending, fetchPopular, searchMovies, fetchMovieDetail, posterUrl } from "@/lib/tmdb";

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
    const movie = await prisma.movie.findUnique({
      where: { id: parseInt(id) },
      include: { genres: true, keywords: true, cast: { orderBy: { order: "asc" } }, ratings: true },
    });
    if (movie) {
      return NextResponse.json({ ...movie, posterUrl: posterUrl(movie.posterPath) });
    }
    const detail = await fetchMovieDetail(parseInt(id));
    const { genres, credits, runtime, ...rest } = detail;
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
  const excludeSkipped = { NOT: { skips: { some: {} } } };

  if (keywordId) {
    const movies = await prisma.movie.findMany({
      where: { keywords: { some: { id: parseInt(keywordId) } }, ...excludeSkipped },
      include: { genres: true, ratings: true },
      take: 50,
    });
    return NextResponse.json(movies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
  }

  if (search) {
    const local = await prisma.movie.findMany({
      where: { title: { contains: search }, ...excludeSkipped },
      include: { genres: true, ratings: true },
      take: 20,
    });
    if (local.length > 0) {
      return NextResponse.json(local.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await searchMovies(search);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  if (genre) {
    const movies = await prisma.movie.findMany({
      where: { genres: { some: { id: parseInt(genre) } }, mediaType: type, ...excludeSkipped },
      include: { genres: true, ratings: true },
      take: 50,
    });
    return NextResponse.json(movies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
  }

  if (trending) {
    const local = await prisma.movie.findMany({ where: excludeSkipped, include: { genres: true, ratings: true }, take: 50 });
    if (local.length > 20) {
      return NextResponse.json(local.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await fetchTrending(page);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  if (popular) {
    const dbMovies = await prisma.movie.findMany({
      where: { mediaType: type, ...excludeSkipped },
      include: { genres: true, ratings: true },
      orderBy: { voteAverage: "desc" },
      take: 50,
    });
    if (dbMovies.length > 0) {
      return NextResponse.json(dbMovies.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
    }
    const tmdb = await fetchPopular(page);
    return NextResponse.json(tmdb.results.map((m) => ({ id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path ?? "", posterUrl: posterUrl(m.poster_path), releaseDate: m.release_date, voteAverage: m.vote_average, genres: [], ratings: [] })));
  }

  const all = await prisma.movie.findMany({
    where: { mediaType: type, ...excludeSkipped },
    include: { genres: true, ratings: true },
    orderBy: { voteAverage: "desc" },
    take: 50,
  });
  return NextResponse.json(all.map((m) => ({ ...m, posterUrl: posterUrl(m.posterPath) })));
}

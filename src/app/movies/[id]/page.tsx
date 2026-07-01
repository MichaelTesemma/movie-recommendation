"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { ChevronLeft, Star, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieDetail {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  posterPath: string;
  releaseDate?: string;
  voteAverage: number;
  runtime: number | null;
  mediaType?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres: { id: number; name: string }[];
  cast: { id: number; name: string; role: string }[];
  ratings: { value: number }[];
}

const LABELS = ["Awful", "Meh", "Good", "Great", "Perfect"];

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [similar, setSimilar] = useState<any[]>([]);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/movies?id=${params.id}`)
      .then((r) => r.json())
      .then(async (data) => {
        setMovie(data);
        const existing = data.ratings?.find((r: any) => r.value);
        if (existing) setUserRating(existing.value);

        const mediaType = data.mediaType ?? "movie";
        const recsRes = await fetch(`/api/recommendations?n=12&type=${mediaType}`);
        const recsData = await recsRes.json();
        setSimilar(
          recsData.recommendations?.filter((r: any) => r.movieId !== data.id).slice(0, 6) ?? []
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleRate = async (value: number) => {
    if (!movie) return;
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: movie.id, value }),
    });
    setUserRating(value);
  };

  const handleSkip = async () => {
    if (!movie) return;
    await fetch("/api/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: movie.id }),
    });
    setUserRating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <p className="text-muted mb-4">Movie not found</p>
        <button onClick={() => router.push("/")} className="text-sm text-accent hover:underline">
          Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-72 shrink-0">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} className="w-full rounded-xl" />
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl bg-surface flex items-center justify-center text-muted">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{movie.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted mb-4">
            {movie.releaseDate && <span>{new Date(movie.releaseDate).getFullYear()}</span>}
            {movie.mediaType === "tv" && movie.numberOfSeasons && <span>{movie.numberOfSeasons} seasons</span>}
            {movie.runtime && <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
            <span className="flex items-center gap-1">
              <Star size={14} className="text-amber" fill="currentColor" />
              {movie.voteAverage.toFixed(1)}
            </span>
          </div>

          <div className="flex gap-1.5 mb-6 flex-wrap">
            {movie.genres.map((g) => (
              <span key={g.id} className="px-2.5 py-1 rounded-full bg-surface text-xs text-muted border border-border">
                {g.name}
              </span>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-muted mb-6">{movie.overview}</p>

          <div className="mb-8">
            <p className="text-xs text-muted mb-3">Your rating</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 -m-1 transition-transform hover:scale-110 active:scale-90"
                >
                  <Star
                    size={26}
                    className={cn(
                      "transition-colors",
                      star <= (hoveredStar || userRating || 0) ? "text-amber fill-amber" : "text-muted hover:text-amber/50"
                    )}
                  />
                </button>
              ))}
              <span className="text-xs text-muted ml-2 min-w-[3rem]">
                {hoveredStar > 0 ? LABELS[hoveredStar - 1] : userRating ? LABELS[userRating - 1] : ""}
              </span>
            </div>
            {userRating && (
              <p className="text-[11px] text-muted mt-1.5">Rated {userRating}/5 — click a star to change</p>
            )}
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground mt-3 transition-colors"
            >
              <EyeOff size={12} /> Haven&apos;t Seen
            </button>
          </div>

          {movie.cast && movie.cast.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Cast & Crew</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {movie.cast.slice(0, 8).map((c) => (
                  <div key={c.id} className="shrink-0 text-center">
                    <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center text-xs text-muted mx-auto mb-1">
                      {c.name.charAt(0)}
                    </div>
                    <p className="text-[10px] text-muted max-w-14 truncate">{c.name}</p>
                    <p className="text-[9px] text-muted/50">{c.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold mb-4">Similar Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {similar.map((r: any) => (
              <MovieCard
                key={r.movieId}
                id={r.movieId}
                title={r.title}
                posterUrl={r.posterUrl}
                year={r.year}
                matchScore={r.matchScore}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

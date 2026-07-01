"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star, EyeOff, ChevronRight, Film, Tv, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Movie {
  id: number;
  title: string;
  posterUrl: string | null;
  posterPath: string;
  releaseDate?: string;
  genres: { id: number; name: string }[];
  mediaType?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

const LABELS = ["Awful", "Meh", "Good", "Great", "Perfect"];

function genreSimilarity(a: { id: number }[], b: { id: number }[]): number {
  if (!a.length || !b.length) return 0;
  const idsA = new Set(a.map((g) => g.id));
  const intersection = b.filter((g) => idsA.has(g.id)).length;
  const union = new Set([...idsA, ...b.map((g) => g.id)]).size;
  return intersection / union;
}

function reorderQueue(queue: Movie[], ratedMovie: Movie, stars: number): Movie[] {
  if (stars === 3) return queue;
  const liked = stars >= 4;
  return [...queue].sort((a, b) => {
    const simA = genreSimilarity(a.genres, ratedMovie.genres);
    const simB = genreSimilarity(b.genres, ratedMovie.genres);
    return liked ? simB - simA : simA - simB;
  });
}

export default function SwipePage() {
  const router = useRouter();
  const [queue, setQueue] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [type, setType] = useState<"movie" | "tv">("movie");
  const lastRatedRef = useRef<{ movie: Movie; stars: number } | null>(null);
  const pageRef = useRef(1);
  const shownAllRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    pageRef.current = 1;
    shownAllRef.current = false;
    try {
      const [ratingsRes, recsRes] = await Promise.all([
        fetch("/api/ratings").then((r) => r.json()),
        fetch(`/api/recommendations?n=50&type=${type}`).then((r) => r.json()).catch(() => null),
      ]);
      setRatingsCount(ratingsRes.length);
      const ratedIds = new Set(ratingsRes.map((r: any) => r.movieId));
      const recs = recsRes?.recommendations ?? [];

      if (recs.length > 0) {
        const items = recs
          .filter((r: any) => !ratedIds.has(r.movieId))
          .map((r: any) => ({
            id: r.movieId,
            title: r.title,
            posterUrl: r.posterUrl,
            posterPath: "",
            releaseDate: String(r.year),
            genres: r.genres ?? [],
            mediaType: type,
          }))
          .slice(0, 30);
        if (items.length === 0) shownAllRef.current = true;
        setQueue(items);
      } else {
        const moviesRes = await fetch(`/api/movies?popular=1&type=${type}`).then((r) => r.json());
        const unrated = moviesRes.filter((m: any) => !ratedIds.has(m.id));
        if (unrated.length === 0) shownAllRef.current = true;
        setQueue(unrated.slice(0, 30));
      }
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const ratingsRes = await fetch("/api/ratings").then((r) => r.json());
      const ratedIds = new Set(ratingsRes.map((r: any) => r.movieId));
      const alreadyShown = new Set(queue.map((m) => m.id));

      const recsRes = await fetch(`/api/recommendations?n=50&shuffle=1&type=${type}`).then((r) => r.json()).catch(() => null);
      const recs = recsRes?.recommendations ?? [];
      if (recs.length > 0) {
        const items = recs
          .filter((r: any) => !ratedIds.has(r.movieId) && !alreadyShown.has(r.movieId))
          .map((r: any) => ({
            id: r.movieId,
            title: r.title,
            posterUrl: r.posterUrl,
            posterPath: "",
            releaseDate: String(r.year),
            genres: r.genres ?? [],
            mediaType: type,
          }))
          .slice(0, 30);
        if (items.length === 0) shownAllRef.current = true;
        setQueue((prev) => [...prev, ...items]);
      } else {
        const moviesRes = await fetch(`/api/movies?popular=1&page=${++pageRef.current}&type=${type}`).then((r) => r.json());
        const unrated = moviesRes.filter((m: any) => !ratedIds.has(m.id) && !alreadyShown.has(m.id));
        if (unrated.length === 0) shownAllRef.current = true;
        setQueue((prev) => [...prev, ...unrated.slice(0, 30)]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [type, queue]);

  const advance = (ratedMovie: Movie | null, stars: number | null) => {
    setCurrentIndex((i) => {
      const nextIdx = i + 1;
      if (ratedMovie && stars !== null && stars !== 3) {
        setQueue((q) => {
          const rest = q.slice(nextIdx);
          const remaining = q.slice(0, nextIdx);
          lastRatedRef.current = { movie: ratedMovie, stars };
          return [...remaining, ...reorderQueue(rest, ratedMovie, stars)];
        });
      }
      return nextIdx;
    });
  };

  const handleRate = async (movieId: number, stars: number) => {
    const movie = queue[currentIndex];
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, value: stars }),
    });
    setRatingsCount((c) => c + 1);
    advance(movie, stars);
  };

  const handleSkip = async () => {
    const movie = queue[currentIndex];
    await fetch("/api/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: movie.id }),
    });
    advance(null, null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentIndex >= queue.length) {
    const done = shownAllRef.current || loadingMore;
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-6">
          <span className="text-3xl">⭐</span>
        </div>
        <h2 className="text-xl font-bold mb-2">
          {done ? "You've seen everything!" : "Round complete!"}
        </h2>
        <p className="text-muted mb-6 max-w-sm">
          {done
            ? "No more unrated titles available right now."
            : ratingsCount >= 5
              ? "Your recommendations are ready."
              : "Rate more to improve recommendations."}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          {!done && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingMore ? "animate-spin" : ""} />
              Load More
            </button>
          )}
          {ratingsCount >= 5 && (
            <button
              onClick={() => router.push(`/recommendations?type=${type}`)}
              className="px-5 py-2.5 bg-accent/10 text-accent rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              See Recommendations
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            Browse
          </button>
        </div>
      </div>
    );
  }

  const movie = queue[currentIndex];
  const isLast = currentIndex >= 29;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      <div className="flex items-center gap-2 mb-6 bg-surface rounded-lg p-1 border border-border">
        <button
          onClick={() => setType("movie")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            type === "movie" ? "bg-accent text-white" : "text-muted hover:text-foreground"
          )}
        >
          <Film size={14} />
          Movies
        </button>
        <button
          onClick={() => setType("tv")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            type === "tv" ? "bg-accent text-white" : "text-muted hover:text-foreground"
          )}
        >
          <Tv size={14} />
          TV Shows
        </button>
      </div>

      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Rate {type === "movie" ? "movies" : "shows"} you&apos;ve seen</span>
          <span className="text-muted font-medium">{ratingsCount} rated</span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${Math.min((currentIndex / 30) * 100, 100)}%` }}
          />
        </div>
        {ratingsCount < 5 && (
          <p className="text-[11px] text-muted mt-1.5">Rate {5 - ratingsCount} more to unlock recommendations</p>
        )}
      </div>

      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-surface border border-border">
        <div className="aspect-[2/3] relative bg-background">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">{movie.title}</div>
          )}
        </div>

        <div className="p-5">
          <h2 className="text-lg font-bold">{movie.title}</h2>
          <p className="text-sm text-muted">
            {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ""}
            {movie.mediaType === "tv" && movie.numberOfSeasons && ` · ${movie.numberOfSeasons} seasons`}
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {movie.genres.slice(0, 4).map((g) => (
              <span key={g.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted">
                {g.name.replace(" (TV)", "")}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-muted mb-3">Rate this {type === "movie" ? "movie" : "show"}</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(movie.id, star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 -m-1 transition-transform hover:scale-110 active:scale-90"
              >
                <Star
                  size={28}
                  className={
                    star <= hoveredStar
                      ? "text-amber fill-amber"
                      : "text-muted hover:text-amber/50"
                  }
                />
              </button>
            ))}
            <span className="text-xs text-muted ml-2">
              {hoveredStar > 0 ? LABELS[hoveredStar - 1] : ""}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleSkip}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <EyeOff size={14} />
            Haven&apos;t Seen
          </button>
          <button
            onClick={() => router.push(`/movies/${movie.id}`)}
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-border text-xs text-muted hover:text-foreground hover:bg-surface-hover transition-colors ml-auto"
          >
            Details
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
